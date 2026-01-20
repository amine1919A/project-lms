// src/pages/student/StudentResources.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Button,
  Chip, Box, LinearProgress, Avatar, Paper, Stack,
  List, ListItem, ListItemAvatar, ListItemText, Divider,
  TextField, InputAdornment, IconButton, Tabs, Tab,
  alpha, styled
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  VideoLibrary as VideoIcon,
  PictureAsPdf as PdfIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  School as SchoolIcon
} from '@mui/icons-material';

const ResourceCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[8]
  }
}));

export default function StudentResources() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [searchTerm, selectedType, activeTab, resources]);

  const loadResources = async () => {
    try {
      setLoading(true);
      
      // Charger les cours
      const coursesRes = await api.get('/courses/courses/');
      
      // Formater les ressources
      const resourcesList = [];
      
      if (coursesRes.data) {
        coursesRes.data.forEach(course => {
          resourcesList.push({
            id: course.id,
            type: 'pdf',
            title: course.title,
            description: course.description,
            subject: course.subject_name || 'Matière',
            teacher: course.teacher_name || 'Enseignant',
            date: course.created_at,
            size: '2.4 MB',
            downloads: Math.floor(Math.random() * 100),
            icon: <PdfIcon />
          });
        });
      }
      
      // Ajouter des ressources simulées
      resourcesList.push(
        {
          id: 101,
          type: 'video',
          title: 'Introduction aux Algorithmes',
          description: 'Vidéo explicative sur les bases des algorithmes',
          subject: 'Algorithmique',
          teacher: 'Dr. Smith',
          date: '2024-01-20',
          duration: '45:23',
          views: 150,
          icon: <VideoIcon />
        },
        {
          id: 102,
          type: 'pdf',
          title: 'Guide de Programmation Python',
          description: 'Document complet sur Python pour débutants',
          subject: 'Programmation',
          teacher: 'Dr. Williams',
          date: '2024-01-18',
          size: '3.1 MB',
          downloads: 85,
          icon: <PdfIcon />
        },
        {
          id: 103,
          type: 'folder',
          title: 'TP Base de Données',
          description: 'Travaux pratiques et exercices corrigés',
          subject: 'Base de Données',
          teacher: 'Prof. Johnson',
          date: '2024-01-15',
          files: 12,
          icon: <FolderIcon />
        }
      );
      
      setResources(resourcesList);
      setFilteredResources(resourcesList);

    } catch (error) {
      console.error('Erreur chargement ressources:', error);
      // Données simulées
      const mockResources = [
        {
          id: 1,
          type: 'pdf',
          title: 'Cours Algorithmique Chapitre 1',
          description: 'Introduction aux structures de données',
          subject: 'Algorithmique',
          teacher: 'Dr. Smith',
          date: '2024-01-20',
          size: '2.4 MB',
          downloads: 45,
          icon: <PdfIcon />
        }
      ];
      setResources(mockResources);
      setFilteredResources(mockResources);
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    // Filtrer par type
    if (selectedType !== 'all') {
      filtered = filtered.filter(res => res.type === selectedType);
    }

    // Filtrer par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(res =>
        res.title.toLowerCase().includes(term) ||
        res.description.toLowerCase().includes(term) ||
        res.subject.toLowerCase().includes(term)
      );
    }

    // Filtrer par tab (récents/populaires/favoris)
    if (activeTab === 1) {
      filtered = filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (activeTab === 2) {
      filtered = filtered.slice(0, 5); // Simuler les favoris
    }

    setFilteredResources(filtered);
  };

  const downloadResource = (resource) => {
    toast.success(`Téléchargement de "${resource.title}"`);
    // Ici, vous implémenterez le téléchargement réel
  };

  const shareResource = (resource) => {
    toast.info(`Lien de "${resource.title}" copié dans le presse-papier`);
    // Ici, vous implémenterez le partage
  };

  const bookmarkResource = (resource) => {
    toast.success(`"${resource.title}" ajouté aux favoris`);
    // Ici, vous implémenterez les favoris
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
          📚 Ressources pédagogiques
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Accédez à tous vos documents, vidéos et supports de cours
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" color="#e53935" fontWeight="700">
              {resources.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ressources totales
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" color="#1976d2" fontWeight="700">
              {resources.filter(r => r.type === 'pdf').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Documents PDF
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" color="#2e7d32" fontWeight="700">
              {resources.filter(r => r.type === 'video').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vidéos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" color="#9c27b0" fontWeight="700">
              {resources.reduce((sum, res) => sum + (res.downloads || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Téléchargements
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Contrôles */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Rechercher une ressource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              SelectProps={{
                native: true,
              }}
            >
              <option value="all">Tous les types</option>
              <option value="pdf">PDF</option>
              <option value="video">Vidéos</option>
              <option value="folder">Dossiers</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              size="small"
            >
              Plus de filtres
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Récents" />
        <Tab label="Populaires" />
        <Tab label="Favoris" />
        <Tab label="Par matière" />
      </Tabs>

      {/* Liste des ressources */}
      {filteredResources.length > 0 ? (
        <Grid container spacing={3}>
          {filteredResources.map(resource => (
            <Grid item xs={12} md={6} lg={4} key={resource.id}>
              <ResourceCard>
                <CardContent>
                  <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                    <Avatar sx={{ 
                      bgcolor: resource.type === 'pdf' ? '#e53935' : 
                               resource.type === 'video' ? '#1976d2' : '#2e7d32'
                    }}>
                      {resource.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="600" gutterBottom>
                        {resource.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {resource.description}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Métadonnées */}
                  <Box mb={3}>
                    <Stack spacing={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SchoolIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {resource.subject}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {resource.teacher}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {new Date(resource.date).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Stats et actions */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      {resource.size && (
                        <Chip label={resource.size} size="small" sx={{ mr: 1 }} />
                      )}
                      {resource.downloads && (
                        <Chip 
                          label={`${resource.downloads} téléchargements`} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => bookmarkResource(resource)}
                      >
                        <BookmarkIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => shareResource(resource)}
                      >
                        <ShareIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => downloadResource(resource)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </ResourceCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune ressource trouvée
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm ? 'Aucune ressource ne correspond à votre recherche' : 'Aucune ressource disponible pour le moment'}
          </Typography>
          {searchTerm && (
            <Button
              variant="outlined"
              onClick={() => setSearchTerm('')}
            >
              Effacer la recherche
            </Button>
          )}
        </Paper>
      )}
    </Container>
  );
}