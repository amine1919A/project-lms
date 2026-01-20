// src/pages/teacher/StartLiveSession.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Button, Box,
  RadioGroup, FormControlLabel, Radio, TextField, Paper,
  Select, MenuItem, FormControl, InputLabel, Chip, LinearProgress,
  Autocomplete
} from '@mui/material';
import {
  VideoCall, Class, People, Public, RadioButtonChecked,
  Warning, Info
} from '@mui/icons-material';

export default function StartLiveSession() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [mySubjects, setMySubjects] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [selectedType, setSelectedType] = useState('general'); // 'general' ou 'class'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    class_id: '',
    max_participants: 50
  });

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    try {
      setDataLoading(true);
      
      // Charger les matières de l'enseignant connecté
      const subjectsRes = await api.get('/classes/subjects/');
      let subjects = subjectsRes.data?.results || subjectsRes.data || [];
      
      // Filtrer pour n'avoir que les matières de l'enseignant courant
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const teacherSubjects = subjects.filter(subject => 
        subject.teacher === currentUser.id || 
        subject.teacher_details?.id === currentUser.id
      );
      
      console.log('📚 Matières enseignantes:', teacherSubjects);
      setMySubjects(teacherSubjects);

      // Charger les classes
      const classesRes = await api.get('/classes/classes/');
      let classes = classesRes.data?.results || classesRes.data || [];
      
      // Filtrer les classes où l'enseignant enseigne (basé sur ses matières)
      const teacherClassIds = [...new Set(teacherSubjects.map(subj => subj.class_assigned))];
      const teacherClasses = classes.filter(cls => 
        teacherClassIds.includes(cls.id)
      );
      
      console.log('🏫 Classes enseignantes:', teacherClasses);
      setMyClasses(teacherClasses);

      // Si l'enseignant n'a qu'une seule classe, pré-sélectionner
      if (teacherClasses.length === 1) {
        setFormData(prev => ({
          ...prev,
          class_id: teacherClasses[0].id
        }));
      }

    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setDataLoading(false);
    }
  };

  const startLiveSession = async () => {
    try {
      setLoading(true);

      // Validation des données
      let subjectId = formData.subject;
      let classId = formData.class_id;

      if (!subjectId) {
        toast.error('Veuillez sélectionner une matière');
        return;
      }

      // Vérifier si la matière appartient bien à l'enseignant
      const selectedSubject = mySubjects.find(s => s.id == subjectId);
      if (!selectedSubject) {
        toast.error('Matière non trouvée');
        return;
      }

      // Si mode par classe, vérifier que la classe correspond
      if (selectedType === 'class') {
        if (!classId) {
          toast.error('Veuillez sélectionner une classe');
          return;
        }
        
        // Vérifier que la matière est bien enseignée dans cette classe
        if (selectedSubject.class_assigned != classId) {
          toast.error('Cette matière n\'est pas enseignée dans la classe sélectionnée');
          return;
        }
      }

      // Préparer les données pour l'API
      const requestData = {
        title: formData.title || `Session Live - ${selectedSubject.name}`,
        description: formData.description,
        subject: subjectId,
        max_participants: parseInt(formData.max_participants) || 50,
        start_time: new Date().toISOString()
      };

      console.log('📤 Envoi création session:', requestData);

      // 1. Créer la session
      const createRes = await api.post('/live/sessions/', requestData);
      
      if (!createRes.data || (!createRes.data.id && !createRes.data.data?.id)) {
        console.error('❌ Réponse API invalide:', createRes);
        toast.error('Erreur lors de la création de la session');
        return;
      }

      const sessionId = createRes.data.id || createRes.data.data?.id;
      const meetingId = createRes.data.meeting_id || createRes.data.data?.meeting_id;

      console.log('✅ Session créée:', { sessionId, meetingId });

      // 2. Démarrer immédiatement la session
      await api.post(`/live/sessions/${sessionId}/start/`);
      
      console.log('✅ Session démarrée');
      toast.success('🎥 Session live démarrée avec succès!');
      
      // 3. Rediriger vers la page de session
      if (meetingId) {
        navigate(`/live-session-teams/${meetingId}`);
      } else {
        // Fallback: récupérer la session pour obtenir le meeting_id
        const sessionRes = await api.get(`/live/sessions/${sessionId}/`);
        if (sessionRes.data.meeting_id) {
          navigate(`/live-session-teams/${sessionRes.data.meeting_id}`);
        } else {
          toast.error('Erreur: ID de réunion non trouvé');
        }
      }

    } catch (error) {
      console.error('❌ Erreur démarrage session:', error);
      
      // Affichage d'erreur détaillé
      if (error.response) {
        const errorData = error.response.data;
        console.error('Détails erreur:', errorData);
        
        if (errorData.subject) {
          toast.error(`Erreur matière: ${Array.isArray(errorData.subject) ? errorData.subject.join(', ') : errorData.subject}`);
        } else if (errorData.detail) {
          toast.error(errorData.detail);
        } else if (errorData.error) {
          toast.error(errorData.error);
        } else if (typeof errorData === 'object') {
          const errors = Object.values(errorData).flat();
          toast.error(errors.join(', '));
        } else {
          toast.error('Erreur lors de la création de la session');
        }
      } else if (error.request) {
        toast.error('Erreur réseau: impossible de contacter le serveur');
      } else {
        toast.error('Erreur: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getParticipantsCount = () => {
    if (selectedType === 'general') {
      // Tous les étudiants de toutes les classes où l'enseignant enseigne
      return myClasses.reduce((sum, cls) => sum + (cls.student_count || cls.students_count || 0), 0);
    } else if (formData.class_id) {
      // Étudiants de la classe spécifique
      const selectedClass = myClasses.find(c => c.id == formData.class_id);
      return selectedClass?.student_count || selectedClass?.students_count || 0;
    }
    return 0;
  };

  const getFilteredSubjects = () => {
    if (selectedType === 'general') {
      // Toutes les matières de l'enseignant
      return mySubjects;
    } else if (formData.class_id) {
      // Seulement les matières de la classe sélectionnée
      return mySubjects.filter(subject => subject.class_assigned == formData.class_id);
    }
    return mySubjects;
  };

  const handleClassChange = (classId) => {
    setFormData(prev => ({
      ...prev,
      class_id: classId,
      subject: '' // Réinitialiser la matière
    }));
  };

  if (dataLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <LinearProgress />
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Chargement de vos données d'enseignement...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom align="center" sx={{ color: '#e53935' }}>
          🎥 Démarrer une Session Live
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Créez une session en direct avec vos étudiants
        </Typography>

        {/* Avertissement si pas de données */}
        {mySubjects.length === 0 && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: 'warning.light', 
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Warning sx={{ color: 'warning.dark' }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Aucune matière assignée
              </Typography>
              <Typography variant="caption">
                Contactez l'administration pour vous assigner à des matières.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Type de session */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            <RadioButtonChecked sx={{ mr: 1, color: '#e53935' }} />
            Type de session
          </Typography>
          <RadioGroup
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              if (e.target.value === 'general') {
                setFormData(prev => ({
                  ...prev,
                  class_id: '',
                  subject: ''
                }));
              }
            }}
            sx={{ flexDirection: 'row', gap: 2 }}
          >
            <FormControlLabel
              value="general"
              control={<Radio />}
              label={
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    minWidth: 200,
                    borderColor: selectedType === 'general' ? '#e53935' : 'divider',
                    bgcolor: selectedType === 'general' ? 'rgba(229, 57, 53, 0.05)' : 'transparent'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Public sx={{ color: selectedType === 'general' ? '#e53935' : 'inherit' }} />
                    <Box>
                      <Typography fontWeight={600}>Session Générale</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tous vos étudiants
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              }
            />
            <FormControlLabel
              value="class"
              control={<Radio />}
              label={
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    minWidth: 200,
                    borderColor: selectedType === 'class' ? '#1976d2' : 'divider',
                    bgcolor: selectedType === 'class' ? 'rgba(25, 118, 210, 0.05)' : 'transparent'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Class sx={{ color: selectedType === 'class' ? '#1976d2' : 'inherit' }} />
                    <Box>
                      <Typography fontWeight={600}>Session par Classe</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Classe spécifique
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              }
            />
          </RadioGroup>
        </Box>

        {/* Formulaire */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Titre de la session *"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              fullWidth
              required
              placeholder="Ex: Cours d'algorithmique avancée"
              helperText="Donnez un titre clair à votre session"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              multiline
              rows={2}
              fullWidth
              placeholder="Objectifs de la session, points abordés..."
              helperText="Facultatif, mais recommandé"
            />
          </Grid>

          {/* Sélection de la classe (si mode classe) */}
          {selectedType === 'class' && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Classe *</InputLabel>
                <Select
                  value={formData.class_id}
                  onChange={(e) => handleClassChange(e.target.value)}
                  label="Classe *"
                  disabled={myClasses.length === 0}
                >
                  <MenuItem value="">Sélectionnez une classe</MenuItem>
                  {myClasses.map(cls => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.student_count || cls.students_count || 0} étudiants)
                    </MenuItem>
                  ))}
                </Select>
                {myClasses.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 1 }}>
                    Aucune classe assignée
                  </Typography>
                )}
              </FormControl>
            </Grid>
          )}

          {/* Sélection de la matière */}
          <Grid item xs={12} md={selectedType === 'class' ? 6 : 12}>
            <FormControl fullWidth required>
              <InputLabel>Matière *</InputLabel>
              <Select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                label="Matière *"
                disabled={getFilteredSubjects().length === 0}
              >
                <MenuItem value="">Sélectionnez une matière</MenuItem>
                {getFilteredSubjects().map(subject => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.name} 
                    {subject.class_name && ` (${subject.class_name})`}
                  </MenuItem>
                ))}
              </Select>
              {getFilteredSubjects().length === 0 && (
                <Typography variant="caption" color="error" sx={{ ml: 2, mt: 1 }}>
                  {selectedType === 'class' && formData.class_id 
                    ? 'Aucune matière pour cette classe'
                    : 'Aucune matière disponible'}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Participants maximum"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({...formData, max_participants: e.target.value})}
              fullWidth
              InputProps={{ inputProps: { min: 1, max: 100 } }}
              helperText={`${getParticipantsCount()} étudiants éligibles`}
            />
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <Box display="flex" alignItems="center" gap={2}>
                <People sx={{ color: '#e53935', fontSize: 40 }} />
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Participants éligibles
                  </Typography>
                  <Typography variant="body2">
                    {selectedType === 'general' 
                      ? `Tous vos étudiants (${getParticipantsCount()} étudiants sur ${myClasses.length} classes)`
                      : formData.class_id 
                        ? `Étudiants de ${myClasses.find(c => c.id == formData.class_id)?.name || 'cette classe'} (${getParticipantsCount()} étudiants)`
                        : 'Veuillez sélectionner une classe'
                    }
                  </Typography>
                </Box>
                <Chip 
                  label={`${getParticipantsCount()} étudiants`}
                  color="primary"
                  sx={{ fontWeight: 600, fontSize: '1rem' }}
                />
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Informations de débogage (développement seulement) */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#f0f0f0', 
            borderRadius: 2, 
            fontSize: '0.8rem',
            border: '1px dashed #ccc'
          }}>
            <Typography variant="caption" fontWeight={600}>Debug Info:</Typography>
            <Box display="flex" gap={2} mt={1}>
              <div>Matières: {mySubjects.length}</div>
              <div>Classes: {myClasses.length}</div>
              <div>Type: {selectedType}</div>
              <div>Sujet: {formData.subject || 'Aucun'}</div>
              <div>Classe: {formData.class_id || 'Toutes'}</div>
            </Box>
          </Box>
        )}

        {/* Actions */}
        <Box display="flex" gap={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/teacher/dashboard')}
            sx={{ px: 4, py: 1.5 }}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            startIcon={<VideoCall />}
            onClick={startLiveSession}
            disabled={
              loading || 
              !formData.title || 
              !formData.subject || 
              (selectedType === 'class' && !formData.class_id)
            }
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: '#e53935',
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': { bgcolor: '#c62828' },
              '&:disabled': { bgcolor: '#ffcdd2' }
            }}
          >
            {loading ? 'Démarrage...' : 'Démarrer la Session Live'}
          </Button>
        </Box>

        {/* Informations */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Box display="flex" alignItems="flex-start" gap={1}>
            <Info sx={{ color: 'info.dark', mt: 0.5 }} />
            <Box>
              <Typography variant="caption" fontWeight={600}>
                Informations importantes
              </Typography>
              <Typography variant="caption" display="block">
                • La session sera immédiatement accessible aux étudiants de la classe/matière sélectionnée
              </Typography>
              <Typography variant="caption" display="block">
                • Les étudiants pourront rejoindre la session depuis leur tableau de bord
              </Typography>
              <Typography variant="caption" display="block">
                • Vous serez redirigé vers la salle de vidéoconférence après le démarrage
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}