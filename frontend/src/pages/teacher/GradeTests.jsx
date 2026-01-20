import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import {
  Container, Card, CardContent, Typography, Button, Box,
  Grid, Chip, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Alert, TextField,
  CircularProgress, Paper, InputAdornment, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  ArrowBack, Search, Visibility, Person, 
  Email, AccessTime, CheckCircle, Refresh,
  Warning, Description, Grading
} from '@mui/icons-material';

export default function GradeTests() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    if (testId) {
      loadTestSubmissions();
    } else {
      loadTeacherTests();
    }
  }, [testId]);

  // FONCTION AMÉLIORÉE - Charge les soumissions avec débogage détaillé
  const loadTestSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📡 Chargement soumissions pour test ${testId}`);
      
      // Appel API avec gestion des erreurs
      const response = await api.get(`/tests/quizzes/${testId}/submissions-all/`);
      
      console.log("📦 Réponse API:", response.data);
      
      if (response.data?.success) {
        console.log("✅ Données reçues:", response.data);
        
        setTestData(response.data.quiz);
        setStats(response.data.stats);
        
        // Vérification des données
        if (response.data.submissions && Array.isArray(response.data.submissions)) {
          const allSubmissions = response.data.submissions;
          
          // Afficher les données brutes pour le débogage
          console.log("📊 Données brutes:", allSubmissions);
          
          // Filtrer les soumissions avec réponses ou marquées comme soumises
          const visibleSubmissions = allSubmissions.filter(sub => 
            sub.answers_count > 0 || sub.is_submitted
          );
          
          console.log(`📊 ${allSubmissions.length} soumissions totales, ${visibleSubmissions.length} avec réponses`);
          
          setSubmissions(visibleSubmissions);
          
          if (visibleSubmissions.length === 0) {
            toast.info("Aucune copie à corriger pour ce test");
          } else {
            toast.success(`${visibleSubmissions.length} copie(s) à corriger`);
          }
        } else {
          console.warn("⚠️ Données invalides reçues");
          setSubmissions([]);
          toast.warning("Structure de données inattendue");
        }
      } else {
        throw new Error(response.data?.error || "Erreur de chargement");
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      setError('Impossible de charger les soumissions: ' + (error.response?.data?.error || error.message));
      toast.error('Erreur: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tests/teacher/my-quizzes/');
      
      let testsData = [];
      if (response.data?.success && response.data.results) {
        testsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        testsData = response.data;
      }
      
      setSubmissions(testsData);
      
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger les tests');
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredSubmissions = searchTerm 
    ? submissions.filter(sub => 
        (sub.student_name || '').toLowerCase().includes(searchTerm) ||
        (sub.student_email || '').toLowerCase().includes(searchTerm) ||
        (sub.class_name || '').toLowerCase().includes(searchTerm)
      )
    : submissions;

  const handleStartGrading = (submission) => {
    console.log("🚀 Navigation vers correction:", {
      studentName: submission.student_name,
      studentId: submission.student_id,
      submissionId: submission.id
    });
    
    if (!submission.student_id) {
      toast.error("ID étudiant manquant");
      return;
    }
    
    navigate(`/teacher/tests/${testId}/grade/${submission.student_id}`);
  };

  const handleForceGrade = (submission) => {
    setSelectedSubmission(submission);
    setConfirmDialog(true);
  };

  const confirmForceGrade = () => {
    if (selectedSubmission?.student_id) {
      navigate(`/teacher/tests/${testId}/grade/${selectedSubmission.student_id}`);
    }
    setConfirmDialog(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0min';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="textSecondary">
            Chargement des soumissions...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (testId && testData) {
    const submittedCount = submissions.filter(s => s.is_submitted).length;
    const gradedCount = submissions.filter(s => s.is_graded).length;
    
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/teacher/grade-tests')}
            sx={{ mb: 3 }}
          >
            Retour aux tests
          </Button>
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                📝 Copies - {testData.title}
              </Typography>
              
              <Typography variant="body1" color="textSecondary" gutterBottom>
                {testData.subject_name || 'Matière'} • {testData.duration} min • {testData.total_marks} points
              </Typography>
              
              <Box display="flex" gap={2} mt={1}>
                <Chip 
                  label={`${submittedCount} soumis`}
                  color="success"
                  variant="outlined"
                />
                <Chip 
                  label={`${gradedCount} corrigés`}
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  label={`${submissions.length} étudiants`}
                  color="default"
                  variant="outlined"
                />
              </Box>
            </Box>
            
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Description />}
                onClick={() => navigate(`/teacher/tests/${testId}/questions`)}
                sx={{ mr: 1 }}
              >
                Voir questions
              </Button>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={loadTestSubmissions}
              >
                Actualiser
              </Button>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher un étudiant par nom, email ou classe..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
        </Paper>

        <Card>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Aucune copie à corriger
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {searchTerm 
                    ? "Aucun résultat pour votre recherche"
                    : "Aucun étudiant n'a encore soumis de copie pour ce test"
                  }
                </Typography>
              </Box>
            ) : (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" color="textSecondary">
                    {filteredSubmissions.length} copie(s) à corriger
                  </Typography>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Étudiant</strong></TableCell>
                        <TableCell align="center"><strong>Classe</strong></TableCell>
                        <TableCell align="center"><strong>Statut</strong></TableCell>
                        <TableCell align="center"><strong>Score</strong></TableCell>
                        <TableCell align="center"><strong>Réponses</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSubmissions.map((sub, index) => (
                        <TableRow key={sub.id || sub.student_id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ 
                                bgcolor: sub.is_graded ? '#4caf50' : '#1976d2',
                                width: 40,
                                height: 40
                              }}>
                                {(sub.student_name || 'É').charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography fontWeight={600}>
                                  {sub.student_name || `Étudiant ${sub.student_id}`}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {sub.student_email || ''}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip 
                              label={sub.class_name || 'Classe'} 
                              size="small" 
                              variant="outlined" 
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={sub.is_graded ? 'Déjà corrigé' : 'À corriger'}
                              color={sub.is_graded ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box>
                              <Typography variant="h6" fontWeight={600} color="primary">
                                {sub.score || 0}/{sub.total_marks || testData.total_marks}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip 
                              label={`${sub.answers_count || 0} réponses`}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleStartGrading(sub)}
                              startIcon={<Visibility />}
                              color={sub.is_graded ? "primary" : "success"}
                              disabled={!sub.student_id}
                            >
                              {sub.is_graded ? 'Voir note' : 'Corriger'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
        
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Debug:</strong> Test ID: {testId} | 
            Étudiants: {submissions.length} | 
            API: /tests/quizzes/{testId}/submissions-all/
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        📚 Mes Tests à Corriger
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {submissions.length === 0 ? (
          <Grid item xs={12}>
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Aucun test créé
              </Typography>
              <Button 
                variant="contained"
                onClick={() => navigate('/teacher/create-test')}
                sx={{ mt: 2 }}
              >
                Créer votre premier test
              </Button>
            </Box>
          </Grid>
        ) : (
          submissions.map((test) => (
            <Grid item xs={12} md={6} lg={4} key={test.id}>
              <Card sx={{ 
                height: '100%',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                  transition: 'all 0.3s'
                }
              }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {test.title}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    📚 {test.subject_name || test.subject || 'Matière'}
                  </Typography>
                  
                  <Box display="flex" gap={1} mb={2}>
                    <Chip 
                      label={`${test.questions_count || 0} questions`} 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={`${test.duration || 0} min`} 
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                    <Chip 
                      label={`${test.total_marks || 0} pts`} 
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={`${test.submitted_count || 0} soumis`} 
                        size="small" 
                        color="success"
                      />
                      <Chip 
                        label={`${test.graded_count || 0} corrigés`} 
                        size="small" 
                        color="primary"
                      />
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/teacher/tests/${test.id}/grade`)}
                      startIcon={<Visibility />}
                    >
                      Voir
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  );
}