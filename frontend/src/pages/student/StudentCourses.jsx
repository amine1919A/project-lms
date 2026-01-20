// src/pages/student/StudentChat.jsx - VERSION CORRIGÉE MUI v6
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Paper, TextField, Button, Avatar,
  Typography, Box, IconButton, List, ListItem,
  ListItemAvatar, ListItemText, Divider, Badge,
  Chip, Grid, Card, CardContent, InputAdornment,
  Tabs, Tab, alpha, styled
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  VideoCall as VideoCallIcon,
  Group as GroupIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Chat as ChatIcon
} from '@mui/icons-material';

const MessageBubble = styled(Paper)(({ theme, isme, isteacher }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: 18,
  maxWidth: '70%',
  backgroundColor: isme ? '#e53935' : isteacher ? '#1976d2' : '#f5f5f5',
  color: (isme || isteacher) ? 'white' : 'text.primary',
  borderTopRightRadius: isme ? 4 : 18,
  borderTopLeftRadius: isme ? 18 : 4,
  marginBottom: theme.spacing(1),
  alignSelf: isme ? 'flex-end' : 'flex-start',
}));

export default function StudentChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    loadContacts();
    loadInitialMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      // Pour les étudiants, ils doivent voir leurs enseignants ET leurs camarades
      // Utilisons une approche différente
      
      // 1. Charger l'utilisateur actuel pour connaître sa classe
      let userClass = null;
      try {
        const userRes = await api.get('/accounts/me/');
        if (userRes.data?.user?.enrolled_classes && userRes.data.user.enrolled_classes.length > 0) {
          userClass = userRes.data.user.enrolled_classes[0];
        }
      } catch (error) {
        console.log("Erreur chargement info utilisateur:", error);
      }

      // 2. Données simulées car les endpoints API ne sont pas accessibles
      // ENSEIGNANTS - Données simulées
      const simulatedTeachers = [
        { 
          id: 1, 
          username: 'Dr. Smith', 
          email: 'smith@iteam.com', 
          isOnline: true, 
          specialty: 'Algorithmique',
          avatarColor: '#1976d2'
        },
        { 
          id: 2, 
          username: 'Prof. Johnson', 
          email: 'johnson@iteam.com', 
          isOnline: false, 
          specialty: 'Base de Données',
          avatarColor: '#1976d2'
        },
        { 
          id: 3, 
          username: 'Prof. Martin', 
          email: 'martin@iteam.com', 
          isOnline: true, 
          specialty: 'Mathématiques',
          avatarColor: '#1976d2'
        },
        { 
          id: 4, 
          username: 'Dr. Williams', 
          email: 'williams@iteam.com', 
          isOnline: true, 
          specialty: 'Programmation Web',
          avatarColor: '#1976d2'
        },
      ];

      setTeachers(simulatedTeachers);

      // ÉTUDIANTS - Données simulées
      const simulatedStudents = [
        { 
          id: 5, 
          username: 'Ahmed Benali', 
          email: 'ahmed@iteam.com', 
          isOnline: true, 
          class: userClass?.name || 'ING1 Info',
          avatarColor: '#4caf50'
        },
        { 
          id: 6, 
          username: 'Fatima Zahra', 
          email: 'fatima@iteam.com', 
          isOnline: true, 
          class: userClass?.name || 'ING1 Info',
          avatarColor: '#4caf50'
        },
        { 
          id: 7, 
          username: 'Karim El Mansouri', 
          email: 'karim@iteam.com', 
          isOnline: false, 
          class: userClass?.name || 'ING1 Info',
          avatarColor: '#4caf50'
        },
        { 
          id: 8, 
          username: 'Sarah Cohen', 
          email: 'sarah@iteam.com', 
          isOnline: true, 
          class: userClass?.name || 'ING1 Info',
          avatarColor: '#4caf50'
        },
      ];

      setStudents(simulatedStudents);

      // GROUPES - Données simulées
      setGroups([
        { 
          id: 1, 
          name: `Classe ${userClass?.name || 'ING1 Info'}`, 
          members: 25, 
          unread: 3,
          avatarColor: '#9c27b0'
        },
        { 
          id: 2, 
          name: 'Groupe Algorithmique', 
          members: 12, 
          unread: 1,
          avatarColor: '#9c27b0'
        },
        { 
          id: 3, 
          name: 'Projet Base de Données', 
          members: 4, 
          unread: 0,
          avatarColor: '#9c27b0'
        },
        { 
          id: 4, 
          name: 'Équipe Programmation', 
          members: 6, 
          unread: 2,
          avatarColor: '#9c27b0'
        },
      ]);

    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      
      // Fallback complet avec données simulées
      setTeachers([
        { id: 1, username: 'Dr. Smith', email: 'smith@iteam.com', isOnline: true, specialty: 'Algorithmique', avatarColor: '#1976d2' },
        { id: 2, username: 'Prof. Johnson', email: 'johnson@iteam.com', isOnline: false, specialty: 'Base de Données', avatarColor: '#1976d2' },
      ]);
      setStudents([
        { id: 3, username: 'Ahmed Benali', email: 'ahmed@iteam.com', isOnline: true, class: 'ING1 Info', avatarColor: '#4caf50' },
        { id: 4, username: 'Fatima Zahra', email: 'fatima@iteam.com', isOnline: true, class: 'ING1 Info', avatarColor: '#4caf50' },
      ]);
      setGroups([
        { id: 1, name: 'Classe ING1 Info', members: 25, unread: 3, avatarColor: '#9c27b0' },
        { id: 2, name: 'Groupe Algorithmique', members: 12, unread: 1, avatarColor: '#9c27b0' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialMessages = () => {
    // Messages initiaux simulés
    setMessages([
      {
        id: 1,
        sender: 'Dr. Smith',
        message: 'Bonjour, avez-vous des questions sur le cours d\'algorithmique ?',
        time: '10:30',
        isTeacher: true,
        unread: false
      },
      {
        id: 2,
        sender: 'Moi',
        message: 'Oui, je ne comprends pas l\'exercice 3 du TD',
        time: '10:32',
        isTeacher: false,
        unread: false
      },
      {
        id: 3,
        sender: 'Dr. Smith',
        message: 'Je vais expliquer lors de la prochaine session. En attendant, vérifiez la section 2.4 du cours.',
        time: '10:33',
        isTeacher: true,
        unread: false
      },
      {
        id: 4,
        sender: 'Ahmed Benali',
        message: 'Salut, tu as compris l\'exercice 2 ?',
        time: '14:20',
        isTeacher: false,
        unread: true
      },
      {
        id: 5,
        sender: 'Prof. Johnson',
        message: 'Le devoir de base de données est à rendre vendredi.',
        time: '09:15',
        isTeacher: true,
        unread: false
      },
      {
        id: 6,
        sender: 'Moi',
        message: 'D\'accord, merci pour l\'information !',
        time: '09:16',
        isTeacher: false,
        unread: false
      }
    ]);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMsg = {
      id: messages.length + 1,
      sender: 'Moi',
      message: newMessage,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isTeacher: false,
      unread: false
    };
    
    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
    
    // Simuler une réponse automatique
    setTimeout(() => {
      if (selectedChat?.role === 'teacher') {
        const reply = {
          id: messages.length + 2,
          sender: selectedChat.name,
          message: 'Merci pour votre message. Je vous répondrai dès que possible.',
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isTeacher: true,
          unread: false
        };
        setMessages(prev => [...prev, reply]);
      } else if (selectedChat?.role === 'student') {
        const reply = {
          id: messages.length + 2,
          sender: selectedChat.name,
          message: 'Je viens de voir votre message. On en parle en classe ?',
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isTeacher: false,
          unread: false
        };
        setMessages(prev => [...prev, reply]);
      }
    }, 1000);
  };

  const startVideoCall = (user) => {
    toast.info(`Appel vidéo avec ${user.username || user.name}`);
  };

  const renderContacts = () => {
    const allContacts = [];
    
    // Filtrage basé sur le terme de recherche
    const filterFn = (contact) => {
      const searchLower = searchTerm.toLowerCase();
      return contact.username?.toLowerCase().includes(searchLower) ||
             contact.specialty?.toLowerCase().includes(searchLower) ||
             contact.class?.toLowerCase().includes(searchLower) ||
             contact.name?.toLowerCase().includes(searchLower);
    };

    switch (activeTab) {
      case 0: // Enseignants
        const filteredTeachers = teachers.filter(filterFn);
        return filteredTeachers.map(teacher => (
          <ListItem
            key={teacher.id}
            onClick={() => setSelectedChat({
              id: teacher.id,
              name: teacher.username,
              role: 'teacher',
              isOnline: teacher.isOnline,
              info: teacher.specialty || 'Enseignant',
              avatarColor: teacher.avatarColor
            })}
            sx={{
              borderRadius: 2,
              mb: 1,
              cursor: 'pointer',
              backgroundColor: selectedChat?.id === teacher.id ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            <ListItemAvatar>
              <Badge
                color="success"
                variant="dot"
                invisible={!teacher.isOnline}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right'
                }}
              >
                <Avatar sx={{ bgcolor: teacher.avatarColor || '#1976d2' }}>
                  {teacher.username?.charAt(0) || 'T'}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" fontWeight="600">
                    {teacher.username}
                  </Typography>
                  {teacher.isOnline && (
                    <Chip 
                      label="En ligne" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  {teacher.specialty || 'Enseignant'}
                </Typography>
              }
            />
          </ListItem>
        ));

      case 1: // Étudiants
        const filteredStudents = students.filter(filterFn);
        return filteredStudents.map(student => (
          <ListItem
            key={student.id}
            onClick={() => setSelectedChat({
              id: student.id,
              name: student.username,
              role: 'student',
              isOnline: student.isOnline,
              info: student.class || 'Étudiant',
              avatarColor: student.avatarColor
            })}
            sx={{
              borderRadius: 2,
              mb: 1,
              cursor: 'pointer',
              backgroundColor: selectedChat?.id === student.id ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.04)'
              }
            }}
          >
            <ListItemAvatar>
              <Badge
                color="success"
                variant="dot"
                invisible={!student.isOnline}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right'
                }}
              >
                <Avatar sx={{ bgcolor: student.avatarColor || '#4caf50' }}>
                  {student.username?.charAt(0) || 'E'}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" fontWeight="600">
                    {student.username}
                  </Typography>
                  {student.isOnline && (
                    <Chip 
                      label="En ligne" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  {student.class || 'Étudiant'}
                </Typography>
              }
            />
          </ListItem>
        ));

      case 2: // Groupes
        const filteredGroups = groups.filter(filterFn);
        return filteredGroups.map(group => (
          <ListItem
            key={group.id}
            onClick={() => setSelectedChat({
              id: group.id,
              name: group.name,
              role: 'group',
              members: group.members,
              info: `${group.members} membres`,
              avatarColor: group.avatarColor
            })}
            sx={{
              borderRadius: 2,
              mb: 1,
              cursor: 'pointer',
              backgroundColor: selectedChat?.id === group.id ? 'rgba(156, 39, 176, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(156, 39, 176, 0.04)'
              }
            }}
          >
            <ListItemAvatar>
              <Badge
                badgeContent={group.unread}
                color="error"
              >
                <Avatar sx={{ bgcolor: group.avatarColor || '#9c27b0' }}>
                  <GroupIcon />
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" fontWeight="600">
                    {group.name}
                  </Typography>
                  {group.unread > 0 && (
                    <Chip 
                      label={`${group.unread} nouveau(x)`} 
                      size="small" 
                      color="error"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  {group.members} membres
                </Typography>
              }
            />
          </ListItem>
        ));

      default:
        return null;
    }
  };

  const filteredMessages = selectedChat
    ? messages.filter(msg => 
        msg.sender === selectedChat.name || 
        msg.sender === 'Moi' || 
        (selectedChat.role === 'teacher' && msg.isTeacher) ||
        (selectedChat.role === 'student' && !msg.isTeacher && msg.sender !== 'Moi') ||
        (selectedChat.role === 'group')
      )
    : [];

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
          💬 Messagerie en temps réel
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Discutez avec vos enseignants et camarades de classe
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Liste des contacts */}
        <Grid item size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Recherche */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  placeholder="Rechercher un contact..."
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
              </Box>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label="Enseignants" />
                <Tab label="Étudiants" />
                <Tab label="Groupes" />
              </Tabs>

              {/* Liste des contacts */}
              <List sx={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <Typography color="textSecondary">
                      Chargement des contacts...
                    </Typography>
                  </Box>
                ) : renderContacts()}
              </List>

              {/* Quick Actions */}
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<VideoCallIcon />}
                  onClick={() => navigate('/student/live-sessions')}
                >
                  Sessions Live
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Zone de chat */}
        <Grid item size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                {/* Header du chat */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Badge
                        color="success"
                        variant="dot"
                        invisible={!selectedChat.isOnline && selectedChat.role !== 'group'}
                      >
                        <Avatar sx={{ 
                          bgcolor: selectedChat.avatarColor || 
                                   (selectedChat.role === 'teacher' ? '#1976d2' : 
                                    selectedChat.role === 'group' ? '#9c27b0' : '#4caf50')
                        }}>
                          {selectedChat.role === 'group' ? 
                            <GroupIcon /> : selectedChat.name?.charAt(0) || 'U'}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {selectedChat.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {selectedChat.info}
                          {selectedChat.isOnline && selectedChat.role !== 'group' && ' • En ligne'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      {selectedChat.role !== 'group' && (
                        <IconButton 
                          onClick={() => startVideoCall(selectedChat)}
                          sx={{ mr: 1 }}
                        >
                          <VideoCallIcon />
                        </IconButton>
                      )}
                      <IconButton>
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                {/* Messages */}
                <Box sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}>
                  {filteredMessages.length === 0 ? (
                    <Box sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'text.secondary'
                    }}>
                      <Typography variant="h6" gutterBottom>
                        Aucun message
                      </Typography>
                      <Typography variant="body2">
                        Envoyez votre premier message à {selectedChat.name}
                      </Typography>
                    </Box>
                  ) : (
                    filteredMessages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        isme={msg.sender === 'Moi'}
                        isteacher={msg.isTeacher && msg.sender !== 'Moi'}
                      >
                        <Typography variant="caption" display="block" mb={0.5}>
                          <strong>{msg.sender}</strong> • {msg.time}
                          {msg.unread && <Chip label="Nouveau" size="small" sx={{ ml: 1 }} />}
                        </Typography>
                        <Typography variant="body1">
                          {msg.message}
                        </Typography>
                      </MessageBubble>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box display="flex" gap={1} alignItems="center">
                    <IconButton onClick={() => fileInputRef.current?.click()}>
                      <AttachFileIcon />
                    </IconButton>
                    <IconButton>
                      <EmojiIcon />
                    </IconButton>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          toast.info(`Fichier "${e.target.files[0]?.name}" sélectionné`);
                        }
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      size="small"
                      variant="outlined"
                      multiline
                      maxRows={3}
                    />
                    
                    <Button
                      variant="contained"
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      startIcon={<SendIcon />}
                      sx={{ 
                        minWidth: 'auto',
                        bgcolor: '#e53935',
                        '&:hover': { bgcolor: '#c62828' },
                        '&.Mui-disabled': {
                          bgcolor: 'rgba(0, 0, 0, 0.12)'
                        }
                      }}
                    >
                      Envoyer
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 3 
              }}>
                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: '#e53935' }}>
                  <ChatIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom align="center">
                  💬 Bienvenue sur la messagerie
                </Typography>
                <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 3 }}>
                  Sélectionnez un contact pour commencer à discuter
                </Typography>
                
                <Grid container spacing={2} sx={{ maxWidth: 500 }}>
                  <Grid item size={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PersonIcon />}
                      onClick={() => {
                        if (teachers.length > 0) {
                          setSelectedChat({
                            id: teachers[0].id,
                            name: teachers[0].username,
                            role: 'teacher',
                            isOnline: teachers[0].isOnline,
                            info: teachers[0].specialty || 'Enseignant',
                            avatarColor: teachers[0].avatarColor
                          });
                        } else {
                          toast.info("Aucun enseignant disponible");
                        }
                      }}
                    >
                      Contacter un enseignant
                    </Button>
                  </Grid>
                  <Grid item size={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<SchoolIcon />}
                      onClick={() => {
                        if (students.length > 0) {
                          setSelectedChat({
                            id: students[0].id,
                            name: students[0].username,
                            role: 'student',
                            isOnline: students[0].isOnline,
                            info: students[0].class || 'Étudiant',
                            avatarColor: students[0].avatarColor
                          });
                        } else {
                          toast.info("Aucun étudiant disponible");
                        }
                      }}
                    >
                      Discuter avec un étudiant
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}