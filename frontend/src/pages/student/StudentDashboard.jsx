// src/pages/student/StudentDashboard.jsx - VERSION COMPLÈTE DYNAMIQUE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import {
  Container, Grid, Card, CardContent, Typography, Button, Avatar,
  Chip, Box, LinearProgress, Badge, Paper, Stack, alpha, styled,
  IconButton, Divider
} from '@mui/material';
import {
  School, Assignment, VideoCall, TrendingUp, People, Book,
  AccessTime, ArrowForward, CheckCircle, EmojiEvents, Today,
  Grade, Videocam, Refresh, Chat, Schedule, Assessment
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

const LiveSessionCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.1)'
  }
}));

const SubjectCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid',
  borderColor: theme.palette.divider,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    borderColor: '#e53935',
    backgroundColor: alpha('#e53935', 0.02)
  }
}));

export default function StudentDashboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    todayClasses: [],
    subjects: [],
    classmates: [],
    recentGrades: [],
    liveSessions: [],
    upcomingTests: [],
    stats: {
      totalSubjects: 0,
      averageGrade: 0,
      attendanceRate: 0,
      pendingTests: 0,
      classmatesCount: 0
    }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Charger toutes les données en parallèle
      const [
        scheduleRes,
        classesRes,
        testsRes,
        resultsRes,
        liveSessionsRes
      ] = await Promise.allSettled([
        api.get('/schedule/student/my-schedule/'),
        api.get('/classes/student-classes/'),
        api.get('/tests/student/tests/'),
        api.get('/tests/student/results/'),
        api.get('/live/sessions/active/')
      ]);

      // Traiter l'emploi du temps
      const scheduleData = scheduleRes.status === 'fulfilled' ? scheduleRes.value.data : null;
      const todayClasses = processTodayClasses(scheduleData);
      const subjects = processSubjects(scheduleData);

      // Traiter les classes et camarades
      const classesData = classesRes.status === 'fulfilled' ? classesRes.value.data : null;
      const classmates = classesData?.classmates?.data || [];
      const className = classesData?.class?.name || 'Non définie';

      // Traiter les tests
      const testsData = testsRes.status === 'fulfilled' ? testsRes.value.data : [];
      const upcomingTests = testsData.filter(t => t.status === 'active' || t.status === 'upcoming').slice(0, 3);

      // Traiter les résultats
      const resultsData = resultsRes.status === 'fulfilled' ? resultsRes.value.data : [];
      const recentGrades = resultsData.slice(0, 5);

      // Traiter les sessions live
      const liveSessionsData = liveSessionsRes.status === 'fulfilled' ? liveSessionsRes.value.data : [];

      // Calculer les statistiques
      const stats = {
        totalSubjects: subjects.length,
        averageGrade: calculateAverageGrade(resultsData),
        attendanceRate: 95, // À remplacer par données réelles si disponible
        pendingTests: testsData.filter(t => t.status === 'active').length,
        classmatesCount: classmates.length
      };

      setDashboardData({
        todayClasses,
        subjects,
        classmates,
        recentGrades,
        liveSessions: liveSessionsData,
        upcomingTests,
        className,
        stats
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
        teacher: slot.teacher_name,
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
          teacher: slot.teacher_name,
          color: getSubjectColor(slot.subject_name)
        };
      }
    });

    return Object.values(uniqueSubjects);
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

  const calculateAverageGrade = (results) => {
    if (!results || results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
    return (total / results.length / 5).toFixed(1); // Convertir en note sur 20
  };

  const joinLiveSession = (session) => {
    if (session.meeting_id) {
      navigate(`/live-session/${session.meeting_id}`);
    } else {
      toast.info('Session non disponible');
    }
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
              Bonjour, {authUser?.first_name || authUser?.username} 👋
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {dashboardData.className} • {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip icon={<School />} label={`${dashboardData.stats.totalSubjects} matières`} color="primary" variant="outlined" />
              <Chip icon={<Grade />} label={`Moyenne: ${dashboardData.stats.averageGrade}/20`} color="success" variant="outlined" />
              <Chip icon={<CheckCircle />} label={`${dashboardData.stats.attendanceRate}% Présence`} color="info" variant="outlined" />
              <Chip icon={<Assessment />} label={`${dashboardData.stats.pendingTests} tests en cours`} color="warning" variant="outlined" />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<VideoCall />}
                onClick={() => navigate('/student/live-sessions')}
                sx={{
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                  px: 3,
                  py: 1.5
                }}
              >
                Sessions Live
              </Button>
              <IconButton onClick={loadDashboardData} sx={{ bgcolor: 'action.hover' }}>
                <Refresh />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Session Live Active */}
      {dashboardData.liveSessions && dashboardData.liveSessions.length > 0 && (
        <LiveSessionCard sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Videocam sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight={700}>
                      🔴 Session en direct
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {dashboardData.liveSessions[0].title}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    👨‍🏫 {dashboardData.liveSessions[0].teacher_details?.username} • 
                    👥 {dashboardData.liveSessions[0].participants_count || 0} participants
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<VideoCall />}
                  sx={{
                    background: 'white',
                    color: '#e53935',
                    fontWeight: 600,
                    borderRadius: '12px',
                    px: 4,
                    py: 1.5,
                    '&:hover': { background: 'rgba(255,255,255,0.9)' }
                  }}
                  onClick={() => joinLiveSession(dashboardData.liveSessions[0])}
                >
                  Rejoindre maintenant
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </LiveSessionCard>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="error">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">Mes matières</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#e53935' }}>
                    {dashboardData.stats.totalSubjects}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e53935', width: 56, height: 56 }}>
                  <School sx={{ fontSize: 28 }} />
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
                  <Typography color="textSecondary" variant="body2">Moyenne générale</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#2e7d32' }}>
                    {dashboardData.stats.averageGrade}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    <TrendingUp sx={{ fontSize: 14, verticalAlign: 'middle' }} /> Sur 20
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56 }}>
                  <EmojiEvents sx={{ fontSize: 28 }} />
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
                  <Typography color="textSecondary" variant="body2">Tests en cours</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#ed6c02' }}>
                    {dashboardData.stats.pendingTests}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ed6c02', width: 56, height: 56 }}>
                  <Assignment sx={{ fontSize: 28 }} />
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
                  <Typography color="textSecondary" variant="body2">Taux de présence</Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: '#0288d1' }}>
                    {dashboardData.stats.attendanceRate}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#0288d1', width: 56, height: 56 }}>
                  <CheckCircle sx={{ fontSize: 28 }} />
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
                  onClick={() => navigate('/student/schedule')}
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
                        👨‍🏫 {cls.teacher}
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
                    Profitez-en pour réviser !
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Tests à venir */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Assessment sx={{ color: '#e53935', fontSize: 28 }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      Tests à venir
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Préparez-vous pour vos évaluations
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/student/tests')}
                >
                  Voir tous
                </Button>
              </Box>

              {dashboardData.upcomingTests.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.upcomingTests.map((test) => (
                    <Paper
                      key={test.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: test.status === 'active' ? '#e53935' : 'divider',
                        bgcolor: test.status === 'active' ? alpha('#e53935', 0.05) : 'background.paper'
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" fontWeight={600}>
                          {test.title}
                        </Typography>
                        <Chip 
                          label={test.status === 'active' ? 'En cours' : 'À venir'} 
                          size="small" 
                          color={test.status === 'active' ? 'error' : 'warning'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        📚 {test.subject} • 👨‍🏫 {test.teacher}
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
                      {test.status === 'active' && (
                        <Button
                          fullWidth
                          variant="contained"
                          sx={{ mt: 2, bgcolor: '#e53935' }}
                          onClick={() => navigate(`/student/tests/${test.id}/take`)}
                        >
                          Commencer le test
                        </Button>
                      )}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={4}>
                  <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Aucun test programmé pour le moment
                  </Typography>
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
                <Book sx={{ color: '#e53935', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Mes matières
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.totalSubjects} matières ce semestre
                  </Typography>
                </Box>
              </Box>

              {dashboardData.subjects.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.subjects.map((subject) => (
                    <SubjectCard key={subject.id}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: subject.color }}>
                          <Book />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {subject.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {subject.teacher}
                          </Typography>
                        </Box>
                      </Box>
                    </SubjectCard>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={3}>
                  <Book sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Aucune matière trouvée
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Dernières notes */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <EmojiEvents sx={{ color: '#e53935', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Dernières notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vos résultats récents
                  </Typography>
                </Box>
              </Box>

              {dashboardData.recentGrades.length > 0 ? (
                <Stack spacing={2}>
                  {dashboardData.recentGrades.map((grade) => (
                    <Paper
                      key={grade.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeft: `4px solid ${grade.is_passed ? '#2e7d32' : '#d32f2f'}`,
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {grade.test_title}
                        </Typography>
                        <Chip
                          label={grade.grade}
                          size="small"
                          color={grade.is_passed ? 'success' : 'error'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        📚 {grade.subject}
                      </Typography>
                      <Typography variant="h6" fontWeight={600} sx={{ mt: 1 }}>
                        {grade.score}/{grade.total_marks} • {grade.percentage.toFixed(1)}%
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={3}>
                  <EmojiEvents sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Aucune note disponible
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

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
                    startIcon={<Schedule />}
                    onClick={() => navigate('/student/schedule')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Emploi
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate('/student/tests')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Tests
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Chat />}
                    onClick={() => navigate('/student/chat')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Messagerie
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<People />}
                    onClick={() => navigate('/student/classmates')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Camarades
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}