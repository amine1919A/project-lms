// src/components/layout/StudentLayout.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// Icons MUI
import DashboardIcon from "@mui/icons-material/Dashboard";
import BookIcon from "@mui/icons-material/Book";
import QuizIcon from "@mui/icons-material/Quiz";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import PeopleIcon from "@mui/icons-material/People";
import ChatIcon from "@mui/icons-material/Chat";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FolderIcon from "@mui/icons-material/Folder";
import ClassIcon from "@mui/icons-material/Class";
import DescriptionIcon from "@mui/icons-material/Description";

// Composants Material-UI
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Chip,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Alert,
  Snackbar
} from "@mui/material";

export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userClasses, setUserClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Utiliser Promise.allSettled pour gérer les erreurs indépendamment
      const results = await Promise.allSettled([
        loadUserData(),
        loadLiveSessions(),
        loadNotifications()
      ]);
      
      // Vérifier s'il y a des erreurs critiques
      const hasCriticalError = results.some(result => 
        result.status === 'rejected' && 
        result.reason?.response?.status !== 404 // 404 n'est pas critique
      );
      
      if (hasCriticalError) {
        toast.error("Certaines données n'ont pas pu être chargées");
      }
    } catch (error) {
      console.error("Erreur chargement initial:", error);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const userRes = await api.get('/accounts/me/');
      if (userRes.data?.user?.enrolled_classes) {
        setUserClasses(userRes.data.user.enrolled_classes);
      } else if (userRes.data?.classes) {
        setUserClasses(userRes.data.classes);
      } else {
        // Données simulées pour développement
        setUserClasses([
          { id: 1, name: 'ING1 Informatique' }
        ]);
      }
    } catch (error) {
      console.error("Erreur chargement données utilisateur:", error);
      // Données simulées pour développement
      setUserClasses([
        { id: 1, name: 'ING1 Informatique' }
      ]);
    }
  };

  const loadLiveSessions = async () => {
    try {
      const res = await api.get('/live/sessions/active/');
      if (res.data && Array.isArray(res.data)) {
        setLiveSessions(res.data);
      } else {
        // Données simulées pour développement
        setLiveSessions([
          { 
            id: 1, 
            title: "Algorithmique Avancée", 
            teacher: "Dr. Smith", 
            subject: "Algorithmique", 
            isActive: true,
            meeting_id: 'demo-123'
          }
        ]);
      }
    } catch (error) {
      console.error("Erreur chargement sessions live:", error);
      
      // Données simulées pour développement
      setLiveSessions([
        { 
          id: 1, 
          title: "Algorithmique Avancée", 
          teacher: "Dr. Smith", 
          subject: "Algorithmique", 
          isActive: true,
          meeting_id: 'demo-123'
        }
      ]);
    }
  };

  const loadNotifications = async () => {
    try {
      // Essayer l'endpoint spécifique
      const res = await api.get('/notifications/unread/');
      
      if (res.data && Array.isArray(res.data)) {
        setNotifications(res.data);
        setUnreadCount(res.data.length);
      } else if (res.data?.notifications) {
        // Si l'API retourne un format {notifications: [...]}
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.notifications.length);
      } else {
        // Notifications simulées
        const mockNotifications = [
          { 
            id: 1, 
            title: 'Bienvenue sur ITEAM LMS', 
            message: 'Bienvenue sur la plateforme éducative ITEAM', 
            is_read: false,
            notification_type: 'info',
            created_at: new Date().toISOString()
          },
          { 
            id: 2, 
            title: 'Nouveau cours disponible', 
            message: 'Le cours "Introduction à React" est maintenant disponible', 
            is_read: false,
            notification_type: 'course',
            created_at: new Date().toISOString()
          },
        ];
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.length);
      }
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      
      // Notifications simulées pour développement
      const mockNotifications = [
        { 
          id: 1, 
          title: 'Bienvenue sur ITEAM LMS', 
          message: 'Bienvenue sur la plateforme éducative ITEAM', 
          is_read: false,
          notification_type: 'info',
          created_at: new Date().toISOString()
        },
        { 
          id: 2, 
          title: 'Nouveau cours disponible', 
          message: 'Le cours "Introduction à React" est maintenant disponible', 
          is_read: false,
          notification_type: 'course',
          created_at: new Date().toISOString()
        },
      ];
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.length);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Déconnexion réussie !");
    navigate("/login");
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Marquer comme lu (si l'API est disponible)
      await api.patch(`/notifications/${notification.id}/read/`);
      
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Si l'API n'est pas disponible, marquer localement
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // Naviguer selon le type de notification
    if (notification.notification_type === 'course' || notification.notification_type === 'new_course') {
      navigate('/student/courses');
    } else if (notification.notification_type === 'live_session') {
      navigate('/student/live-sessions');
    } else if (notification.notification_type === 'test') {
      navigate('/student/tests');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error) {
      // Si l'API n'est pas disponible, marquer localement
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    }
  };

  const menuItems = [
    { 
      path: "/student/dashboard", 
      label: "Tableau de bord", 
      icon: <DashboardIcon />,
      exact: true
    },
    { 
      path: "/student/classes", 
      label: "Mes classes", 
      icon: <ClassIcon />,
      badge: userClasses.length
    },
    { 
      path: "/student/courses", 
      label: "Mes cours", 
      icon: <BookIcon /> 
    },
    { 
      path: "/student/tests", 
      label: "Tests & Examens", 
      icon: <QuizIcon /> 
    },
    { 
      path: "/student/schedule", 
      label: "Emploi du temps", 
      icon: <ScheduleIcon /> 
    },
    { 
      path: "/student/live-sessions", 
      label: "Sessions Live", 
      icon: <VideoCallIcon />,
      badge: liveSessions.filter(s => s.isActive || s.status === 'live').length
    },
    { 
      path: "/student/chat", 
      label: "Messagerie", 
      icon: <ChatIcon />,
      badge: unreadCount
    },
    { 
      path: "/student/resources", 
      label: "Ressources", 
      icon: <FolderIcon /> 
    },
    
  ];

  const activeSession = liveSessions.find(s => s.isActive || s.status === 'live');

  const drawerWidth = 280;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Header Sidebar */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar 
            sx={{ 
              bgcolor: '#e53935', 
              width: 50, 
              height: 50,
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            IT
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="#e53935">
              ITEAM LMS
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Espace Étudiant
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Informations étudiant */}
      <Box sx={{ p: 2, bgcolor: 'rgba(229, 57, 53, 0.05)', m: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: '#e53935', width: 40, height: 40 }}>
            {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'E'}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="600">
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role === 'student' ? 'Étudiant' : user?.role || 'Utilisateur'}
            </Typography>
          </Box>
        </Box>
        {userClasses.length > 0 && (
          <Chip 
            label={`Classe: ${userClasses[0]?.name || 'Non assigné'}`}
            size="small"
            sx={{ 
              mt: 1, 
              fontSize: '0.7rem',
              bgcolor: 'rgba(229, 57, 53, 0.1)',
              color: '#e53935'
            }}
          />
        )}
      </Box>

      {/* Session Live Active */}
      {activeSession && (
        <Box sx={{ mx: 2, mb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<VideoCallIcon />}
            onClick={() => navigate(`/live-session-teams/${activeSession.meeting_id || activeSession.id}`)}
            sx={{
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
              color: 'white',
              borderRadius: 2,
              py: 1,
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                transform: 'translateY(-1px)',
                boxShadow: 3
              }
            }}
          >
            <Box textAlign="left" width="100%">
              <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                🎥 Session en cours
              </Typography>
              <Typography variant="body2" fontWeight="600" noWrap>
                {activeSession.subject || activeSession.title || 'Session Live'}
              </Typography>
            </Box>
          </Button>
        </Box>
      )}

      {/* Menu */}
      <List sx={{ flex: 1, px: 2, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path || 
                           (item.exact && location.pathname === item.path) ||
                           location.pathname.startsWith(item.path + '/');
          
          return (
            <ListItem
              key={item.path}
              component={Link}
              to={item.path}
              selected={isSelected}
              sx={{
                borderRadius: 2,
                mb: 1,
                textDecoration: 'none',
                color: 'inherit',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(229, 57, 53, 0.1)',
                  color: '#e53935',
                  '&:hover': {
                    backgroundColor: 'rgba(229, 57, 53, 0.15)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#e53935',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(229, 57, 53, 0.05)',
                  transform: 'translateX(4px)',
                  transition: 'transform 0.2s'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.badge && item.badge > 0 ? (
                  <Badge 
                    badgeContent={item.badge} 
                    color="error" 
                    max={9}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: '16px',
                        minWidth: '16px'
                      }
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.95rem'
                }}
              />
            </ListItem>
          );
        })}
      </List>

      {/* Footer Sidebar */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            justifyContent: 'flex-start',
            color: 'text.secondary',
            textTransform: 'none',
            '&:hover': {
              color: '#e53935',
              backgroundColor: 'rgba(229, 57, 53, 0.05)'
            }
          }}
        >
          Déconnexion
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, textAlign: 'center' }}>
          Version 1.0.0
        </Typography>
      </Box>
    </Box>
  );

  const NotificationsMenu = () => {
    const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
    
    const handleNotificationsClick = (event) => {
      setNotificationsAnchorEl(event.currentTarget);
    };
    
    const handleNotificationsClose = () => {
      setNotificationsAnchorEl(null);
    };

    return (
      <>
        <Tooltip title="Notifications">
          <IconButton 
            color="inherit"
            onClick={handleNotificationsClick}
            sx={{ mr: 1 }}
          >
            <Badge 
              badgeContent={unreadCount} 
              color="error"
              max={9}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={notificationsAnchorEl}
          open={Boolean(notificationsAnchorEl)}
          onClose={handleNotificationsClose}
          PaperProps={{
            sx: {
              width: 320,
              maxHeight: 400,
              mt: 1,
              borderRadius: 2,
            }
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Notifications</Typography>
              {unreadCount > 0 && (
                <Button 
                  size="small" 
                  onClick={markAllAsRead}
                  sx={{ textTransform: 'none' }}
                >
                  Tout marquer comme lu
                </Button>
              )}
            </Box>
          </Box>
          
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Aucune notification
              </Typography>
            </Box>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <MenuItem 
                key={notification.id}
                onClick={() => {
                  handleNotificationClick(notification);
                  handleNotificationsClose();
                }}
                sx={{ 
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: notification.is_read ? 'transparent' : 'rgba(229, 57, 53, 0.05)'
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle2" fontWeight="600">
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {new Date(notification.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
          
          {notifications.length > 5 && (
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button 
                size="small" 
                onClick={() => {
                  handleNotificationsClose();
                  navigate('/student/chat');
                }}
                sx={{ textTransform: 'none' }}
              >
                Voir toutes les notifications
              </Button>
            </Box>
          )}
        </Menu>
      </>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#e53935',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }}>
          <IconButton
            color="inherit"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            edge="start"
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            ITEAM University
          </Typography>

          {/* Notifications Menu */}
          <NotificationsMenu />

          {/* User Menu */}
          <Box>
            <Button
              onClick={handleMenuOpen}
              sx={{ 
                color: 'white', 
                textTransform: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1
              }}
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: 'white', 
                  color: '#e53935',
                  fontWeight: 'bold'
                }}
              >
                {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'E'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" fontWeight="600">
                  {user?.first_name || user?.username}
                </Typography>
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                  Étudiant
                </Typography>
              </Box>
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }
              }}
            >
              <MenuItem 
                onClick={() => { 
                  navigate('/student/dashboard'); 
                  handleMenuClose(); 
                }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                Tableau de bord
              </MenuItem>
              <MenuItem 
                onClick={() => { 
                  navigate('/student/profile'); 
                  handleMenuClose(); 
                }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <DescriptionIcon fontSize="small" />
                </ListItemIcon>
                Mon profil
              </MenuItem>
              <Divider />
              <MenuItem 
                onClick={handleLogout}
                sx={{ py: 1.5, color: '#e53935' }}
              >
                <ListItemIcon sx={{ color: '#e53935' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)`,
          transition: 'width 0.3s ease-in-out',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <Toolbar /> {/* Espace pour l'AppBar */}
        
        {/* Quick Actions Bar */}
        <Box 
          sx={{ 
            mb: 4,
            p: 2,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => navigate('/student/schedule')}
              sx={{ 
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#e53935',
                  color: '#e53935'
                }
              }}
            >
              Emploi du temps
            </Button>
            <Button
              variant="contained"
              startIcon={<VideoCallIcon />}
              onClick={() => navigate('/student/live-sessions')}
              sx={{ 
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: 3
                }
              }}
            >
              Sessions Live
            </Button>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={() => navigate('/student/chat')}
              sx={{ 
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#1976d2',
                  color: '#1976d2'
                }
              }}
            >
              Messagerie
            </Button>
            {activeSession && (
              <Button
                variant="contained"
                color="success"
                startIcon={<VideoCallIcon />}
                onClick={() => navigate(`/live-session-teams/${activeSession.meeting_id || activeSession.id}`)}
                sx={{ 
                  borderRadius: 2,
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 3
                  }
                }}
              >
                Rejoindre session
              </Button>
            )}
          </Box>
        </Box>

        {/* Afficher les erreurs */}
        {error && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Page Content */}
        <Box
          sx={{
            minHeight: 'calc(100vh - 180px)',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          {loading ? (
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              minHeight="400px"
            >
              <Box textAlign="center">
                <CircularProgress size={40} sx={{ color: '#e53935', mb: 2 }} />
                <Typography color="text.secondary">
                  Chargement de l'interface...
                </Typography>
              </Box>
            </Box>
          ) : (
            <Outlet />
          )}
        </Box>

        {/* Footer */}
        <Box 
          sx={{ 
            mt: 4, 
            pt: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            textAlign: 'center'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} ITEAM University - Plateforme Éducative
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Pour toute assistance, contactez l'administration
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}