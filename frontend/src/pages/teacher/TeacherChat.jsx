// src/pages/teacher/TeacherChat.jsx - VERSION CORRIGÉE COMPLÈTE
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api, { safeApiCall } from '../../services/api';
import {
  Container, Paper, TextField, Button, Avatar,
  Typography, Box, IconButton, List, ListItem,
  ListItemAvatar, ListItemText, Badge, Chip,
  Grid, Card, CardContent, InputAdornment,
  Tabs, Tab, CircularProgress, Accordion,
  AccordionSummary, AccordionDetails,
  Tooltip, Divider, alpha,
  useTheme, useMediaQuery
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  VideoCall as VideoCallIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Chat as ChatIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Class as ClassIcon,
  Subject as SubjectIcon,
  EmojiEmotions as EmojiIcon,
  InsertPhoto as ImageIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Message as MessageIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';

export default function TeacherChat() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // ============================================
  // ÉTATS DU COMPOSANT
  // ============================================
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState({
    rooms: true,
    messages: false,
    contacts: true,
    classes: true,
    subjects: true
  });
  
  const [contacts, setContacts] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState('rooms');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClasses, setExpandedClasses] = useState([]);
  const [file, setFile] = useState(null);
  const [availableContacts, setAvailableContacts] = useState([]);
  
  const messagesEndRef = useRef();
  const fileInputRef = useRef();
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    loadTeacherData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============================================
  // FONCTIONS DE CHARGEMENT - CORRIGÉES
  // ============================================
  const loadTeacherData = async () => {
    console.log('👨‍🏫 Chargement données enseignant...');
    setLoading({ rooms: true, contacts: true, classes: true, subjects: true, messages: false });
    
    try {
      // 1. Charger les salles de chat existantes
      const { data: roomsData, error: roomsError } = await safeApiCall(
        () => api.get('/chat/rooms/my_chats/'),
        []
      );
      
      if (Array.isArray(roomsData)) {
        setRooms(roomsData);
        console.log(`📨 ${roomsData.length} salles chargées`);
      }
      
      // 2. Charger les classes enseignées (Nouvelle API)
      const { data: classesData } = await safeApiCall(
        () => api.get('/classes/classes/'),
        []
      );
      
      if (classesData?.results) {
        const myClasses = classesData.results.filter(cls => 
          cls.subjects?.some(subj => subj.teacher === currentUser.id)
        );
        setTeacherClasses(myClasses);
        console.log(`🏫 ${myClasses.length} classes enseignées`);
        
        // Charger les étudiants de ces classes
        await loadStudentsFromClasses(myClasses);
      }
      
      // 3. Charger les matières enseignées
      const { data: subjectsData } = await safeApiCall(
        () => api.get('/classes/subjects/'),
        []
      );
      
      if (Array.isArray(subjectsData)) {
        const mySubjects = subjectsData.filter(subject => 
          subject.teacher === currentUser.id
        );
        setTeacherSubjects(mySubjects);
        console.log(`📚 ${mySubjects.length} matières enseignées`);
        
        // Créer automatiquement les groupes pour les matières
        if (mySubjects.length > 0) {
          await createMissingSubjectGroups(mySubjects, roomsData || []);
        }
      }
      
      // 4. Charger les contacts disponibles
      await loadAvailableContacts();
      
      toast.success('✅ Données chargées avec succès');
      
    } catch (error) {
      console.error('❌ Erreur chargement données enseignant:', error);
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading({ rooms: false, contacts: false, classes: false, subjects: false, messages: false });
    }
  };

  // Charger les étudiants des classes enseignées
  const loadStudentsFromClasses = async (classes) => {
    const allStudents = [];
    
    for (const classItem of classes) {
      try {
        // Route API pour récupérer les étudiants d'une classe
        const { data: studentsData } = await safeApiCall(
          () => api.get(`/classes/classes/${classItem.id}/students/`),
          classItem.students || []
        );
        
        if (Array.isArray(studentsData)) {
          studentsData.forEach(student => {
            allStudents.push({
              id: student.id,
              username: student.username,
              first_name: student.first_name,
              last_name: student.last_name,
              full_name: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username,
              email: student.email,
              role: 'student',
              class_id: classItem.id,
              class_name: classItem.name,
              avatar_color: generateColor(student.id),
              online: false
            });
          });
        } else if (classItem.students) {
          // Fallback: utiliser les données de la classe
          classItem.students.forEach(student => {
            allStudents.push({
              id: student.id,
              username: student.username,
              full_name: student.full_name || student.username,
              email: student.email,
              role: 'student',
              class_id: classItem.id,
              class_name: classItem.name,
              avatar_color: generateColor(student.id),
              online: false
            });
          });
        }
      } catch (error) {
        console.warn(`⚠️ Impossible de charger les étudiants de ${classItem.name}:`, error);
      }
    }
    
    console.log(`👥 ${allStudents.length} étudiants chargés`);
    setContacts(allStudents);
    return allStudents;
  };

  // Charger les contacts disponibles depuis l'API chat
  const loadAvailableContacts = async () => {
    try {
      const { data: contactsData } = await safeApiCall(
        () => api.get('/chat/rooms/available_contacts/'),
        []
      );
      
      if (contactsData?.contacts) {
        setAvailableContacts(contactsData.contacts);
        console.log(`📞 ${contactsData.contacts.length} contacts disponibles`);
      }
    } catch (error) {
      console.warn('⚠️ Impossible de charger les contacts:', error);
    }
  };

  // Créer les groupes de matière manquants
  const createMissingSubjectGroups = async (subjects, existingRooms) => {
    const createdGroups = [];
    
    for (const subject of subjects) {
      try {
        // Vérifier si un groupe existe déjà pour cette matière
        const groupExists = existingRooms.some(room => 
          room.room_type === 'group_subject' && 
          room.subject_related === subject.id
        );
        
        if (!groupExists && subject.class_assigned) {
          console.log(`➕ Création groupe pour: ${subject.name}`);
          
          const response = await api.post('/chat/rooms/create_subject_group/', {
            subject_name: subject.name,
            class_id: subject.class_assigned,
            teacher_id: currentUser.id
          });
          
          if (response.data) {
            createdGroups.push(response.data);
            setRooms(prev => [response.data, ...prev]);
          }
        }
      } catch (error) {
        console.warn(`❌ Impossible de créer le groupe pour ${subject.name}:`, error);
      }
    }
    
    if (createdGroups.length > 0) {
      toast.success(`${createdGroups.length} groupe(s) de matière créé(s) automatiquement`);
    }
  };

  // ============================================
  // FONCTIONS DE MESSAGERIE
  // ============================================
  const loadRoomMessages = async (roomId) => {
    if (!roomId) return;
    
    setLoading(prev => ({ ...prev, messages: true }));
    
    try {
      const res = await api.get(`/chat/messages/room_messages/?room_id=${roomId}`);
      setMessages(res.data || []);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      if (error.response?.status === 403) {
        toast.error('Accès refusé à cette conversation');
      } else {
        toast.error('Impossible de charger les messages');
      }
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !file) {
      toast.warning('Veuillez écrire un message ou sélectionner un fichier');
      return;
    }
    
    if (!selectedRoom) {
      toast.error('Veuillez sélectionner une conversation');
      return;
    }
    
    const formData = new FormData();
    formData.append('room', selectedRoom.id);
    formData.append('content', newMessage);
    if (file) {
      formData.append('file', file);
    }
    
    try {
      const res = await api.post('/chat/messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      setFile(null);
      
      // Mettre à jour la dernière activité de la salle
      setRooms(prev =>
        prev.map(room =>
          room.id === selectedRoom.id
            ? { ...room, last_message: res.data, updated_at: new Date().toISOString() }
            : room
        )
      );
      
      toast.success('✅ Message envoyé');
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi du message';
      if (error.response?.status === 400) {
        errorMessage = 'Données invalides';
      } else if (error.response?.status === 403) {
        errorMessage = 'Accès refusé';
      } else if (!error.response) {
        errorMessage = 'Problème de connexion';
      }
      
      toast.error(errorMessage);
    }
  };

  const createPrivateChat = async (contact) => {
    try {
      const res = await api.post('/chat/rooms/create_private_chat/', {
        user_id: contact.id
      });
      
      setSelectedRoom(res.data);
      await loadRoomMessages(res.data.id);
      
      // Ajouter la nouvelle salle à la liste
      if (!rooms.some(room => room.id === res.data.id)) {
        setRooms(prev => [res.data, ...prev]);
      }
      
      toast.success(`✅ Conversation créée avec ${contact.full_name}`);
    } catch (error) {
      console.error('❌ Erreur création chat:', error);
      toast.error('Erreur lors de la création de la conversation');
    }
  };

  const createClassGroup = async (classItem) => {
    try {
      const res = await api.post('/chat/rooms/create_class_group/', {
        class_id: classItem.id,
        class_name: classItem.name
      });
      
      setSelectedRoom(res.data);
      await loadRoomMessages(res.data.id);
      
      // Ajouter la nouvelle salle à la liste
      if (!rooms.some(room => room.id === res.data.id)) {
        setRooms(prev => [res.data, ...prev]);
      }
      
      toast.success(`✅ Groupe "${classItem.name}" créé`);
    } catch (error) {
      console.error('❌ Erreur création groupe:', error);
      toast.error('Erreur lors de la création du groupe');
    }
  };

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================
  const generateColor = (seed) => {
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#795548'];
    if (!seed) return colors[0];
    let hash = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getRoomAvatar = (room) => {
    switch (room.room_type) {
      case 'private':
        return <PersonIcon />;
      case 'group_class':
        return <ClassIcon />;
      case 'group_subject':
        return <BookIcon />;
      default:
        return <GroupIcon />;
    }
  };

  const getRoomColor = (room) => {
    switch (room.room_type) {
      case 'private':
        return '#1976d2';
      case 'group_class':
        return '#4caf50';
      case 'group_subject':
        return '#9c27b0';
      default:
        return '#757575';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('❌ Le fichier ne doit pas dépasser 10MB');
        return;
      }
      setFile(selectedFile);
      toast.info(`📎 Fichier sélectionné: ${selectedFile.name}`);
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '';
    }
  };

  // ============================================
  // FILTRES ET LOGIQUE D'AFFICHAGE
  // ============================================
  const filterRoomsForTeacher = () => {
    // Pour l'enseignant: afficher toutes les salles où il a accès
    return rooms.filter(room => {
      // Afficher les conversations privées
      if (room.room_type === 'private') {
        return true;
      }
      
      // Afficher les groupes de classe où il enseigne
      if (room.room_type === 'group_class') {
        return teacherClasses.some(cls => cls.id === room.class_related);
      }
      
      // Afficher les groupes de matière qu'il enseigne
      if (room.room_type === 'group_subject') {
        return teacherSubjects.some(subj => subj.id === room.subject_related);
      }
      
      return false;
    });
  };

  const filteredRooms = filterRoomsForTeacher().filter(room =>
    room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.participants?.some(p => 
      p?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  const filteredContacts = contacts.filter(contact =>
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les étudiants par classe
  const groupedContacts = contacts.reduce((groups, contact) => {
    const className = contact.class_name || 'Non assigné';
    if (!groups[className]) {
      groups[className] = [];
    }
    groups[className].push(contact);
    return groups;
  }, {});

  // ============================================
  // COMPOSANTS DE RENDU
  // ============================================
  const renderChatHeader = () => {
    if (!selectedRoom) return null;
    
    const isPrivate = selectedRoom.room_type === 'private';
    const otherParticipant = isPrivate && selectedRoom.participants?.find(p => p.id !== currentUser.id);
    
    return (
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ 
            bgcolor: getRoomColor(selectedRoom),
            width: 50,
            height: 50
          }}>
            {getRoomAvatar(selectedRoom)}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="700" color="#000">
              {isPrivate && otherParticipant ? 
                otherParticipant.full_name || otherParticipant.username : 
                selectedRoom.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="textSecondary">
                {selectedRoom.participants_count || 0} participants
              </Typography>
              {selectedRoom.room_type !== 'private' && selectedRoom.class_details && (
                <Chip 
                  label={selectedRoom.class_details.name} 
                  size="small" 
                  icon={<ClassIcon />}
                  sx={{ height: 24, fontSize: '0.75rem' }}
                />
              )}
            </Box>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Appel vidéo">
            <IconButton sx={{ color: '#1976d2' }}>
              <VideoCallIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Plus d'options">
            <IconButton sx={{ color: '#1976d2' }}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  const renderMessageItem = (message) => {
    const isMe = message.sender === currentUser.id;
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMe ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            maxWidth: '85%',
            flexDirection: isMe ? 'row-reverse' : 'row'
          }}
        >
          {!isMe && (
            <Avatar sx={{ 
              width: 40, 
              height: 40,
              bgcolor: message.sender_details?.role === 'teacher' ? '#1976d2' : '#4caf50'
            }}>
              {message.sender_details?.username?.charAt(0) || 'U'}
            </Avatar>
          )}
          
          <Box sx={{ maxWidth: '100%' }}>
            {!isMe && (
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="caption" fontWeight="600" color="#000">
                  {message.sender_details?.full_name || message.sender_details?.username}
                </Typography>
                {message.sender_details?.role === 'teacher' && (
                  <Chip 
                    label="Enseignant" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            )}
            
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isMe ? '#1976d2' : '#f5f5f5',
                color: isMe ? 'white' : '#000',
                borderTopRightRadius: isMe ? 8 : 20,
                borderTopLeftRadius: isMe ? 20 : 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
              </Typography>
              
              {message.file && (
                <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AttachFileIcon fontSize="small" />
                    <Typography variant="caption" fontWeight="600">
                      {message.file_name}
                    </Typography>
                  </Box>
                </Box>
              )}
              
              <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
                {formatTime(message.created_at)}
              </Typography>
            </Paper>
          </Box>
          
          {isMe && (
            <Avatar sx={{ 
              width: 40, 
              height: 40,
              bgcolor: '#e91e63'
            }}>
              {currentUser.username?.charAt(0) || 'M'}
            </Avatar>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3, height: '100vh', bgcolor: '#fafafa' }}>
      {/* Header */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: 'white',
        p: 2,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/teacher/dashboard')}
            sx={{ 
              mb: 1,
              color: '#1976d2',
              fontWeight: '600',
              textTransform: 'none'
            }}
          >
            Retour au tableau de bord
          </Button>
          <Typography variant="h4" fontWeight="800" gutterBottom color="#000">
            💬 Messagerie - Enseignant
          </Typography>
          <Box display="flex" alignItems="center" gap={2} mt={0.5}>
            <Chip 
              icon={<ClassIcon />}
              label={`${teacherClasses.length} classes`}
              size="small"
              sx={{ 
                bgcolor: alpha('#4caf50', 0.1),
                color: '#4caf50',
                fontWeight: '600'
              }}
            />
            <Chip 
              icon={<PeopleIcon />}
              label={`${contacts.length} étudiants`}
              size="small"
              variant="outlined"
              sx={{ borderColor: '#ddd', color: '#666' }}
            />
            <Chip 
              icon={<SubjectIcon />}
              label={`${teacherSubjects.length} matières`}
              size="small"
              variant="outlined"
              sx={{ borderColor: '#ddd', color: '#666' }}
            />
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadTeacherData}
          variant="outlined"
          disabled={Object.values(loading).some(v => v)}
          sx={{ 
            borderRadius: 2,
            fontWeight: '600',
            textTransform: 'none',
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
              borderColor: '#1565c0',
              bgcolor: alpha('#1976d2', 0.04)
            }
          }}
        >
          Actualiser
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 180px)' }}>
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
              {/* Recherche */}
              <TextField
                fullWidth
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#666' }} />
                    </InputAdornment>
                  )
                }}
                size="small"
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#f5f5f5'
                  }
                }}
              />

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    },
                    '& .Mui-selected': {
                      color: '#1976d2'
                    }
                  }}
                >
                  <Tab label="Conversations" value="rooms" icon={<MessageIcon />} iconPosition="start" />
                  <Tab label="Étudiants" value="students" icon={<PeopleIcon />} iconPosition="start" />
                  <Tab label="Classes" value="classes" icon={<ClassIcon />} iconPosition="start" />
                </Tabs>
              </Box>

              {/* Contenu selon l'onglet */}
              {loading.rooms && activeTab === 'rooms' ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                  <CircularProgress size={60} thickness={4} sx={{ color: '#1976d2' }} />
                </Box>
              ) : activeTab === 'rooms' ? (
                <List sx={{ overflowY: 'auto', flex: 1, p: 1 }}>
                  {filteredRooms.length === 0 ? (
                    <Box textAlign="center" p={4}>
                      <Box sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: alpha('#1976d2', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        mx: 'auto'
                      }}>
                        <ChatIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                      </Box>
                      <Typography variant="body1" color="textSecondary">
                        {searchTerm ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                      </Typography>
                    </Box>
                  ) : (
                    filteredRooms.map(room => (
                      <ListItem
                        key={room.id}
                        button
                        selected={selectedRoom?.id === room.id}
                        onClick={async () => {
                          setSelectedRoom(room);
                          await loadRoomMessages(room.id);
                        }}
                        sx={{
                          borderRadius: 2,
                          mb: 1,
                          bgcolor: selectedRoom?.id === room.id ? alpha('#1976d2', 0.1) : 'transparent',
                          border: selectedRoom?.id === room.id ? `2px solid #1976d2` : 'none',
                          '&:hover': {
                            bgcolor: selectedRoom?.id === room.id ? alpha('#1976d2', 0.15) : '#f5f5f5'
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Badge
                            color="error"
                            badgeContent={room.unread_count > 0 ? room.unread_count : null}
                          >
                            <Avatar sx={{ 
                              bgcolor: getRoomColor(room),
                              width: 45,
                              height: 45
                            }}>
                              {getRoomAvatar(room)}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight="600" noWrap color="#000">
                              {room.name}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="textSecondary" noWrap>
                                {room.last_message?.content || 'Aucun message'}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                {room.room_type === 'private' && (
                                  <Chip label="Privé" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                )}
                                {room.room_type === 'group_class' && (
                                  <Chip label="Classe" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha('#4caf50', 0.1), color: '#4caf50' }} />
                                )}
                                {room.room_type === 'group_subject' && (
                                  <Chip label="Matière" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0' }} />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              ) : activeTab === 'students' ? (
                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                  {Object.keys(groupedContacts).length === 0 ? (
                    <Box textAlign="center" p={4}>
                      <Box sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: alpha('#4caf50', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        mx: 'auto'
                      }}>
                        <PeopleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
                      </Box>
                      <Typography variant="body1" color="textSecondary">
                        Aucun étudiant dans vos classes
                      </Typography>
                    </Box>
                  ) : (
                    Object.entries(groupedContacts).map(([className, students]) => (
                      <Accordion 
                        key={className}
                        expanded={expandedClasses.includes(className)}
                        onChange={() => {
                          setExpandedClasses(prev =>
                            prev.includes(className)
                              ? prev.filter(name => name !== className)
                              : [...prev, className]
                          );
                        }}
                        sx={{
                          mb: 1,
                          boxShadow: 'none',
                          border: '1px solid #eee',
                          '&:before': { display: 'none' }
                        }}
                      >
                        <AccordionSummary 
                          expandIcon={<ExpandMoreIcon />}
                          sx={{ 
                            bgcolor: alpha('#4caf50', 0.05),
                            borderRadius: 1
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <ClassIcon fontSize="small" sx={{ color: '#4caf50' }} />
                            <Typography variant="subtitle2" fontWeight="600">
                              {className}
                            </Typography>
                            <Chip 
                              label={`${students.length} étudiant(s)`} 
                              size="small" 
                              sx={{ 
                                height: 22,
                                fontSize: '0.7rem',
                                bgcolor: alpha('#4caf50', 0.1),
                                color: '#4caf50'
                              }} 
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          <List dense>
                            {students.map(student => (
                              <ListItem
                                key={student.id}
                                button
                                onClick={() => createPrivateChat(student)}
                                sx={{ 
                                  borderRadius: 1,
                                  mb: 0.5,
                                  '&:hover': {
                                    bgcolor: '#f5f5f5'
                                  }
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar sx={{ 
                                    bgcolor: student.avatar_color || generateColor(student.id),
                                    width: 40,
                                    height: 40,
                                    fontSize: '0.9rem'
                                  }}>
                                    {student.first_name?.charAt(0) || student.username?.charAt(0) || 'E'}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant="subtitle2" fontWeight="600">
                                      {student.full_name}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="textSecondary">
                                      {student.email}
                                    </Typography>
                                  }
                                />
                                <IconButton size="small" sx={{ color: '#1976d2' }}>
                                  <ChatIcon fontSize="small" />
                                </IconButton>
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  )}
                </Box>
              ) : activeTab === 'classes' ? (
                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                  {teacherClasses.length === 0 ? (
                    <Box textAlign="center" p={4}>
                      <Box sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: alpha('#ff9800', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        mx: 'auto'
                      }}>
                        <ClassIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                      </Box>
                      <Typography variant="body1" color="textSecondary">
                        Aucune classe assignée
                      </Typography>
                    </Box>
                  ) : (
                    teacherClasses.map(classItem => {
                      const subjectRooms = rooms.filter(room => 
                        room.room_type === 'group_subject' && 
                        room.subject_related && 
                        teacherSubjects.some(subj => 
                          subj.id === room.subject_related && 
                          subj.class_assigned === classItem.id
                        )
                      );
                      
                      return (
                        <Accordion 
                          key={classItem.id}
                          sx={{
                            mb: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '&:before': { display: 'none' }
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ bgcolor: '#ff9800', width: 45, height: 45 }}>
                                <ClassIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="700">
                                  {classItem.name}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                  <Chip 
                                    label={`${classItem.students_count || 0} étudiants`} 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ height: 22 }}
                                  />
                                  <Chip 
                                    label={`${subjectRooms.length} groupe(s)`} 
                                    size="small" 
                                    sx={{ 
                                      height: 22,
                                      bgcolor: alpha('#9c27b0', 0.1),
                                      color: '#9c27b0'
                                    }} 
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ mb: 2 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                startIcon={<GroupIcon />}
                                onClick={() => createClassGroup(classItem)}
                                sx={{ 
                                  mb: 2,
                                  bgcolor: '#4caf50',
                                  '&:hover': { bgcolor: '#388e3c' }
                                }}
                              >
                                Créer un groupe pour cette classe
                              </Button>
                              
                              <Divider sx={{ my: 2 }} />
                              
                              <Typography variant="subtitle2" gutterBottom fontWeight="600">
                                Groupes de matière ({subjectRooms.length})
                              </Typography>
                              
                              {subjectRooms.length === 0 ? (
                                <Typography variant="body2" color="textSecondary" sx={{ py: 1 }}>
                                  Aucun groupe de matière créé
                                </Typography>
                              ) : (
                                subjectRooms.map(room => (
                                  <ListItem
                                    key={room.id}
                                    button
                                    selected={selectedRoom?.id === room.id}
                                    onClick={async () => {
                                      setSelectedRoom(room);
                                      await loadRoomMessages(room.id);
                                    }}
                                    sx={{
                                      borderRadius: 1,
                                      mb: 1,
                                      bgcolor: selectedRoom?.id === room.id ? alpha('#9c27b0', 0.1) : 'transparent'
                                    }}
                                  >
                                    <ListItemAvatar>
                                      <Avatar sx={{ 
                                        bgcolor: '#9c27b0',
                                        width: 35,
                                        height: 35
                                      }}>
                                        <BookIcon fontSize="small" />
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Typography variant="subtitle2" fontWeight="600">
                                          {room.name}
                                        </Typography>
                                      }
                                      secondary={
                                        <Typography variant="caption" color="textSecondary">
                                          Groupe de matière
                                        </Typography>
                                      }
                                    />
                                    <IconButton size="small">
                                      <ChatIcon fontSize="small" />
                                    </IconButton>
                                  </ListItem>
                                ))
                              )}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })
                  )}
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* Zone de chat */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            {selectedRoom ? (
              <>
                {renderChatHeader()}

                {/* Messages */}
                <Box sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  p: 3,
                  bgcolor: '#fafafa',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {loading.messages ? (
                    <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                      <CircularProgress size={60} thickness={4} sx={{ color: '#1976d2' }} />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}>
                      <Box sx={{ 
                        width: 120, 
                        height: 120, 
                        borderRadius: '50%', 
                        bgcolor: alpha('#1976d2', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3
                      }}>
                        <MessageIcon sx={{ fontSize: 60, color: '#1976d2' }} />
                      </Box>
                      <Typography variant="h5" fontWeight="700" gutterBottom>
                        Aucun message
                      </Typography>
                      <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 400, mb: 3 }}>
                        Commencez la conversation avec vos étudiants
                      </Typography>
                      <Button 
                        variant="outlined" 
                        onClick={() => document.querySelector('input[placeholder*="message"]')?.focus()}
                        startIcon={<SendIcon />}
                        sx={{ 
                          borderColor: '#1976d2',
                          color: '#1976d2',
                          borderRadius: 2,
                          px: 3,
                          fontWeight: '600'
                        }}
                      >
                        Écrire un message
                      </Button>
                    </Box>
                  ) : (
                    messages.map(message => renderMessageItem(message))
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input */}
                <Box sx={{ 
                  p: 2, 
                  borderTop: 1, 
                  borderColor: 'divider',
                  bgcolor: 'white'
                }}>
                  {file && (
                    <Paper 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        mb: 2,
                        p: 1.5,
                        bgcolor: alpha('#1976d2', 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha('#1976d2', 0.2)}`
                      }}
                    >
                      <AttachFileIcon sx={{ color: '#1976d2' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="600">
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => setFile(null)}
                        sx={{ color: '#f44336' }}
                      >
                        ✕
                      </IconButton>
                    </Paper>
                  )}
                  
                  <Box display="flex" gap={1.5} alignItems="center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                    <IconButton 
                      onClick={() => fileInputRef.current.click()}
                      sx={{ color: '#1976d2' }}
                    >
                      <AttachFileIcon />
                    </IconButton>
                    <IconButton sx={{ color: '#1976d2' }}>
                      <EmojiIcon />
                    </IconButton>
                    
                    <TextField
                      fullWidth
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      size="small"
                      variant="outlined"
                      multiline
                      maxRows={4}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: '#f5f5f5'
                        }
                      }}
                    />
                    
                    <Button
                      variant="contained"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() && !file}
                      startIcon={<SendIcon />}
                      sx={{ 
                        minWidth: 'auto',
                        px: 3,
                        bgcolor: '#1976d2',
                        '&:hover': { bgcolor: '#1565c0' },
                        '&:disabled': { bgcolor: '#999' }
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
                p: 4
              }}>
                <Box sx={{ 
                  width: 140, 
                  height: 140, 
                  borderRadius: '50%', 
                  bgcolor: alpha('#1976d2', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3
                }}>
                  <DashboardIcon sx={{ fontSize: 70, color: '#1976d2' }} />
                </Box>
                <Typography variant="h4" fontWeight="800" gutterBottom>
                  Panneau de messagerie
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ 
                  mb: 4, 
                  textAlign: 'center',
                  maxWidth: 500
                }}>
                  Sélectionnez une conversation ou créez un nouveau groupe pour communiquer avec vos étudiants
                </Typography>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveTab('students')}
                    startIcon={<PeopleIcon />}
                    sx={{ 
                      bgcolor: '#4caf50',
                      '&:hover': { bgcolor: '#388e3c' }
                    }}
                  >
                    Voir les étudiants
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveTab('classes')}
                    startIcon={<ClassIcon />}
                    sx={{ 
                      borderColor: '#1976d2',
                      color: '#1976d2'
                    }}
                  >
                    Voir les classes
                  </Button>
                </Box>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}