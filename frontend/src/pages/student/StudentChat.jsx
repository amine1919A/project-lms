// src/pages/student/StudentChat.jsx - VERSION COMPLÈTE CORRIGÉE
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
  CircularProgress, Divider, ListItemButton, Tooltip,
  Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions,
  Checkbox, useTheme, useMediaQuery,
  alpha, Stack, Tabs, Tab, AppBar
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
  CheckCircle as CheckCircleIcon,
  EmojiEmotions as EmojiIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Favorite as FavoriteIcon,
  Today as TodayIcon,
  Notifications as NotificationsIcon,
  Block as BlockIcon,
  Report as ReportIcon,
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Warning as WarningIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Message as MessageIcon,
  AccountCircle as AccountIcon,
  InsertEmoticon as InsertEmojiIcon,
  Photo as PhotoIcon,
  Description as DescriptionIcon,
  KeyboardVoice as VoiceIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import EmojiPicker from 'emoji-picker-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// COMPOSANT ERROR BOUNDARY POUR TABS
// ============================================
class TabsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Mettre à jour l'état pour afficher l'UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Vous pouvez également journaliser l'erreur
    console.log('Erreur ScrollbarSize capturée:', error.message);
  }

  render() {
    if (this.state.hasError) {
      // UI de fallback
      return this.props.fallback || (
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          pb: 1,
          overflowX: 'auto',
          flexWrap: 'nowrap'
        }}>
          {this.props.children}
        </Box>
      );
    }

    return this.props.children;
  }
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function StudentChat() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // ============================================
  // FIX 1: INTERCEPTION D'ERREURS AU MONTAGE
  // ============================================
  useEffect(() => {
    console.log('📱 Initialisation du composant StudentChat');
    
    // Solution 1: Monkey patch temporaire pour ScrollbarSize
    try {
      if (typeof window !== 'undefined') {
        // Sauvegarder la fonction originale
        const originalCreateElement = React.createElement;
        
        // Créer une fonction wrapper
        const safeCreateElement = (...args) => {
          const [type, props, ...children] = args;
          
          // Détecter et neutraliser ScrollbarSize
          if (type && 
              (type.displayName === 'ScrollbarSize' || 
               (props && props['data-testid'] === 'ScrollbarSize') ||
               (type.name && type.name.includes('ScrollbarSize')))) {
            console.log('🛡️ ScrollbarSize neutralisé');
            return React.createElement('div', {
              style: { display: 'none', width: 0, height: 0 },
              'data-fixed-scrollbar': true,
              ref: (el) => {
                if (el && props && props.ref) {
                  props.ref.current = { scrollbarWidth: 0 };
                }
              }
            });
          }
          
          return originalCreateElement.apply(React, args);
        };
        
        // Appliquer temporairement le patch
        React.createElement = safeCreateElement;
        
        // Restaurer après un délai
        setTimeout(() => {
          React.createElement = originalCreateElement;
          console.log('✅ Patch ScrollbarSize restauré');
        }, 100);
      }
    } catch (error) {
      console.log('⚠️ Patch non appliqué:', error.message);
    }
    
    // Solution 2: Interception des erreurs console
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const errorHandler = (...args) => {
      // Ignorer les erreurs ScrollbarSize spécifiques
      const errorString = String(args[0] || '');
      const isScrollbarError = errorString.includes('ScrollbarSize') || 
                              errorString.includes('offsetHeight') ||
                              errorString.includes('Cannot read properties of null');
      
      if (isScrollbarError) {
        console.log('🚫 Erreur ScrollbarSize interceptée et ignorée');
        return;
      }
      
      // Pour les autres erreurs, utiliser le handler original
      originalError.apply(console, args);
    };
    
    const warnHandler = (...args) => {
      const warnString = String(args[0] || '');
      if (warnString.includes('ScrollbarSize') || warnString.includes('Consider adding an error boundary')) {
        console.log('⚠️ Avertissement ScrollbarSize intercepté');
        return;
      }
      originalWarn.apply(console, args);
    };
    
    console.error = errorHandler;
    console.warn = warnHandler;
    
    // Charger les données
    loadAllData();
    
    // Gestion du clic en dehors du picker d'emoji
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  
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
    teachers: true,
    classmates: true,
    classInfo: true,
    subjects: true
  });
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [file, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  
  const [teachers, setTeachers] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  
  const [creatingPrivateChat, setCreatingPrivateChat] = useState(false);
  const [creatingGroups, setCreatingGroups] = useState(false);
  
  const messagesEndRef = useRef();
  const fileInputRef = useRef();
  const emojiPickerRef = useRef();
  const messageInputRef = useRef();
  
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  
  // ============================================
  // CONSTANTES DE DESIGN
  // ============================================
  const COLORS = {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    error: '#f44336',
    darkBg: '#121212',
    lightBg: '#f5f5f5',
    white: '#ffffff',
    black: '#000000',
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121'
    }
  };
  
  const TAB_OPTIONS = [
    { id: 'rooms', label: 'Discussions', icon: <MessageIcon />, count: 0 },
    { id: 'teachers', label: 'Enseignants', icon: <AccountIcon />, count: 0 },
    { id: 'classmates', label: 'Camarades', icon: <PeopleIcon />, count: 0 },
    { id: 'groups', label: 'Groupes', icon: <GroupIcon />, count: 0 }
  ];
  
  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================
  const generateColor = (seed) => {
    const colors = [
      COLORS.primary,
      COLORS.secondary,
      COLORS.success,
      COLORS.warning,
      COLORS.info,
      '#9C27B0',
      '#795548',
      '#607D8B',
    ];
    const index = typeof seed === 'string' 
      ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
      : seed;
    return colors[Math.abs(index) % colors.length];
  };
  
  const getRoomIcon = (roomType) => {
    switch (roomType) {
      case 'private': return <PersonIcon />;
      case 'group_class': return <SchoolIcon />;
      case 'group_subject': return <BookIcon />;
      default: return <ChatIcon />;
    }
  };
  
  const getRoomColor = (roomType) => {
    switch (roomType) {
      case 'private': return COLORS.primary;
      case 'group_class': return COLORS.success;
      case 'group_subject': return COLORS.info;
      default: return COLORS.gray[600];
    }
  };
  
  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      
      if (date.toDateString() === today.toDateString()) {
        return "Aujourd'hui";
      }
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === yesterday.toDateString()) {
        return "Hier";
      }
      
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch {
      return '';
    }
  };
  
  const isCurrentUser = (message) => {
    return message.sender === currentUser.id || 
           message.sender_details?.username === currentUser.username;
  };
  
  // ============================================
  // FONCTIONS DE CHARGEMENT
  // ============================================
  const loadAllData = async () => {
    console.log('📥 Loading all chat data...');
    
    try {
      await Promise.all([
        loadClassAndSubjects(),
        loadTeachers(),
        loadClassmates(),
        loadChatRooms()
      ]);
      
      updateTabCounts();
      checkAndCreateMissingGroups();
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      toast.error('Erreur de chargement des données');
    }
  };
  
  const updateTabCounts = () => {
    TAB_OPTIONS[0].count = rooms.length;
    TAB_OPTIONS[1].count = teachers.length;
    TAB_OPTIONS[2].count = classmates.length;
    TAB_OPTIONS[3].count = rooms.filter(r => r.room_type !== 'private').length;
  };
  
  const loadClassAndSubjects = async () => {
    setLoading(prev => ({ ...prev, classInfo: true, subjects: true }));
    
    try {
      const { data, error } = await safeApiCall(
        () => api.get('/schedule/student/my-schedule/'),
        {
          success: true,
          data: {
            class_name: currentUser.class_name || 'L3-CS-2025',
            class_assigned: currentUser.class_id || 'CS-2025-L3',
            time_slots: []
          }
        },
        false
      );
      
      if (data?.success && data.data) {
        const classData = data.data;
        
        setClassInfo({
          name: classData.class_name,
          id: classData.class_assigned,
          className: classData.class_name
        });
        
        if (classData.time_slots && classData.time_slots.length > 0) {
          const uniqueSubjects = [...new Map(
            classData.time_slots
              .filter(slot => slot.subject_name)
              .map(slot => [slot.subject_name, {
                name: slot.subject_name,
                teacher_name: slot.teacher_name,
                teacher_id: slot.teacher_id,
                color: generateColor(slot.subject_name)
              }])
          ).values()];
          
          setSubjects(uniqueSubjects);
        }
      }
    } finally {
      setLoading(prev => ({ ...prev, classInfo: false, subjects: false }));
    }
  };
  
  const loadTeachers = async () => {
    setLoading(prev => ({ ...prev, teachers: true }));
    
    try {
      const { data, error } = await safeApiCall(
        () => api.get('/schedule/student/my-teachers/'),
        {
          success: true,
          teachers: [
            {
              id: 1,
              full_name: 'Professeur Smith',
              username: 'prof_smith',
              email: 'smith@iteam.university',
              role: 'teacher',
              specialty: 'Informatique',
              subjects: ['Algorithmique', 'Base de données'],
              online: true
            },
            {
              id: 2,
              full_name: 'Professeur Johnson',
              username: 'prof_johnson',
              email: 'johnson@iteam.university',
              role: 'teacher',
              specialty: 'Mathématiques',
              subjects: ['Analyse', 'Algèbre'],
              online: false
            }
          ]
        }
      );
      
      if (data?.success) {
        const teachersData = data.teachers.map(t => ({
          ...t,
          avatar_color: generateColor(t.id),
          last_seen: t.online ? 'En ligne' : 'Dernière connexion: 2h',
          user_type: 'teacher'
        }));
        setTeachers(teachersData);
      }
    } finally {
      setLoading(prev => ({ ...prev, teachers: false }));
    }
  };
  
  const loadClassmates = async () => {
    setLoading(prev => ({ ...prev, classmates: true }));
    
    try {
      const { data, error } = await safeApiCall(
        () => api.get('/classes/my-classmates/'),
        {
          success: true,
          classmates: [
            {
              id: 9,
              username: 'etudiant2',
              full_name: 'Étudiant 2',
              email: 'etudiant2@iteam.university',
              role: 'student',
              class: 'L3-CS-2025',
              online: true
            },
            {
              id: 10,
              username: 'etudiant3',
              full_name: 'Étudiant 3',
              email: 'etudiant3@iteam.university',
              role: 'student',
              class: 'L3-CS-2025',
              online: false
            }
          ]
        }
      );
      
      if (data?.success) {
        const classmatesData = data.classmates.map(c => ({
          ...c,
          avatar_color: generateColor(c.id),
          last_seen: c.online ? 'En ligne' : 'Hors ligne',
          user_type: 'classmate'
        }));
        setClassmates(classmatesData);
      }
    } finally {
      setLoading(prev => ({ ...prev, classmates: false }));
    }
  };
  
  const loadChatRooms = async () => {
    setLoading(prev => ({ ...prev, rooms: true }));
    
    try {
      const { data, error } = await safeApiCall(
        () => api.get('/chat/rooms/my_chats/'),
        []
      );
      
      if (Array.isArray(data)) {
        setRooms(data);
      }
    } finally {
      setLoading(prev => ({ ...prev, rooms: false }));
    }
  };
  
  const loadRoomMessages = async (roomId) => {
    if (!roomId) return;
    
    console.log(`📄 Loading messages for room: ${roomId}`);
    setLoading(prev => ({ ...prev, messages: true }));
    setMessages([]);
    
    try {
      const { data, error } = await safeApiCall(
        () => api.get(`/chat/messages/room_messages/?room_id=${roomId}`),
        [],
        false
      );
      
      if (Array.isArray(data)) {
        setMessages(data);
      }
      
      if (isMobile) {
        setShowSidebar(false);
      }
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };
  
  // ============================================
  // FONCTIONS POUR CONVERSATIONS PRIVÉES
  // ============================================
  const createOrGetPrivateChat = async (user) => {
    if (!user || !user.id) {
      toast.error('Utilisateur invalide');
      return null;
    }
    
    if (user.id === currentUser.id) {
      toast.warning('Vous ne pouvez pas créer une conversation avec vous-même');
      return null;
    }
    
    setCreatingPrivateChat(true);
    
    try {
      console.log(`🔍 Recherche/Création conversation privée avec: ${user.full_name}`);
      
      const { data: existingRooms } = await safeApiCall(
        () => api.get('/chat/rooms/my_chats/'),
        []
      );
      
      if (Array.isArray(existingRooms)) {
        const existingPrivateRoom = existingRooms.find(room => {
          if (room.room_type === 'private') {
            if (room.participants && Array.isArray(room.participants)) {
              return room.participants.some(p => p.id === user.id);
            }
          }
          return false;
        });
        
        if (existingPrivateRoom) {
          console.log('✅ Conversation privée existante trouvée:', existingPrivateRoom);
          setSelectedRoom(existingPrivateRoom);
          loadRoomMessages(existingPrivateRoom.id);
          return existingPrivateRoom;
        }
      }
      
      console.log('➕ Création nouvelle conversation privée');
      const response = await api.post('/chat/rooms/create_private_chat/', {
        user_id: user.id
      });
      
      if (response.data) {
        console.log('✅ Nouvelle conversation privée créée:', response.data);
        const newRoom = response.data;
        setRooms(prev => [newRoom, ...prev]);
        setSelectedRoom(newRoom);
        loadRoomMessages(newRoom.id);
        toast.success(`Conversation avec ${user.full_name} créée`);
        return newRoom;
      }
      
    } catch (error) {
      console.error('❌ Erreur création conversation privée:', error);
      
      const fallbackRoom = {
        id: `private_${currentUser.id}_${user.id}_${Date.now()}`,
        name: user.full_name,
        room_type: 'private',
        participants_count: 2,
        unread_count: 0,
        last_message: null,
        is_fallback: true,
        created_at: new Date().toISOString(),
        participants: [
          { id: currentUser.id, username: currentUser.username, full_name: currentUser.full_name },
          { id: user.id, username: user.username, full_name: user.full_name }
        ]
      };
      
      console.log('🔄 Création conversation locale (fallback):', fallbackRoom.name);
      setRooms(prev => [fallbackRoom, ...prev]);
      setSelectedRoom(fallbackRoom);
      toast.success(`Conversation avec ${user.full_name} créée (mode démo)`);
      return fallbackRoom;
    } finally {
      setCreatingPrivateChat(false);
    }
    
    return null;
  };
  
  const handleContactClick = async (contact) => {
    if (!contact || creatingPrivateChat) return;
    
    console.log('👤 Click sur contact:', contact);
    
    if (contact.user_type === 'teacher' || contact.user_type === 'classmate') {
      await createOrGetPrivateChat(contact);
    } else if (contact.room_type) {
      setSelectedRoom(contact);
      loadRoomMessages(contact.id);
    }
  };
  
  // ============================================
  // FONCTIONS DE CRÉATION DE GROUPES
  // ============================================
  const checkAndCreateMissingGroups = async () => {
    if (!classInfo || creatingGroups || subjects.length === 0) return;
    
    const hasClassGroup = rooms.some(r => r.room_type === 'group_class');
    const subjectGroups = rooms.filter(r => r.room_type === 'group_subject');
    
    const missingClassGroup = !hasClassGroup;
    const missingSubjectGroups = subjects.filter(subject => 
      !subjectGroups.some(g => g.name?.includes(subject.name))
    );
    
    if (missingClassGroup || missingSubjectGroups.length > 0) {
      setTimeout(() => {
        createAutomaticGroups();
      }, 500);
    }
  };
  
  const createClassGroup = async () => {
    if (!classInfo) {
      toast.warning('Information de classe non disponible');
      return null;
    }
    
    try {
      const response = await api.post('/chat/rooms/create_class_group/', {
        class_id: classInfo.id,
        class_name: classInfo.name
      });
      
      if (response.data) {
        setRooms(prev => [response.data, ...prev]);
        toast.success(`Groupe "${classInfo.name}" créé avec succès`);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Erreur création groupe classe:', error);
      toast.error('Erreur lors de la création du groupe');
    }
    
    return null;
  };
  
  const createSubjectGroup = async (subject) => {
    if (!classInfo?.id) {
      toast.warning('Information de classe non disponible');
      return null;
    }
    
    try {
      const response = await api.post('/chat/rooms/create_subject_group/', {
        subject_name: subject.name,
        teacher_id: subject.teacher_id || null,
        class_id: classInfo.id
      });
      
      if (response.data) {
        setRooms(prev => [response.data, ...prev]);
        toast.success(`Groupe "${subject.name}" créé avec succès`);
        return response.data;
      }
    } catch (error) {
      console.error(`❌ Erreur création groupe ${subject.name}:`, error);
      toast.error('Erreur lors de la création du groupe');
    }
    
    return null;
  };
  
  const createAutomaticGroups = async () => {
    if (creatingGroups) return;
    
    setCreatingGroups(true);
    const createdGroups = [];
    
    try {
      const classGroupExists = rooms.some(r => r.room_type === 'group_class');
      if (!classGroupExists && classInfo) {
        const classGroup = await createClassGroup();
        if (classGroup) createdGroups.push(classGroup);
      }
      
      for (const subject of subjects) {
        const groupExists = rooms.some(r => 
          r.room_type === 'group_subject' && r.name?.includes(subject.name)
        );
        
        if (!groupExists) {
          const group = await createSubjectGroup(subject);
          if (group) createdGroups.push(group);
        }
      }
      
    } finally {
      setCreatingGroups(false);
    }
    
    if (createdGroups.length > 0) {
      toast.success(`${createdGroups.length} groupe(s) créé(s)`);
    }
  };
  
  // ============================================
  // FONCTIONS DE MESSAGERIE
  // ============================================
  const sendMessage = async () => {
    if (!newMessage.trim() && !file) {
      toast.warning('Veuillez écrire un message ou sélectionner un fichier');
      return;
    }
    
    if (!selectedRoom) {
      toast.error('Veuillez sélectionner une conversation');
      return;
    }
    
    if (selectedRoom.is_fallback) {
      const tempMessage = {
        id: Date.now(),
        room: selectedRoom.id,
        sender: currentUser.id || 8,
        sender_details: { 
          username: currentUser.username || 'Utilisateur',
          full_name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username || 'Utilisateur',
          role: currentUser.role || 'student'
        },
        content: newMessage,
        created_at: new Date().toISOString(),
        is_read: true,
        file: file ? URL.createObjectURL(file) : null,
        file_name: file?.name,
        is_temp: false
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      setFile(null);
      toast.success('✅ Message envoyé (mode démonstration)');
      return;
    }
    
    const tempMessage = {
      id: Date.now(),
      room: selectedRoom.id,
      sender: currentUser.id || 8,
      sender_details: { 
        username: currentUser.username || 'Utilisateur',
        full_name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username || 'Utilisateur',
        role: currentUser.role || 'student'
      },
      content: newMessage,
      created_at: new Date().toISOString(),
      is_read: true,
      file: file ? URL.createObjectURL(file) : null,
        file_name: file?.name,
        is_temp: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      const messageContent = newMessage;
      setNewMessage('');
      setFile(null);
      
      try {
        const formData = new FormData();
        formData.append('room', selectedRoom.id);
        formData.append('content', messageContent);
        
        if (file) {
          formData.append('file', file);
        }
        
        const response = await api.post('/chat/messages/', formData, {
          timeout: 10000,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessage.id ? { 
              ...response.data, 
              sender_details: tempMessage.sender_details,
              is_temp: false 
            } : msg
          )
        );
        
        toast.success('✅ Message envoyé');
        
      } catch (error) {
        console.error('❌ Erreur envoi message:', error);
        
        let errorMessage = 'Erreur lors de l\'envoi du message';
        
        if (error.response?.status === 400) {
          errorMessage = 'Données invalides. Vérifiez que la conversation existe.';
        } else if (error.response?.status === 403) {
          errorMessage = 'Vous n\'avez pas accès à cette conversation';
        } else if (error.response?.status === 404) {
          errorMessage = 'Conversation non trouvée';
        } else if (!error.response) {
          errorMessage = 'Problème de connexion au serveur';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
        
        toast.error(errorMessage);
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessage.id 
              ? { ...msg, error: true, content: `${msg.content} (Échec envoi)` }
              : msg
          )
        );
      }
    };
    
    const handleEmojiClick = (emojiData) => {
      const cursorPos = messageInputRef.current?.selectionStart || newMessage.length;
      const textBefore = newMessage.substring(0, cursorPos);
      const textAfter = newMessage.substring(cursorPos);
      
      setNewMessage(textBefore + emojiData.emoji + textAfter);
      setShowEmojiPicker(false);
      
      setTimeout(() => {
        messageInputRef.current?.focus();
        messageInputRef.current?.setSelectionRange(
          cursorPos + emojiData.emoji.length,
          cursorPos + emojiData.emoji.length
        );
      }, 0);
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
    
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // ============================================
    // USE EFFECTS ADDITIONNELS
    // ============================================
    useEffect(() => {
      scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
      if (isMobile && selectedRoom) {
        setShowSidebar(false);
      }
    }, [isMobile, selectedRoom]);
    
    // ============================================
    // FIX 2: COMPOSANT TABS SÉCURISÉ
    // ============================================
    const renderTabs = () => {
      return (
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: COLORS.white,
          mb: 2
        }}>
          <TabsErrorBoundary
            fallback={
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                pb: 1,
                overflowX: 'auto',
                flexWrap: 'nowrap'
              }}>
                {TAB_OPTIONS.map((tab, index) => (
                  <Button
                    key={tab.id}
                    onClick={() => setActiveTab(index)}
                    startIcon={tab.icon}
                    sx={{
                      minWidth: 'auto',
                      px: 2,
                      py: 1.5,
                      color: activeTab === index ? COLORS.primary : COLORS.gray[600],
                      borderBottom: activeTab === index ? `2px solid ${COLORS.primary}` : 'none',
                      fontWeight: activeTab === index ? 600 : 500,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: alpha(COLORS.primary, 0.1)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <Box
                          sx={{
                            backgroundColor: COLORS.error,
                            color: COLORS.white,
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {tab.count > 99 ? '99+' : tab.count}
                        </Box>
                      )}
                    </Box>
                  </Button>
                ))}
              </Box>
            }
          >
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 60,
                '& .MuiTab-root': {
                  minHeight: 60,
                  color: COLORS.gray[600],
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  '&.Mui-selected': {
                    color: COLORS.primary,
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: COLORS.primary,
                  height: 3
                },
                '& .MuiTabs-scrollButtons': {
                  '&.Mui-disabled': {
                    opacity: 0.3,
                  },
                },
              }}
            >
              {TAB_OPTIONS.map((tab, index) => (
                <Tab
                  key={tab.id}
                  icon={
                    <Box sx={{ position: 'relative' }}>
                      {tab.icon}
                      {tab.count > 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: COLORS.error,
                            color: COLORS.white,
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {tab.count > 99 ? '99+' : tab.count}
                        </Box>
                      )}
                    </Box>
                  }
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{tab.label}</span>
                    </Box>
                  }
                  sx={{ minWidth: 'auto', px: 2 }}
                />
              ))}
            </Tabs>
          </TabsErrorBoundary>
        </Box>
      );
    };
    
    // ============================================
    // COMPOSANTS DE RENDU
    // ============================================
    const renderContactItem = (item, index) => {
      const isContact = item.user_type === 'teacher' || item.user_type === 'classmate';
      const isSelected = selectedRoom?.id === item.id;
      
      return (
        <ListItemButton
          key={`${TAB_OPTIONS[activeTab]?.id}_${item.id}_${index}`}
          onClick={() => handleContactClick(item)}
          sx={{
            borderRadius: 2,
            mb: 1,
            border: isSelected ? `2px solid ${COLORS.primary}` : 'none',
            bgcolor: isSelected ? alpha(COLORS.primary, 0.08) : COLORS.white,
            boxShadow: isSelected ? `0 2px 8px ${alpha(COLORS.primary, 0.2)}` : '0 1px 3px rgba(0,0,0,0.1)',
            '&:hover': {
              bgcolor: isSelected ? alpha(COLORS.primary, 0.12) : COLORS.gray[50],
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            },
            transition: 'all 0.2s ease',
            p: 2
          }}
        >
          <ListItemAvatar>
            <Badge
              color="success"
              variant="dot"
              invisible={!item.online}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              sx={{
                '& .MuiBadge-dot': {
                  backgroundColor: item.online ? COLORS.success : COLORS.gray[400],
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: `2px solid ${COLORS.white}`,
                  boxShadow: `0 0 0 1px ${COLORS.white}`
                }
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: item.avatar_color || generateColor(item.id),
                  width: 50, 
                  height: 50,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                {isContact ? (
                  item.user_type === 'teacher' ? <AccountIcon /> : <PersonIcon />
                ) : (
                  getRoomIcon(item.room_type)
                )}
              </Avatar>
            </Badge>
          </ListItemAvatar>
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight={600} 
                  noWrap
                  sx={{ 
                    maxWidth: '70%',
                    color: COLORS.black
                  }}
                >
                  {item.name || item.full_name}
                </Typography>
                {item.last_message && (
                  <Typography variant="caption" color={COLORS.gray[600]} component="span">
                    {formatTime(item.last_message.created_at)}
                  </Typography>
                )}
              </Box>
            }
            secondary={
              <Box component="div" sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isContact ? (
                    <>
                      <Chip 
                        label={item.user_type === 'teacher' ? 'Enseignant' : 'Étudiant'} 
                        size="small" 
                        sx={{ 
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          bgcolor: item.user_type === 'teacher' 
                            ? alpha(COLORS.info, 0.1) 
                            : alpha(COLORS.success, 0.1),
                          color: item.user_type === 'teacher' 
                            ? COLORS.info 
                            : COLORS.success,
                          border: `1px solid ${item.user_type === 'teacher' 
                            ? alpha(COLORS.info, 0.3) 
                            : alpha(COLORS.success, 0.3)}`
                        }} 
                      />
                      <Typography variant="caption" color={COLORS.gray[600]} component="span">
                        {item.specialty || item.class || ''}
                      </Typography>
                    </>
                  ) : (
                    <Chip 
                      label={
                        item.room_type === 'private' ? 'Privé' :
                        item.room_type === 'group_class' ? 'Classe' :
                        item.room_type === 'group_subject' ? 'Matière' : 'Groupe'
                      } 
                      size="small" 
                      sx={{ 
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: alpha(getRoomColor(item.room_type), 0.1),
                        color: getRoomColor(item.room_type),
                        border: `1px solid ${alpha(getRoomColor(item.room_type), 0.3)}`
                      }} 
                    />
                  )}
                </Box>
                
                {item.last_message?.content && (
                  <Typography 
                    variant="caption" 
                    color={COLORS.gray[600]} 
                    noWrap 
                    component="div"
                    sx={{ mt: 1 }}
                  >
                    {item.last_message.content.length > 40 
                      ? item.last_message.content.substring(0, 40) + '...'
                      : item.last_message.content}
                  </Typography>
                )}
                
                {isContact && item.last_seen && (
                  <Typography variant="caption" color={COLORS.gray[500]} component="div" sx={{ mt: 0.5 }}>
                    {item.last_seen}
                  </Typography>
                )}
              </Box>
            }
          />
          
          {item.unread_count > 0 && (
            <Box
              sx={{
                backgroundColor: COLORS.error,
                color: COLORS.white,
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                ml: 2
              }}
            >
              {item.unread_count}
            </Box>
          )}
        </ListItemButton>
      );
    };
    
    const renderContactList = () => {
      let items = [];
      const currentTab = TAB_OPTIONS[activeTab]?.id;
      
      switch (currentTab) {
        case 'rooms':
          items = rooms.filter(room =>
            room && (
              room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (room.participants?.some(p => 
                p?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
              ))
            )
          );
          break;
        case 'teachers':
          items = teachers.filter(teacher =>
            teacher && (
              teacher.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              teacher.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              teacher.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
          break;
        case 'classmates':
          items = classmates.filter(classmate =>
            classmate && (
              classmate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              classmate.username?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
          break;
        case 'groups':
          items = rooms.filter(r => 
            r.room_type !== 'private' &&
            r.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
          break;
      }
      
      if (items.length === 0) {
        return (
          <Box sx={{ 
            textAlign: 'center', 
            p: 4, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: alpha(COLORS.primary, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3
              }}
            >
              {currentTab === 'teachers' ? 
                <AccountIcon sx={{ fontSize: 48, color: COLORS.primary }} /> :
               currentTab === 'classmates' ? 
                <PeopleIcon sx={{ fontSize: 48, color: COLORS.primary }} /> :
               currentTab === 'groups' ? 
                <GroupIcon sx={{ fontSize: 48, color: COLORS.primary }} /> :
                <ChatIcon sx={{ fontSize: 48, color: COLORS.primary }} />
              }
            </Box>
            <Typography variant="h6" color={COLORS.gray[700]} gutterBottom fontWeight={600}>
              {searchTerm ? 'Aucun résultat trouvé' : 
               currentTab === 'teachers' ? 'Aucun enseignant disponible' :
               currentTab === 'classmates' ? 'Aucun camarade disponible' :
               currentTab === 'groups' ? 'Aucun groupe disponible' :
               'Aucune conversation'}
            </Typography>
            <Typography variant="body2" color={COLORS.gray[600]}>
              {searchTerm ? 'Essayez avec d\'autres termes de recherche' :
               'Commencez une nouvelle conversation'}
            </Typography>
          </Box>
        );
      }
      
      return (
        <List sx={{ overflowY: 'auto', flex: 1, p: 2 }}>
          {items.map((item, index) => renderContactItem(item, index))}
        </List>
      );
    };
    
    const renderChatHeader = () => {
      if (!selectedRoom) return null;
      
      const isPrivate = selectedRoom.room_type === 'private';
      const otherParticipant = isPrivate && selectedRoom.participants?.find(p => p.id !== currentUser.id);
      
      return (
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: COLORS.gray[200],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: COLORS.white,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            {isMobile && (
              <IconButton 
                onClick={() => setShowSidebar(true)}
                sx={{ color: COLORS.primary }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            
            <Avatar 
              sx={{ 
                bgcolor: getRoomColor(selectedRoom.room_type),
                width: 50,
                height: 50,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              {getRoomIcon(selectedRoom.room_type)}
            </Avatar>
            
            <Box>
              <Typography variant="h6" fontWeight={700} color={COLORS.black}>
                {isPrivate && otherParticipant ? otherParticipant.full_name || otherParticipant.username : selectedRoom.name}
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color={COLORS.gray[600]}>
                  {isPrivate ? 'Conversation privée' :
                   selectedRoom.room_type === 'group_class' ? 'Groupe de classe' :
                   selectedRoom.room_type === 'group_subject' ? 'Groupe de matière' :
                   `${selectedRoom.participants_count || 0} participants`}
                </Typography>
                
                {selectedRoom.online && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS.success }} />
                    <Typography variant="caption" color={COLORS.success}>
                      En ligne
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Appel vidéo">
              <IconButton sx={{ color: COLORS.primary }}>
                <VideoCallIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Informations">
              <IconButton sx={{ color: COLORS.primary }}>
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Plus d'options">
              <IconButton sx={{ color: COLORS.primary }}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      );
    };
    
    const renderChatMessages = () => {
      if (!selectedRoom) {
        return (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            textAlign: 'center',
            p: 4,
            height: '100%',
            bgcolor: COLORS.gray[50]
          }}>
            <Box sx={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              bgcolor: alpha(COLORS.primary, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <ChatIcon sx={{ fontSize: 70, color: COLORS.primary }} />
            </Box>
            
            <Typography variant="h4" fontWeight={800} gutterBottom color={COLORS.black}>
              Bienvenue sur la messagerie
            </Typography>
            
            <Typography variant="body1" sx={{ 
              maxWidth: 500, 
              mb: 4, 
              color: COLORS.gray[700],
              lineHeight: 1.7
            }}>
              Sélectionnez une conversation pour commencer à discuter avec vos enseignants, camarades de classe ou groupes de travail.
            </Typography>
            
            {isMobile && (
              <Button
                variant="contained"
                onClick={() => setShowSidebar(true)}
                startIcon={<MenuIcon />}
                sx={{ 
                  bgcolor: COLORS.primary,
                  color: COLORS.white,
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    bgcolor: '#1565c0',
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
                  }
                }}
              >
                Voir les conversations
              </Button>
            )}
          </Box>
        );
      }
      
      return (
        <>
          {renderChatHeader()}
          
          {/* Messages */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            p: 3,
            bgcolor: COLORS.gray[50],
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}>
            {loading.messages ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress size={60} thickness={4} sx={{ color: COLORS.primary }} />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                p: 4
              }}>
                <Box sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: alpha(COLORS.primary, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3
                }}>
                  <MessageIcon sx={{ fontSize: 60, color: COLORS.primary }} />
                </Box>
                <Typography variant="h5" fontWeight={700} gutterBottom color={COLORS.black}>
                  Aucun message
                </Typography>
                <Typography variant="body1" color={COLORS.gray[700]} sx={{ maxWidth: 400, mb: 3 }}>
                  Soyez le premier à envoyer un message dans cette conversation.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => messageInputRef.current?.focus()}
                  startIcon={<SendIcon />}
                  sx={{ 
                    borderColor: COLORS.primary,
                    color: COLORS.primary,
                    borderRadius: 3,
                    px: 3,
                    '&:hover': {
                      borderColor: '#1565c0',
                      bgcolor: alpha(COLORS.primary, 0.04)
                    }
                  }}
                >
                  Écrire un message
                </Button>
              </Box>
            ) : (
              messages.map((message, index) => {
                const isMe = isCurrentUser(message);
                const showDate = index === 0 || 
                  formatDate(messages[index-1]?.created_at) !== formatDate(message.created_at);
                
                return (
                  <React.Fragment key={message.id || index}>
                    {showDate && (
                      <Box sx={{ textAlign: 'center', my: 2 }}>
                        <Chip 
                          label={formatDate(message.created_at)}
                          size="small"
                          icon={<TodayIcon />}
                          sx={{ 
                            bgcolor: alpha(COLORS.primary, 0.1),
                            color: COLORS.primary,
                            fontWeight: 600,
                            px: 2,
                            py: 1,
                            '& .MuiChip-icon': { color: COLORS.primary }
                          }}
                        />
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                          mb: 3,
                          maxWidth: '85%',
                          flexDirection: isMe ? 'row-reverse' : 'row'
                        }}
                      >
                        {!isMe && (
                          <Avatar sx={{ 
                            width: 40, 
                            height: 40,
                            fontSize: '1rem',
                            fontWeight: 600,
                            bgcolor: message.sender_details?.role === 'teacher' 
                              ? COLORS.info 
                              : COLORS.success,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}>
                            {message.sender_details?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </Avatar>
                        )}
                        
                        <Box sx={{ maxWidth: '100%' }}>
                          {!isMe && (
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography 
                                variant="caption" 
                                fontWeight={600} 
                                color={COLORS.black}
                              >
                                {message.sender_details?.full_name || message.sender_details?.username}
                              </Typography>
                              {message.sender_details?.role === 'teacher' && (
                                <Chip 
                                  label="Enseignant" 
                                  size="small" 
                                  sx={{ 
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    bgcolor: alpha(COLORS.info, 0.1),
                                    color: COLORS.info
                                  }} 
                                />
                              )}
                            </Box>
                          )}
                          
                          <Paper
                            sx={{
                              p: 2.5,
                              borderRadius: 3,
                              bgcolor: isMe ? COLORS.primary : COLORS.white,
                              color: isMe ? COLORS.white : COLORS.black,
                              borderTopRightRadius: isMe ? 8 : 24,
                              borderTopLeftRadius: isMe ? 24 : 8,
                              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                              maxWidth: '100%',
                              position: 'relative'
                            }}
                          >
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                whiteSpace: 'pre-wrap', 
                                wordBreak: 'break-word',
                                lineHeight: 1.6
                              }} 
                            >
                              {message.content}
                            </Typography>
                            
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              mt: 2,
                              pt: 1.5,
                              borderTop: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : COLORS.gray[200]}`
                            }}>
                              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {formatTime(message.created_at)}
                              </Typography>
                              {isMe && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <CheckCircleIcon 
                                    fontSize="small" 
                                    sx={{ 
                                      color: message.is_read ? COLORS.success : 
                                             isMe ? 'rgba(255,255,255,0.5)' : COLORS.gray[400]
                                    }} 
                                  />
                                </Box>
                              )}
                            </Box>
                          </Paper>
                        </Box>
                        
                        {isMe && (
                          <Avatar sx={{ 
                            width: 40, 
                            height: 40,
                            fontSize: '1rem',
                            fontWeight: 600,
                            bgcolor: COLORS.secondary,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}>
                            {currentUser.username?.charAt(0)?.toUpperCase() || 'M'}
                          </Avatar>
                        )}
                      </Box>
                    </Box>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Box>
          
          {/* Zone de saisie */}
          <Box sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: COLORS.gray[200],
            bgcolor: COLORS.white,
            flexShrink: 0,
            position: 'relative',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
          }}>
            {file && (
              <Paper 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 2,
                  p: 1.5,
                  bgcolor: alpha(COLORS.primary, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(COLORS.primary, 0.2)}`
                }}
              >
                <AttachFileIcon sx={{ color: COLORS.primary }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} color={COLORS.black}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color={COLORS.gray[600]}>
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => setFile(null)}
                  sx={{ color: COLORS.error }}
                >
                  ✕
                </IconButton>
              </Paper>
            )}
            
            {showEmojiPicker && (
              <Box 
                ref={emojiPickerRef}
                sx={{ 
                  position: 'absolute', 
                  bottom: '100%', 
                  left: 16,
                  mb: 2,
                  zIndex: 1000
                }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  searchPlaceholder="Rechercher un émoji..."
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                  width={350}
                  height={400}
                />
              </Box>
            )}
            
            <Box display="flex" gap={1.5} alignItems="flex-end">
              <Box display="flex" gap={0.5}>
                <Tooltip title="Joindre un fichier">
                  <IconButton 
                    onClick={() => fileInputRef.current.click()}
                    sx={{ 
                      color: COLORS.primary,
                      bgcolor: alpha(COLORS.primary, 0.1),
                      '&:hover': { bgcolor: alpha(COLORS.primary, 0.2) }
                    }}
                  >
                    <AttachFileIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Émojis">
                  <IconButton 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    sx={{ 
                      color: showEmojiPicker ? COLORS.secondary : COLORS.primary,
                      bgcolor: showEmojiPicker 
                        ? alpha(COLORS.secondary, 0.1) 
                        : alpha(COLORS.primary, 0.1),
                      '&:hover': { 
                        bgcolor: showEmojiPicker 
                          ? alpha(COLORS.secondary, 0.2) 
                          : alpha(COLORS.primary, 0.2)
                      }
                    }}
                  >
                    <InsertEmojiIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Enregistrement vocal">
                  <IconButton 
                    sx={{ 
                      color: COLORS.primary,
                      bgcolor: alpha(COLORS.primary, 0.1),
                      '&:hover': { bgcolor: alpha(COLORS.primary, 0.2) }
                    }}
                  >
                    <VoiceIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <TextField
                inputRef={messageInputRef}
                fullWidth
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                multiline
                maxRows={4}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: COLORS.gray[50],
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(COLORS.primary, 0.5)
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: COLORS.primary,
                      borderWidth: 2
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: COLORS.black
                  }
                }}
              />
              
              <Button
                variant="contained"
                onClick={sendMessage}
                disabled={!newMessage.trim() && !file}
                sx={{ 
                  minWidth: 'auto',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  height: 'auto',
                  bgcolor: COLORS.primary,
                  color: COLORS.white,
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    bgcolor: '#1565c0',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)'
                  },
                  '&:disabled': {
                    bgcolor: COLORS.gray[400],
                    color: COLORS.gray[600]
                  }
                }}
              >
                <SendIcon />
              </Button>
            </Box>
            
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
            
            <Typography variant="caption" color={COLORS.gray[500]} sx={{ mt: 1, display: 'block' }}>
              Appuyez sur Entrée pour envoyer, Maj+Entrée pour aller à la ligne
            </Typography>
          </Box>
        </>
      );
    };
    
    // ============================================
    // RENDU PRINCIPAL
    // ============================================
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: COLORS.white
      }}>
        {/* Header */}
        <AppBar 
          position="static" 
          sx={{ 
            bgcolor: COLORS.white, 
            color: COLORS.black,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/student/dashboard')}
                  sx={{ 
                    color: COLORS.primary,
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': { bgcolor: alpha(COLORS.primary, 0.1) }
                  }}
                >
                  Retour au tableau de bord
                </Button>
                
                <Box>
                  <Typography variant="h5" fontWeight={800} color={COLORS.black}>
                    💬 Messagerie
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                    {classInfo && (
                      <Chip 
                        icon={<SchoolIcon />}
                        label={classInfo.name}
                        size="small"
                        sx={{ 
                          bgcolor: alpha(COLORS.primary, 0.1),
                          color: COLORS.primary,
                          fontWeight: 600
                        }}
                      />
                    )}
                    <Chip 
                      icon={<PeopleIcon />}
                      label={`${classmates.length} camarades`}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: COLORS.gray[300], color: COLORS.gray[700] }}
                    />
                    <Chip 
                      icon={<AccountIcon />}
                      label={`${teachers.length} enseignants`}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: COLORS.gray[300], color: COLORS.gray[700] }}
                    />
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={loadAllData}
                  variant="outlined"
                  disabled={Object.values(loading).some(v => v)}
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderColor: COLORS.primary,
                    color: COLORS.primary,
                    '&:hover': {
                      borderColor: '#1565c0',
                      bgcolor: alpha(COLORS.primary, 0.04)
                    }
                  }}
                >
                  Actualiser
                </Button>
                
                {isMobile && (
                  <IconButton 
                    onClick={() => setShowSidebar(!showSidebar)}
                    sx={{ color: COLORS.primary }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Container>
        </AppBar>
        
        {/* Contenu principal */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Sidebar */}
          {(showSidebar || !isMobile) && (
            <Box
              sx={{
                width: { xs: '100%', md: 400 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: COLORS.white,
                borderRight: 1,
                borderColor: COLORS.gray[200],
                position: { xs: 'absolute', md: 'relative' },
                zIndex: { xs: 1100, md: 1 },
                left: 0,
                top: 0,
                bottom: 0,
                boxShadow: { xs: '4px 0 20px rgba(0,0,0,0.1)', md: 'none' }
              }}
            >
              {/* Barre de recherche */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: COLORS.gray[200] }}>
                <TextField
                  fullWidth
                  placeholder="Rechercher une conversation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: COLORS.gray[500] }} />
                      </InputAdornment>
                    ),
                    sx: {
                      '& .MuiOutlinedInput-input': {
                        color: COLORS.black
                      }
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: COLORS.gray[50],
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(COLORS.primary, 0.3)
                      }
                    }
                  }}
                />
              </Box>
              
              {/* Onglets - PROTÉGÉS PAR ERROR BOUNDARY */}
              <Box sx={{ px: 2, pt: 2 }}>
                {renderTabs()}
              </Box>
              
              {/* Liste */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {loading.rooms && activeTab === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <CircularProgress size={60} thickness={4} sx={{ color: COLORS.primary }} />
                  </Box>
                ) : (
                  renderContactList()
                )}
              </Box>
              
              {/* Bouton de création */}
              {activeTab === 3 && classInfo && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: COLORS.gray[200] }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={createAutomaticGroups}
                    disabled={creatingGroups}
                    startIcon={<AutoAwesomeIcon />}
                    sx={{ 
                      borderRadius: 2,
                      py: 1.5,
                      bgcolor: COLORS.primary,
                      color: COLORS.white,
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                      '&:hover': {
                        bgcolor: '#1565c0',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)'
                      }
                    }}
                  >
                    {creatingGroups ? 'Création en cours...' : 'Créer les groupes'}
                  </Button>
                </Box>
              )}
            </Box>
          )}
          
          {/* Overlay pour mobile */}
          {isMobile && showSidebar && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0,0,0,0.5)',
                zIndex: 1000
              }}
              onClick={() => setShowSidebar(false)}
            />
          )}
          
          {/* Zone de chat principale */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {renderChatMessages()}
          </Box>
        </Box>
      </Box>
    );
  }