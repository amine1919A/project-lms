// src/pages/student/StudentClasses.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Button,
  Chip, Box, LinearProgress, Avatar, Paper, Stack,
  List, ListItem, ListItemAvatar, ListItemText, Divider,
  alpha, styled
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Book as BookIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Chat as ChatIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';

const ClassCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  cursor: 'pointer',
  transition: 'all 0.3s',
  border: '2px solid transparent',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[8],
    borderColor: '#e53935',
    backgroundColor: alpha('#e53935', 0.02)
  }
}));

export default function StudentClasses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      
      // Charger les classes de l'étudiant
      const userRes = await api.get('/accounts/me/');
      const userData = userRes.data.user;
      
      const classesRes = await api.get('/classes/classes/');
      const studentClasses = classesRes.data.filter(cls => 
        cls.students?.some(s => s.id === userData.id)
      );
      
      setClasses(studentClasses);
      
      // Extraire toutes les matières
      const allSubjects = [];
      studentClasses.forEach(cls => {
        if (cls.subjects) {
          allSubjects.push(...cls.subjects);
        }
      });
      setSubjects(allSubjects);

    } catch (error) {
      console.error('Erreur chargement classes:', error);
      // Données simulées
      setClasses([
        {
          id: 1,
          name: 'ING1 Informatique',
          max_students: 30,
          students_count: 25,
          subjects: [
            { id: 1, name: 'Algorithmique', teacher_name: 'Dr. Smith' },
            { id: 2, name: 'Base de Données', teacher_name: 'Prof. Johnson' },
            { id: 3, name: 'Programmation Web', teacher_name: 'Dr. Williams' },
          ]
        }
      ]);
      setSubjects([
        { id: 1, name: 'Algorithmique', teacher_name: 'Dr. Smith', class_name: 'ING1 Info' },
        { id: 2, name: 'Base de Données', teacher_name: 'Prof. Johnson', class_name: 'ING1 Info' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const viewClassDetails = (classId) => {
    navigate(`/student/class/${classId}`);
  };

  const viewSubjectDetails = (subjectId) => {
    navigate(`/student/subject/${subjectId}`);
  };

  const joinClassChat = (classId) => {
    toast.info(`Ouverture du chat de la classe`);
    // Naviguer vers le chat de la classe
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/dashboard')}
          sx={{ mb: 2 }}
        >
          Retour
        </Button>
        
        <Typography variant="h4" fontWeight="600" gutterBottom>
          🏫 Mes Classes
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gérez vos classes et matières
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="#e53935" fontWeight="700">
              {classes.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Classes
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="#1976d2" fontWeight="700">
              {subjects.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Matières
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="#2e7d32" fontWeight="700">
              25
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Camarades
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="#ed6c02" fontWeight="700">
              92%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Présence
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Mes Classes */}
      <Typography variant="h5" fontWeight="600" gutterBottom sx={{ mb: 3 }}>
        Mes Classes ({classes.length})
      </Typography>
      
      {classes.length > 0 ? (
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {classes.map(cls => (
            <Grid item xs={12} md={6} key={cls.id}>
              <ClassCard onClick={() => viewClassDetails(cls.id)}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Avatar sx={{ bgcolor: '#e53935', width: 60, height: 60 }}>
                    <SchoolIcon fontSize="large" />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h5" fontWeight="700">
                      {cls.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cls.students_count || 0} étudiants • Max: {cls.max_students}
                    </Typography>
                  </Box>
                </Box>
                
                <Box mb={3}>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                    Matières ({cls.subjects?.length || 0})
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {cls.subjects?.slice(0, 3).map(subject => (
                      <Chip
                        key={subject.id}
                        label={subject.name}
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewSubjectDetails(subject.id);
                        }}
                      />
                    ))}
                    {cls.subjects?.length > 3 && (
                      <Chip
                        label={`+${cls.subjects.length - 3} autres`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
                
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ChatIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      joinClassChat(cls.id);
                    }}
                  >
                    Chat
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<BookIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      viewClassDetails(cls.id);
                    }}
                    sx={{ bgcolor: '#e53935' }}
                  >
                    Voir détails
                  </Button>
                </Box>
              </ClassCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center', mb: 6 }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Vous n'êtes pas encore assigné à une classe
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Contactez votre administrateur pour être affecté à une classe
          </Typography>
          <Button
            variant="outlined"
            onClick={() => toast.info('Demande envoyée à l\'administrateur')}
          >
            Demander une affectation
          </Button>
        </Paper>
      )}

      {/* Toutes les matières */}
      <Typography variant="h5" fontWeight="600" gutterBottom sx={{ mb: 3 }}>
        Toutes mes matières ({subjects.length})
      </Typography>
      
      {subjects.length > 0 ? (
        <Grid container spacing={2}>
          {subjects.map(subject => (
            <Grid item xs={12} md={6} lg={4} key={subject.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: '#1976d2' }}>
                      <BookIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="600">
                        {subject.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subject.teacher_name || 'Enseignant'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box mb={2}>
                    <Chip
                      label={subject.class_name || 'Classe'}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Button
                      size="small"
                      onClick={() => viewSubjectDetails(subject.id)}
                    >
                      Accéder
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ChatIcon />}
                      onClick={() => navigate(`/student/subject-chat/${subject.id}`)}
                    >
                      Chat
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <BookIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune matière disponible
          </Typography>
        </Paper>
      )}
    </Container>
  );
}