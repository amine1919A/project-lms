// src/pages/student/StudentSubjectDetails.jsx - FICHIER DE BASE
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress,
  Tabs,
  Tab,
  Avatar,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  TextField,
  InputAdornment,
  alpha,
  styled
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  VideoLibrary as VideoIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Folder as FolderIcon
} from '@mui/icons-material';

export default function StudentSubjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadSubjectData();
  }, [id]);

  const loadSubjectData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/classes/subjects/${id}/`);
      setSubject(res.data);
    } catch (err) {
      console.error('Erreur chargement matière:', err);
      toast.error('Erreur de chargement de la matière');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (!subject) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="textSecondary">
          Matière introuvable
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/dashboard')}
          sx={{ mt: 2 }}
        >
          Retour au tableau de bord
        </Button>
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
        
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64 }}>
            <BookIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="600">
              {subject.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              {subject.teacher_name && (
                <Chip
                  icon={<PersonIcon />}
                  label={subject.teacher_name}
                  size="small"
                  variant="outlined"
                />
              )}
              {subject.class_name && (
                <Chip
                  icon={<SchoolIcon />}
                  label={subject.class_name}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Aperçu" icon={<BookIcon />} />
          <Tab label="Cours" icon={<FolderIcon />} />
          <Tab label="Tests" icon={<AssignmentIcon />} />
          <Tab label="Ressources" icon={<VideoIcon />} />
        </Tabs>
      </Box>

      {/* Content */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            Description
          </Typography>
          <Typography paragraph>
            {subject.description || 'Aucune description disponible pour cette matière.'}
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Informations
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Enseignant"
                      secondary={subject.teacher_name || 'Non assigné'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Classe"
                      secondary={subject.class_name || 'Non assigné'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Spécialité"
                      secondary={subject.specialty_name || 'Générale'}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Actions rapides
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<FolderIcon />}
                    onClick={() => navigate(`/student/courses?subject=${id}`)}
                  >
                    Voir les cours
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AssignmentIcon />}
                    onClick={() => navigate(`/student/tests?subject=${id}`)}
                  >
                    Voir les tests
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<VideoIcon />}
                    onClick={() => navigate(`/student/subject-chat/${id}`)}
                  >
                    Chat de la matière
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}