// src/pages/teacher/TeacherLiveSessions.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { extractArray } from '../../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Button, Avatar,
  Chip, Box, LinearProgress, Paper, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  IconButton, Badge
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  PlayCircle as PlayIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  Class as ClassIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Stop as StopIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

export default function TeacherLiveSessions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    subject: '',
    start_time: '',
    max_participants: 50
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [sessionsRes, subjectsRes, classesRes] = await Promise.allSettled([
        api.get('/live/sessions/'),
        api.get('/classes/subjects/'),
        api.get('/classes/classes/')
      ]);

      // CORRECTION: Utiliser extractArray pour s'assurer d'avoir un tableau
      if (sessionsRes.status === 'fulfilled') {
        const sessions = extractArray(sessionsRes.value);
        const now = new Date();
        
        console.log("📊 Sessions reçues:", {
          raw: sessionsRes.value?.data,
          extracted: sessions,
          count: sessions.length,
          isArray: Array.isArray(sessions)
        });
        
        setLiveSessions(sessions.filter(s => s.status === 'live'));
        setUpcomingSessions(sessions.filter(s => s.status === 'scheduled'));
        setPastSessions(sessions.filter(s => s.status === 'ended'));
      } else {
        console.warn('Sessions non chargées:', sessionsRes.reason);
        setLiveSessions([]);
        setUpcomingSessions([]);
        setPastSessions([]);
      }

      // CORRECTION: Utiliser extractArray pour les matières
      if (subjectsRes.status === 'fulfilled') {
        const subjects = extractArray(subjectsRes.value);
        console.log("📚 Matières reçues:", subjects.length);
        setMySubjects(subjects);
      } else {
        console.warn('Matières non chargées:', subjectsRes.reason);
        setMySubjects([]);
      }

      // CORRECTION: Utiliser extractArray pour les classes
      if (classesRes.status === 'fulfilled') {
        const classes = extractArray(classesRes.value);
        console.log("🏫 Classes reçues:", classes.length);
        setMyClasses(classes);
      } else {
        console.warn('Classes non chargées:', classesRes.reason);
        setMyClasses([]);
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const createAndStartSession = async () => {
    try {
      if (!newSession.subject) {
        toast.error('Veuillez sélectionner une matière');
        return;
      }

      const sessionData = {
        title: newSession.title || `Session Live - ${new Date().toLocaleDateString()}`,
        description: newSession.description,
        subject: newSession.subject,
        start_time: new Date().toISOString(),
        max_participants: parseInt(newSession.max_participants)
      };

      console.log("📤 Création session:", sessionData);
      
      const res = await api.post('/live/sessions/', sessionData);
      
      if (res.data && res.data.id) {
        // Démarrer la session
        await api.post(`/live/sessions/${res.data.id}/start/`);
        
        toast.success('Session démarrée avec succès!');
        setOpenCreateDialog(false);
        
        // Recharger les données
        loadAllData();
        
        // Rediriger vers la session
        if (res.data.meeting_id) {
          navigate(`/live-session-teams/${res.data.meeting_id}`);
        } else {
          // Si pas de meeting_id, rediriger vers la liste
          navigate('/teacher/live-sessions');
        }
      } else {
        throw new Error('Réponse API invalide');
      }
    } catch (error) {
      console.error('Erreur création session:', error);
      toast.error(error.response?.data?.error || 
                 error.response?.data?.detail || 
                 'Erreur lors de la création');
    }
  };

  const startExistingSession = async (sessionId) => {
    try {
      await api.post(`/live/sessions/${sessionId}/start/`);
      const res = await api.get(`/live/sessions/${sessionId}/`);
      
      toast.success('Session démarrée!');
      if (res.data.meeting_id) {
        navigate(`/live-session-teams/${res.data.meeting_id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du démarrage');
    }
  };

  const endSession = async (sessionId) => {
    if (!window.confirm('Terminer cette session ?')) return;
    
    try {
      await api.post(`/live/sessions/${sessionId}/end/`);
      toast.success('Session terminée');
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la fin');
    }
  };

  const joinSession = (meetingId) => {
    navigate(`/live-session-teams/${meetingId}`);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Maintenant';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Maintenant';
    }
  };

  const getSubjectName = (subjectId) => {
    const subject = mySubjects.find(s => s.id == subjectId);
    return subject ? subject.name : 'Matière inconnue';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary">
          Chargement des sessions...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#e53935' }}>
              🎥 Sessions Live
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Créez et gérez vos sessions de cours en direct
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadAllData}
            >
              Actualiser
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{
                bgcolor: '#e53935',
                '&:hover': { bgcolor: '#c62828' }
              }}
            >
              Nouvelle Session
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e53935', color: 'white' }}>
              <Typography variant="h4">{liveSessions.length}</Typography>
              <Typography variant="body2">En direct</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#1976d2', color: 'white' }}>
              <Typography variant="h4">{upcomingSessions.length}</Typography>
              <Typography variant="body2">Programmées</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2e7d32', color: 'white' }}>
              <Typography variant="h4">{pastSessions.length}</Typography>
              <Typography variant="body2">Terminées</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#9c27b0', color: 'white' }}>
              <Typography variant="h4">{mySubjects.length}</Typography>
              <Typography variant="body2">Matières</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Sessions en direct */}
      {liveSessions.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#e53935', animation: 'pulse 2s infinite' }} />
              <Typography variant="h5" fontWeight={600}>
                Sessions en Direct
              </Typography>
              <Chip label={liveSessions.length} color="error" />
            </Box>

            <Grid container spacing={2}>
              {liveSessions.map(session => (
                <Grid item xs={12} md={6} key={session.id}>
                  <Paper sx={{ p: 3, borderLeft: '4px solid #e53935', position: 'relative' }}>
                    <Typography variant="h6" gutterBottom>
                      {session.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📚 {getSubjectName(session.subject)} • 👨‍🏫 Vous
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip
                        icon={<PeopleIcon />}
                        label={`${session.participants_count || 0} participants`}
                        size="small"
                      />
                      <Chip
                        label="EN DIRECT"
                        color="error"
                        size="small"
                      />
                    </Box>

                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained"
                        startIcon={<PlayIcon />}
                        fullWidth
                        onClick={() => joinSession(session.meeting_id)}
                        sx={{ bgcolor: '#e53935' }}
                      >
                        Rejoindre
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<StopIcon />}
                        onClick={() => endSession(session.id)}
                        color="error"
                      >
                        Terminer
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Bouton principal si pas de sessions */}
      {liveSessions.length === 0 && (
        <Card sx={{ mb: 4, textAlign: 'center', py: 6 }}>
          <CardContent>
            <VideoCallIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Aucune session en direct
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Lancez une nouvelle session pour commencer un cours en direct avec vos étudiants
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<VideoCallIcon />}
              onClick={() => navigate('/teacher/start-live')}
              sx={{
                bgcolor: '#e53935',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: '#c62828' }
              }}
            >
              Démarrer une Session Live
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sessions programmées */}
      {upcomingSessions.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <ScheduleIcon sx={{ color: '#1976d2', fontSize: 32 }} />
              <Typography variant="h5" fontWeight={600}>
                Sessions Programmées
              </Typography>
              <Chip label={upcomingSessions.length} color="primary" />
            </Box>

            <Stack spacing={2}>
              {upcomingSessions.map(session => (
                <Paper key={session.id} sx={{ p: 2 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {session.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📚 {getSubjectName(session.subject)} • 🕒 {formatTime(session.start_time)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box display="flex" gap={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => startExistingSession(session.id)}
                        >
                          Démarrer
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                        >
                          Annuler
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Dialog de création */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Nouvelle Session Live</Typography>
            <IconButton onClick={() => setOpenCreateDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Titre de la session *"
              value={newSession.title}
              onChange={(e) => setNewSession({...newSession, title: e.target.value})}
              fullWidth
              required
              placeholder="Ex: Cours d'algorithme avancé"
            />
            
            <TextField
              label="Description"
              value={newSession.description}
              onChange={(e) => setNewSession({...newSession, description: e.target.value})}
              multiline
              rows={2}
              fullWidth
              placeholder="Description optionnelle"
            />
            
            <TextField
              select
              label="Matière *"
              value={newSession.subject}
              onChange={(e) => setNewSession({...newSession, subject: e.target.value})}
              fullWidth
              required
            >
              <MenuItem value="">Sélectionnez une matière</MenuItem>
              {mySubjects.map(subject => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name} {subject.class_name && `(${subject.class_name})`}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              label="Participants maximum"
              type="number"
              value={newSession.max_participants}
              onChange={(e) => setNewSession({...newSession, max_participants: e.target.value})}
              fullWidth
              inputProps={{ min: 1, max: 100 }}
            />
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={createAndStartSession}
            disabled={!newSession.subject}
            sx={{ bgcolor: '#e53935' }}
          >
            Créer et démarrer
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Container>
  );
}