// src/pages/student/StudentClassDetails.jsx
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
  Badge,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  alpha,
  styled
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Book as BookIcon,
  VideoCall as VideoCallIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  Schedule as ScheduleIcon,
  Folder as FolderIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  PlayCircle as PlayIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  School as SchoolIcon
} from '@mui/icons-material';

const SubjectCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  height: '100%',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid transparent',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.02)
  }
}));

const LiveSessionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

export default function StudentClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [openChat, setOpenChat] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [activeLiveSession, setActiveLiveSession] = useState(null);

  useEffect(() => {
    loadClassData();
    loadLiveSessions();
    loadChatMessages();
  }, [id]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/classes/classes/${id}/`);
      setClassData(res.data);
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur de chargement de la classe');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveSessions = async () => {
    try {
      const res = await api.get('/live/sessions/active/');
      const filtered = res.data.filter(session => 
        session.subject?.class_assigned?.toString() === id
      );
      setLiveSessions(filtered);
      
      // Simuler une session active
      if (filtered.length === 0) {
        setLiveSessions([
          {
            id: 1,
            title: 'Algorithmique - Séance Live',
            teacher: 'Dr. Smith',
            start_time: new Date().toISOString(),
            participants_count: 12,
            is_active: true,
            subject: { name: 'Algorithmique' }
          }
        ]);
      }
    } catch (err) {
      console.error('Erreur sessions:', err);
    }
  };

  const loadChatMessages = () => {
    // Simuler des messages de chat
    const mockMessages = [
      { id: 1, user: 'Dr. Smith', message: 'Bonjour à tous ! La session commence maintenant.', time: '10:00', isTeacher: true },
      { id: 2, user: 'Ahmed', message: 'Bonjour professeur !', time: '10:01', isTeacher: false },
      { id: 3, user: 'Fatima', message: 'J\'ai une question sur l\'exercice 3', time: '10:02', isTeacher: false },
      { id: 4, user: 'Dr. Smith', message: 'Je vais expliquer maintenant.', time: '10:03', isTeacher: true }
    ];
    setChatMessages(mockMessages);
  };

  const joinLiveSession = (sessionId) => {
    navigate(`/live-session/${sessionId}`);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: chatMessages.length + 1,
      user: 'Moi',
      message: message,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isTeacher: false
    };
    
    setChatMessages([...chatMessages, newMessage]);
    setMessage('');
  };

  const downloadResource = (resource) => {
    toast.info(`Téléchargement de ${resource.name}...`);
    // Implémentation du téléchargement réel
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (!classData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="textSecondary">
          Classe introuvable
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

  const tabs = [
    { label: 'Matières', icon: <BookIcon />, count: classData.subjects?.length || 0 },
    { label: 'Cours', icon: <FolderIcon />, count: 8 },
    { label: 'Live', icon: <VideoCallIcon />, count: liveSessions.length },
    { label: 'Chat', icon: <ChatIcon />, count: chatMessages.length },
    { label: 'Emploi du temps', icon: <ScheduleIcon /> },
    { label: 'Membres', icon: <PeopleIcon />, count: classData.students?.length || 0 }
  ];

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
        
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item>
            <Typography variant="h4" component="h1" fontWeight="600">
              {classData.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              <Chip
                icon={<PeopleIcon />}
                label={`${classData.students?.length || 0} étudiants`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<BookIcon />}
                label={`${classData.subjects?.length || 0} matières`}
                size="small"
                color="secondary"
                variant="outlined"
              />
              <Chip
                icon={<SchoolIcon />}
                label="ING1 Informatique"
                size="small"
                variant="outlined"
              />
            </Box>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => navigate(`/student/schedule/${id}`)}
              >
                Emploi du temps
              </Button>
              <Button
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => setOpenChat(true)}
              >
                Ouvrir le chat
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Live Sessions Banner */}
      {liveSessions.filter(s => s.is_active).length > 0 && (
        <LiveSessionCard sx={{ mb: 4 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Box position="relative" zIndex={1}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  🎥 Session en cours
                </Typography>
                <Typography variant="body1">
                  {liveSessions[0].title} avec {liveSessions[0].teacher}
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  <Chip
                    label="EN DIRECT"
                    size="small"
                    sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Typography variant="body2">
                    👥 {liveSessions[0].participants_count} participants
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4} textAlign="right">
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                sx={{
                  background: 'white',
                  color: '#764ba2',
                  '&:hover': { background: 'rgba(255,255,255,0.9)' }
                }}
                onClick={() => joinLiveSession(liveSessions[0].id)}
              >
                Rejoindre
              </Button>
            </Grid>
          </Grid>
        </LiveSessionCard>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {tab.label}
                  {tab.count !== undefined && (
                    <Badge
                      badgeContent={tab.count}
                      color="primary"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Subjects Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {classData.subjects?.map(subject => (
            <Grid item xs={12} sm={6} md={4} key={subject.id}>
              <SubjectCard onClick={() => navigate(`/student/subject/${subject.id}`)}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>
                    <BookIcon />
                  </Avatar>
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  {subject.name}
                </Typography>
                
                {subject.teacher_name && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      {subject.teacher_name}
                    </Typography>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
                  <Button
                    size="small"
                    startIcon={<FolderIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/subject/${subject.id}?tab=courses`);
                    }}
                  >
                    Cours
                  </Button>
                  <Button
                    size="small"
                    startIcon={<AssignmentIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/subject/${subject.id}?tab=tests`);
                    }}
                  >
                    Tests
                  </Button>
                </Box>
              </SubjectCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Courses Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="600">
                📚 Cours disponibles
              </Typography>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Rechercher un cours..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
                <Button startIcon={<FilterIcon />} size="small">
                  Filtrer
                </Button>
              </Box>
            </Box>

            <List disablePadding>
              {[
                { id: 1, title: 'Introduction à l\'Algorithmique', teacher: 'Dr. Smith', date: '2024-01-15', files: 3 },
                { id: 2, title: 'Structures de données', teacher: 'Dr. Smith', date: '2024-01-18', files: 5 },
                { id: 3, title: 'Algorithmes de tri', teacher: 'Dr. Smith', date: '2024-01-22', files: 2 },
                { id: 4, title: 'Complexité algorithmique', teacher: 'Dr. Smith', date: '2024-01-25', files: 4 }
              ].map((course, index) => (
                <React.Fragment key={course.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderRadius: 1,
                      mb: 1
                    }}
                    secondaryAction={
                      <Box display="flex" gap={1}>
                        <IconButton size="small" onClick={() => downloadResource(course)}>
                          <DownloadIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => toast.info('Vue détaillée')}>
                          <ViewIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <FolderIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="600">
                          {course.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            👨‍🏫 {course.teacher} • 📅 {new Date(course.date).toLocaleDateString('fr-FR')}
                          </Typography>
                          <Chip
                            label={`${course.files} fichiers`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        </>
                      }
                    />
                  </ListItem>
                  {index < 3 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Live Sessions Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {liveSessions.map(session => (
            <Grid item xs={12} md={6} key={session.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="600" gutterBottom>
                        {session.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        📚 {session.subject?.name} • 👨‍🏫 {session.teacher}
                      </Typography>
                    </Box>
                    <Chip
                      label={session.is_active ? 'EN DIRECT' : 'TERMINÉE'}
                      color={session.is_active ? 'error' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={3}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <PeopleIcon fontSize="small" />
                        <Typography variant="body2">
                          {session.participants_count || 0} participants
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TimeIcon fontSize="small" />
                        <Typography variant="body2">
                          {new Date(session.start_time).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant={session.is_active ? 'contained' : 'outlined'}
                      startIcon={session.is_active ? <PlayIcon /> : <ViewIcon />}
                      onClick={() => session.is_active ? joinLiveSession(session.id) : toast.info('Voir l\'enregistrement')}
                    >
                      {session.is_active ? 'Rejoindre' : 'Voir'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Chat Dialog */}
      <Dialog
        open={openChat}
        onClose={() => setOpenChat(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <ChatIcon />
            Chat de la classe - {classData.name}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <Box flex={1} p={2} sx={{ overflowY: 'auto' }}>
            {chatMessages.map(msg => (
              <Box
                key={msg.id}
                sx={{
                  mb: 2,
                  display: 'flex',
                  flexDirection: msg.isTeacher ? 'row' : 'row-reverse'
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: msg.isTeacher ? 'primary.main' : 'grey.100',
                    color: msg.isTeacher ? 'white' : 'text.primary',
                    borderRadius: 2,
                    borderTopLeftRadius: msg.isTeacher ? 2 : 12,
                    borderTopRightRadius: msg.isTeacher ? 12 : 2
                  }}
                >
                  <Typography variant="caption" display="block" mb={0.5}>
                    <strong>{msg.user}</strong> • {msg.time}
                  </Typography>
                  <Typography variant="body2">
                    {msg.message}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Input */}
          <Box p={2} sx={{ borderTop: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              placeholder="Écrivez votre message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={sendMessage} color="primary">
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setOpenChat(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Quick Actions */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => toast.info('Menu rapide')}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
}