// src/pages/teacher/TeacherDashboard.jsx - VERSION COMPLÈTE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import {
  Container, Grid, Card, CardContent, Typography, Button, Avatar,
  Chip, Box, LinearProgress, Paper, Stack, alpha, styled, Divider
} from '@mui/material';
import {
  School, Assignment, People, VideoCall, TrendingUp,
  AccessTime, ArrowForward, Today, Add, Assessment,
  Class, CalendarToday, CheckCircle, Grade
} from '@mui/icons-material';

const StatCard = styled(Card)(({ theme, color = 'primary' }) => ({
  borderRadius: '16px',
  border: '1px solid',
  borderColor: theme.palette[color].light,
  background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)} 0%, ${alpha(theme.palette[color].light, 0.05)} 100%)`,
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    borderColor: theme.palette[color].main
  }
}));

export default function TeacherDashboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    todayClasses: [],
    mySubjects: [],
    myClasses: [],
    activeTests: [],
    pendingGrading: [],
    stats: {
      totalClasses: 0,
      totalStudents: 0,
      activeTests: 0,
      weeklyHours: 0
    }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
  
      // Charger les données de l'enseignant
      const [
        scheduleRes,
        classesRes,
        testsRes
      ] = await Promise.allSettled([
        api.get('/schedule/teacher/my-schedule/'),
        api.get('/classes/classes/'),
        api.get('/tests/quizzes/')
      ]);
  
      // Traiter l'emploi du temps
      const scheduleData = scheduleRes.status === 'fulfilled' ? scheduleRes.value.data : null;
      const todayClasses = processTodayClasses(scheduleData);
      const weeklyHours = scheduleData?.weekly_hours || 0;
  
      // Traiter les classes
      const classesData = classesRes.status === 'fulfilled' ? classesRes.value.data : null;
      const myClasses = processClasses(classesData);
  
      // Extraire les matières depuis l'emploi du temps
      const mySubjects = processSubjects(scheduleData);
  
      // Traiter les tests - CORRECTION ICI
      let activeTests = [];
      if (testsRes.status === 'fulfilled') {
        const testsData = testsRes.value.data;
        // Vérifier si c'est un tableau ou un objet avec results
        if (Array.isArray(testsData)) {
          activeTests = testsData.filter(t => t.is_available && t.is_active);
        } else if (testsData?.results && Array.isArray(testsData.results)) {
          activeTests = testsData.results.filter(t => t.is_available && t.is_active);
        } else if (testsData?.data && Array.isArray(testsData.data)) {
          activeTests = testsData.data.filter(t => t.is_available && t.is_active);
        }
      }
  
      // Compter le nombre total d'étudiants
      const totalStudents = myClasses.reduce((sum, cls) => sum + (cls.student_count || 0), 0);
  
      setDashboardData({
        todayClasses,
        mySubjects,
        myClasses,
        activeTests,
        pendingGrading: [], // À implémenter si nécessaire
        stats: {
          totalClasses: myClasses.length,
          totalStudents,
          activeTests: activeTests.length,
          weeklyHours
        }
      });
  
    } catch (error) {
      console.error('❌ Erreur chargement dashboard:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const processTodayClasses = (scheduleData) => {
    if (!scheduleData?.time_slots) return [];

    const today = new Date();
    const dayNames = {
      'Sunday': 'dimanche',
      'Monday': 'lundi',
      'Tuesday': 'mardi',
      'Wednesday': 'mercredi',
      'Thursday': 'jeudi',
      'Friday': 'vendredi',
      'Saturday': 'samedi'
    };
    const todayName = dayNames[today.toLocaleDateString('en-US', { weekday: 'long' })];

    return scheduleData.time_slots
      .filter(slot => slot.day?.toLowerCase() === todayName)
      .map(slot => ({
        id: slot.id,
        subject: slot.subject_name,
        className: slot.class_name,
        time: `${slot.start_time} - ${slot.end_time}`,
        room: slot.classroom,
        color: getSubjectColor(slot.subject_name)
      }));
  };

  const processSubjects = (scheduleData) => {
    if (!scheduleData?.time_slots) return [];

    const uniqueSubjects = {};
    scheduleData.time_slots.forEach(slot => {
      if (slot.subject_name && !uniqueSubjects[slot.subject_name]) {
        uniqueSubjects[slot.subject_name] = {
          id: slot.subject_id || Math.random(),
          name: slot.subject_name,
          color: getSubjectColor(slot.subject_name)
        };
      }
    });

    return Object.values(uniqueSubjects);
  };

  const processClasses = (classesData) => {
    if (!classesData?.results) return [];

    return classesData.results.map(cls => ({
      id: cls.id,
      name: cls.name,
      student_count: cls.student_count || 0,
      subject_count: cls.subject_count || 0
    }));
  };

  const getSubjectColor = (name) => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary">
          Chargement de votre tableau de bord...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight={700} sx={{ color: '#e53935', mb: 1 }}>
              Bonjour, Prof. {authUser?.last_name || authUser?.username} 👨‍🏫
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Enseignant • {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip icon={<Class />} label={`${dashboardData.stats.totalClasses} classes`} color="primary" variant="outlined" />
              <Chip icon={<People />} label={`${dashboardData.stats.totalStudents} étudiants`} color="success" variant="outlined" />
              <Chip icon={<Assessment />} label={`${dashboardData.stats.activeTests} tests actifs`} color="warning" variant="outlined" />
              <Chip icon={<AccessTime />} label={`${dashboardData.stats.weeklyHours}h/semaine`} color="info" variant="outlined" />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/teacher/tests/create')}
                sx={{
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                  px: 3,
                  py: 1.5
                }}
              >
                Créer un Test
              </Button>
              <Button
                variant="outlined"
                startIcon={<VideoCall />}
                onClick={() => navigate('/teacher/live-sessions')}
                sx={{ borderRadius: '12px', py: 1.5 }}
              >
                Live Session
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="error">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Mes Classes
                  </Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#e53935' }}>
                    {dashboardData.stats.totalClasses}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e53935', width: 56, height: 56 }}>
                  <Class sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="success">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Étudiants
                  </Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#2e7d32' }}>
                    {dashboardData.stats.totalStudents}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56 }}>
                  <People sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="warning">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Tests Actifs
                  </Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#ed6c02' }}>
                    {dashboardData.stats.activeTests}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ed6c02', width: 56, height: 56 }}>
                  <Assessment sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="info">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Heures / Semaine
                  </Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#0288d1' }}>
                    {dashboardData.stats.weeklyHours}h
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#0288d1', width: 56, height: 56 }}>
                  <AccessTime sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Colonne gauche */}
        <Grid item xs={12} lg={8}>
          {/* Cours d'aujourd'hui */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Today sx={{ color: '#e53935', fontSize: 28 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      Aujourd'hui
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vos cours du jour
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/teacher/schedule')}
                >
                  Emploi complet
                </Button>
              </Box>

              {dashboardData.todayClasses.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.todayClasses.map((cls) => (
                    <Paper
                      key={cls.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        borderLeft: `4px solid ${cls.color}`,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          transition: 'all 0.3s'
                        }
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" fontWeight={600}>
                          {cls.subject}
                        </Typography>
                        <Chip label={cls.time} size="small" sx={{ bgcolor: cls.color, color: 'white' }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        🎓 {cls.className}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <School fontSize="small" color="action" />
                        <Typography variant="body2">{cls.room}</Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={4}>
                  <Today sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Aucun cours aujourd'hui
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Profitez de votre journée !
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Tests actifs */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Assessment sx={{ color: '#e53935', fontSize: 28 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      Tests Actifs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tests en cours pour vos étudiants
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/teacher/tests')}
                >
                  Gérer les tests
                </Button>
              </Box>

              {dashboardData.activeTests.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.activeTests.map((test) => (
                    <Paper
                      key={test.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: '#e53935',
                        bgcolor: alpha('#e53935', 0.05)
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" fontWeight={600}>
                          {test.title}
                        </Typography>
                        <Chip label="ACTIF" color="error" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        📚 {test.subject_name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2} mt={2}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <AccessTime fontSize="small" />
                          <Typography variant="body2">{test.duration} min</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Grade fontSize="small" />
                          <Typography variant="body2">{test.total_marks} points</Typography>
                        </Box>
                      </Box>
                      <Button
                        fullWidth
                        variant="outlined"
                        sx={{ mt: 2 }}
                        onClick={() => navigate(`/teacher/tests/${test.id}/results`)}
                      >
                        Voir les résultats
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={4}>
                  <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Aucun test actif
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/teacher/tests/create')}
                    sx={{ mt: 2, bgcolor: '#e53935' }}
                  >
                    Créer un test
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Colonne droite */}
        <Grid item xs={12} lg={4}>
          {/* Mes matières */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <School sx={{ color: '#e53935', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Mes Matières
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.mySubjects.length} matière(s) enseignée(s)
                  </Typography>
                </Box>
              </Box>

              {dashboardData.mySubjects.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.mySubjects.map((subject) => (
                    <Paper
                      key={subject.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeft: `4px solid ${subject.color}`,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(subject.color, 0.05)
                        }
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {subject.name}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={3}>
                  <School sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Aucune matière assignée
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Mes classes */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Class sx={{ color: '#e53935', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Mes Classes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.totalClasses} classe(s)
                  </Typography>
                </Box>
              </Box>

              {dashboardData.myClasses.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.myClasses.map((cls) => (
                    <Paper
                      key={cls.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                    >
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {cls.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip label={`${cls.student_count} étudiants`} size="small" />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={3}>
                  <Class sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Aucune classe assignée
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          // Dans src/pages/teacher/TeacherDashboard.jsx - SECTION ACTIONS RAPIDES CORRIGÉE
{/* Actions rapides */}
<Card sx={{ borderRadius: 3 }}>
  <CardContent>
    <Typography variant="h5" fontWeight={700} gutterBottom>
      ⚡ Actions rapides
    </Typography>
    <Grid container spacing={1}>
      <Grid item xs={6}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Add />}
          onClick={() => navigate('/teacher/tests/create')}
          sx={{ 
            justifyContent: 'flex-start', 
            py: 1.5,
            borderColor: '#e53935',
            color: '#e53935',
            '&:hover': {
              borderColor: '#c62828',
              backgroundColor: 'rgba(229, 57, 53, 0.04)'
            }
          }}
        >
          Créer Test
        </Button>
      </Grid>

      <Grid item xs={6}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Grade />}
          onClick={() => navigate('/teacher/tests/grade')}
          sx={{ 
            justifyContent: 'flex-start', 
            py: 1.5,
            borderColor: '#ed6c02',
            color: '#ed6c02',
            '&:hover': {
              borderColor: '#d84315',
              backgroundColor: 'rgba(237, 108, 2, 0.04)'
            }
          }}
        >
          Corriger
        </Button>
      </Grid>

      <Grid item xs={6}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<CalendarToday />}
          onClick={() => navigate('/teacher/schedule')}
          sx={{ 
            justifyContent: 'flex-start', 
            py: 1.5,
            borderColor: '#0288d1',
            color: '#0288d1',
            '&:hover': {
              borderColor: '#01579b',
              backgroundColor: 'rgba(2, 136, 209, 0.04)'
            }
          }}
        >
          Emploi
        </Button>
      </Grid>

      <Grid item xs={6}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<VideoCall />} 
          onClick={() => navigate('/teacher/start-live')} // ← CORRIGÉ
          sx={{ 
            justifyContent: 'flex-start', 
            py: 1.5,
            borderColor: '#9c27b0',
            color: '#9c27b0',
            '&:hover': {
              borderColor: '#7b1fa2',
              backgroundColor: 'rgba(156, 39, 176, 0.04)'
            }
          }}
        >
          Live Session
        </Button>
      </Grid>

      <Grid item xs={6}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<People />}
          onClick={() => navigate('/teacher/chat')}
          sx={{ 
            justifyContent: 'flex-start', 
            py: 1.5,
            borderColor: '#2e7d32',
            color: '#2e7d32',
            '&:hover': {
              borderColor: '#1b5e20',
              backgroundColor: 'rgba(46, 125, 50, 0.04)'
            }
          }}
        >
          Chat
        </Button>
      </Grid>

      <Grid item xs={6}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<School />}
          onClick={() => navigate('/teacher/courses')}
          sx={{ 
            justifyContent: 'flex-start', 
            py: 1.5,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
              borderColor: '#0d47a1',
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Cours
        </Button>
      </Grid>
    </Grid>

    {/* Section LIVE spéciale */}
    <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(229, 57, 53, 0.05)', borderRadius: 2, border: '1px dashed #e53935' }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: '#e53935' }}>
        🎥 Sessions Live
      </Typography>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<VideoCall />}
            onClick={() => navigate('/teacher/live-sessions')}
            sx={{
              justifyContent: 'center',
              py: 1.2,
              bgcolor: '#e53935',
              '&:hover': {
                bgcolor: '#c62828',
                transform: 'translateY(-2px)',
                boxShadow: 3
              }
            }}
          >
            Gérer toutes les sessions
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
            Consultez, démarrez ou gérez vos sessions en direct
                    </Typography>
                 </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card> 
        </Grid>
      </Grid>
    </Container>
  );
}