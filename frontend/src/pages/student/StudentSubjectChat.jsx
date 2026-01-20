// src/pages/student/StudentSubjectChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Container, Paper, TextField, Button, Avatar,
  Typography, Box, IconButton, List, ListItem,
  ListItemAvatar, ListItemText, Divider, Badge,
  Chip, Grid, Card, CardContent, InputAdornment,
  Stack, alpha, styled
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Download as DownloadIcon,
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Book as BookIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

export default function StudentSubjectChat() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  
  const messagesEndRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    loadSubjectData();
    loadMessages();
  }, [subjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSubjectData = async () => {
    try {
      const res = await api.get(`/classes/subjects/${subjectId}/`);
      setSubject(res.data);
      
      // Simuler des participants
      setParticipants([
        { id: 1, name: 'Dr. Smith', role: 'teacher', isOnline: true },
        { id: 2, name: 'Ahmed', role: 'student', isOnline: true },
        { id: 3, name: 'Fatima', role: 'student', isOnline: false },
        { id: 4, name: 'Karim', role: 'student', isOnline: true },
      ]);
    } catch (error) {
      console.error('Erreur chargement matière:', error);
      setSubject({
        id: subjectId,
        name: 'Algorithmique',
        teacher_name: 'Dr. Smith',
        class_name: 'ING1 Info'
      });
    }
  };

  const loadMessages = () => {
    // Messages simulés
    setMessages([
      {
        id: 1,
        sender: 'Dr. Smith',
        message: 'Bonjour à tous ! Avez-vous des questions sur le chapitre 2 ?',
        time: '09:30',
        isTeacher: true,
        attachments: []
      },
      {
        id: 2,
        sender: 'Ahmed',
        message: 'Oui, je ne comprends pas l\'exercice 3',
        time: '09:32',
        isTeacher: false,
        attachments: []
      },
      {
        id: 3,
        sender: 'Dr. Smith',
        message: 'Je vais expliquer en détail lors de la prochaine session',
        time: '09:33',
        isTeacher: true,
        attachments: [{ name: 'correction_ex3.pdf', size: '1.2MB' }]
      },
      {
        id: 4,
        sender: 'Fatima',
        message: 'Merci pour le document !',
        time: '09:35',
        isTeacher: false,
        attachments: []
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
      attachments: []
    };
    
    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
  };

  const sendFile = (file) => {
    if (file) {
      toast.info(`Fichier "${file.name}" envoyé`);
      // Implémenter l'upload réel
    }
  };

  if (!subject) {
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
          onClick={() => navigate(`/student/subject/${subjectId}`)}
          sx={{ mb: 2 }}
        >
          Retour à la matière
        </Button>
        
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={8}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: '#e53935', width: 60, height: 60 }}>
                <BookIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="600">
                  💬 Chat - {subject.name}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Discutez avec votre enseignant et vos camarades
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4} textAlign="right">
            <Button
              variant="contained"
              startIcon={<VideoCallIcon />}
              onClick={() => navigate('/student/live-sessions')}
              sx={{ 
                bgcolor: '#e53935',
                '&:hover': { bgcolor: '#c62828' }
              }}
            >
              Rejoindre une session live
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* Colonne gauche - Participants */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon />
                Participants ({participants.length})
              </Typography>
              
              <List sx={{ overflowY: 'auto', flex: 1 }}>
                {participants.map(participant => (
                  <ListItem
                    key={participant.id}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: participant.role === 'teacher' ? 'rgba(229, 57, 53, 0.1)' : 'transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="success"
                        variant="dot"
                        invisible={!participant.isOnline}
                      >
                        <Avatar sx={{ 
                          bgcolor: participant.role === 'teacher' ? '#e53935' : '#1976d2'
                        }}>
                          {participant.name.charAt(0)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2" fontWeight="600">
                            {participant.name}
                          </Typography>
                          {participant.role === 'teacher' && (
                            <Chip label="Enseignant" size="small" color="error" />
                          )}
                          {participant.isOnline && (
                            <Chip label="En ligne" size="small" color="success" variant="outlined" />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  📁 Fichiers partagés
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1} sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
                    <Avatar sx={{ bgcolor: '#e53935', width: 32, height: 32 }}>
                      <DownloadIcon fontSize="small" />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="caption" fontWeight="600">
                        correction_ex3.pdf
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        1.2MB • Dr. Smith
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Colonne droite - Chat */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              {messages.map(msg => (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    flexDirection: msg.sender === 'Moi' ? 'row-reverse' : 'row',
                    gap: 1,
                    alignItems: 'flex-start'
                  }}
                >
                  <Avatar sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: msg.isTeacher ? '#e53935' : 
                             msg.sender === 'Moi' ? '#1976d2' : '#4caf50'
                  }}>
                    {msg.sender.charAt(0)}
                  </Avatar>
                  
                  <Box sx={{ maxWidth: '70%' }}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderTopRightRadius: msg.sender === 'Moi' ? 2 : 12,
                        borderTopLeftRadius: msg.sender === 'Moi' ? 12 : 2,
                        bgcolor: msg.sender === 'Moi' ? '#1976d2' : 
                                 msg.isTeacher ? 'rgba(229, 57, 53, 0.1)' : 'grey.100',
                        color: msg.sender === 'Moi' ? 'white' : 'text.primary'
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="caption" fontWeight="600">
                          {msg.sender}
                        </Typography>
                        <Typography variant="caption" color={msg.sender === 'Moi' ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
                          {msg.time}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2">
                        {msg.message}
                      </Typography>
                      
                      {msg.attachments.length > 0 && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                          {msg.attachments.map((att, idx) => (
                            <Box key={idx} display="flex" alignItems="center" gap={1} sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.05)' }}>
                              <DownloadIcon fontSize="small" />
                              <Box flex={1}>
                                <Typography variant="caption" fontWeight="600">
                                  {att.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  {att.size}
                                </Typography>
                              </Box>
                              <IconButton size="small">
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box display="flex" gap={1} alignItems="center">
                <IconButton onClick={() => fileInputRef.current.click()}>
                  <AttachFileIcon />
                </IconButton>
                <IconButton>
                  <EmojiIcon />
                </IconButton>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => sendFile(e.target.files[0])}
                />
                
                <TextField
                  fullWidth
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  size="small"
                  variant="outlined"
                />
                
                <Button
                  variant="contained"
                  onClick={sendMessage}
                  startIcon={<SendIcon />}
                  sx={{ 
                    minWidth: 'auto',
                    bgcolor: '#e53935',
                    '&:hover': { bgcolor: '#c62828' }
                  }}
                >
                  Envoyer
                </Button>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}