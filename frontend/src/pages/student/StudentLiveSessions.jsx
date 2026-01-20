// src/pages/student/StudentLiveSessions.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Button,
  Chip, Box, LinearProgress, Avatar, Paper,
  Stack, Badge, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  PlayCircle as PlayIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function StudentLiveSessions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState([]);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [selectedSessionParticipants, setSelectedSessionParticipants] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    loadLiveSessions();
    // Rafraîchir chaque 5 secondes pour voir les nouvelles sessions
    const interval = setInterval(loadLiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveSessions = async () => {
    try {
      setLoading(true);
      
      console.log('🚀 TEST: Appel direct à /api/live/sessions/active/');
      
      // Test direct sans axios
      const response = await fetch('http://localhost:8000/api/live/sessions/active/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const rawData = await response.json();
      console.log('📦 Réponse brute fetch:', rawData);
      
      // ... reste du code
    } catch (error) {
      console.error('💥 ERREUR FATALE:', error);
    }
  };

  const joinSession = async (sessionId, meetingId) => {
    try {
      console.log(`🚀 Tentative de rejoindre session ${sessionId} (meeting: ${meetingId})`);
      
      // ✅ Appeler /join/ avec les validations strictes
      const response = await api.post(`/live/sessions/${sessionId}/join/`);
      
      console.log('✅ Réponse join:', response.data);
      
      if (response.data?.success) {
        console.log('✅ Joined session:', meetingId);
        toast.success('Connexion à la session...');
        
        // Rediriger vers le live
        navigate(`/live-session-teams/${meetingId}`);
      } else {
        throw new Error(response.data?.error || 'Impossible de rejoindre');
      }
    } catch (error) {
      console.error('❌ Erreur rejoindre session:', error);
      const msg = error.response?.data?.error || error.message || 'Erreur';
      toast.error(msg);
    }
  };

  const viewParticipants = async (sessionId) => {
    try {
      console.log(`👥 Chargement participants session ${sessionId}`);
      
      // ✅ Récupérer SEULEMENT les participants présents (left_at=NULL)
      const response = await api.get(`/live/sessions/${sessionId}/participants/`);
      
      console.log('📋 Réponse participants:', response.data);
      
      const participants = response.data?.results || response.data?.data || [];
      
      setSelectedSessionParticipants(participants);
      setSelectedSessionId(sessionId);
      setParticipantsDialogOpen(true);
    } catch (error) {
      console.error('Erreur chargement participants:', error);
      toast.error('Impossible de charger les participants');
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  if (loading && liveSessions.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
        <Box textAlign="center" mt={4}>
          <Typography color="text.secondary">
            Vérification des sessions en direct...
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Chargement depuis /live/sessions/active/
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#e53935' }}>
              🎥 Sessions Live
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sessions en direct de votre classe
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Source: /live/sessions/active/ • Sessions: {liveSessions.length}
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            onClick={loadLiveSessions}
            startIcon={<VideoCallIcon />}
          >
            Rafraîchir
          </Button>
        </Box>

        {/* Stats */}
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e53935', color: 'white' }}>
          <Typography variant="h4">{liveSessions.length}</Typography>
          <Typography variant="body2">Sessions en direct maintenant</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Actualisé automatiquement toutes les 5 secondes
          </Typography>
        </Paper>
      </Box>

      {/* Sessions List */}
      {liveSessions.length > 0 ? (
        <Grid container spacing={2}>
          {liveSessions.map(session => (
            <Grid item xs={12} md={6} key={session.id}>
              <Card sx={{
                borderLeft: '4px solid #e53935',
                position: 'relative',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}>
                <CardContent>
                  {/* Status */}
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: '#e53935',
                      animation: 'pulse 2s infinite'
                    }} />
                    <Chip label="EN DIRECT" size="small" color="error" />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ID: {session.id}
                    </Typography>
                  </Box>

                  {/* Title */}
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {session.title || 'Session sans titre'}
                  </Typography>

                  {/* Info */}
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    📚 {session.subject_details?.name || session.subject || 'Matière inconnue'}
                  </Typography>
                  
                  {/* Teacher */}
                  {session.teacher_details && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      👨‍🏫 {session.teacher_details.username || 'Enseignant'}
                    </Typography>
                  )}

                  {/* Participants Count */}
                  <Stack direction="row" spacing={1} mt={2} mb={3}>
                    <Chip
                      icon={<PeopleIcon />}
                      label={`${session.participants_count || 0} participant(s)`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<TimeIcon />}
                      label={formatTime(session.start_time)}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Max: ${session.max_participants || 50}`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      fullWidth
                      onClick={() => joinSession(session.id, session.meeting_id)}
                      sx={{
                        bgcolor: '#e53935',
                        '&:hover': { bgcolor: '#c62828' }
                      }}
                    >
                      Rejoindre
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<PeopleIcon />}
                      onClick={() => viewParticipants(session.id)}
                      sx={{ minWidth: '100px' }}
                    >
                      Participants
                      <Badge 
                        badgeContent={session.participants_count || 0} 
                        color="error"
                        sx={{ ml: 1 }}
                      />
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <VideoCallIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune session live en ce moment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Les sessions apparaîtront ici quand vos enseignants les démarreront
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="outlined" 
              onClick={loadLiveSessions}
              sx={{ mr: 1 }}
            >
              Rafraîchir manuellement
            </Button>
            <Button 
              variant="text" 
              onClick={() => console.log('Ouvrir console pour debug')}
            >
              Debug
            </Button>
          </Box>
        </Paper>
      )}

      {/* Participants Dialog */}
      <Dialog 
        open={participantsDialogOpen} 
        onClose={() => setParticipantsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Participants en direct ({selectedSessionParticipants.length})
            </Typography>
            <Button 
              size="small" 
              onClick={() => setParticipantsDialogOpen(false)}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {selectedSessionParticipants.length > 0 ? (
              selectedSessionParticipants.map(participant => (
                <Box 
                  key={participant.id}
                  display="flex" 
                  alignItems="center" 
                  gap={2}
                  p={1}
                  sx={{ 
                    borderBottom: '1px solid #eee',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                >
                  <Avatar>
                    {participant.user_details?.username?.charAt(0).toUpperCase() || '?'}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {participant.user_details?.username || participant.user?.username || 'Utilisateur'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {participant.user_details?.first_name} {participant.user_details?.last_name}
                    </Typography>
                  </Box>
                  
                  {/* Status icons */}
                  <Box display="flex" gap={1}>
                    {participant.audio_enabled ? (
                      <Chip label="Micro" size="small" />
                    ) : (
                      <Chip label="Micro off" size="small" variant="outlined" />
                    )}
                    {participant.video_enabled ? (
                      <Chip label="Caméra" size="small" />
                    ) : (
                      <Chip label="Caméra off" size="small" variant="outlined" />
                    )}
                  </Box>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" align="center">
                Aucun participant en ce moment
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          bgcolor: '#f5f5f5', 
          borderRadius: 2, 
          border: '1px dashed #ccc'
        }}>
          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
            📊 Debug Info:
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • Sessions chargées: {liveSessions.length}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • URL API: /live/sessions/active/
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            • Intervalle rafraîchissement: 5 secondes
          </Typography>
        </Box>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Container>
  );
}