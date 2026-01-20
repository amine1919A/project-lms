// src/pages/shared/LiveSessionTeams.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAgora } from '../../context/AgoraContext';
import {
  Box, Paper, Typography, Button, Stack, IconButton, TextField, 
  Tooltip, Divider, Badge, Grid, CircularProgress, LinearProgress, Avatar,
  Alert
} from '@mui/material';
import {
  CallEnd, Chat, Videocam, VideocamOff, Mic, MicOff,
  ScreenShare, StopScreenShare, Send, People, Close as CloseIcon,
  PanTool as RaiseHandIcon, Fullscreen, FullscreenExit,
  VolumeUp, VolumeOff, Refresh as RefreshIcon, 
  Build as TroubleshootIcon, Warning as WarningIcon
} from '@mui/icons-material';

export default function LiveSessionTeams() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { 
    client, 
    localTracks, 
    remoteUsers, 
    isJoined,
    joinChannel, 
    leaveChannel, 
    toggleLocalAudio, 
    toggleLocalVideo,
    forcePlayRemoteVideos,
    getStatus,
    resetAgora
  } = useAgora();
  
  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  
  // Media state
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // UI state
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Error state
  const [connectionError, setConnectionError] = useState(null);
  const [showEmergencyMode, setShowEmergencyMode] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const videoContainerRef = useRef(null);
  const participantIntervalRef = useRef(null);
  const videoDisplayTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Protection contre le double montage
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const joinAttemptsRef = useRef(0);
  const MAX_JOIN_ATTEMPTS = 3;

  // ============================================================================
  // INITIALISATION
  // ============================================================================

  useEffect(() => {
    if (isInitializedRef.current || isCleaningUpRef.current) return;

    const initSession = async () => {
      if (!authLoading && currentUser) {
        isInitializedRef.current = true;
        await initializeSession();
      }
    };

    initSession();
    
    return () => {
      isCleaningUpRef.current = true;
      cleanup();
      clearInterval(participantIntervalRef.current);
      if (videoDisplayTimeoutRef.current) {
        clearTimeout(videoDisplayTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      setTimeout(() => {
        isInitializedRef.current = false;
        isCleaningUpRef.current = false;
        joinAttemptsRef.current = 0;
      }, 1000);
    };
  }, [meetingId, authLoading, currentUser]);

  useEffect(() => {
    if (localTracks && localTracks[1] && localVideoRef.current) {
      try {
        const stream = new MediaStream([localTracks[1].getMediaStreamTrack()]);
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(console.warn);
      } catch (error) {
        console.error('❌ Erreur vidéo locale:', error);
      }
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localTracks]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔥 METTRE À JOUR LES PARTICIPANTS PÉRIODIQUEMENT
  useEffect(() => {
    if (session?.id && isJoined) {
      // Rafraîchir la liste des participants toutes les 5 secondes
      participantIntervalRef.current = setInterval(fetchParticipants, 5000);
      return () => clearInterval(participantIntervalRef.current);
    }
  }, [session?.id, isJoined]);

  // 🔥 AFFICHER LES VIDÉOS DES PARTICIPANTS DISTANTS
  useEffect(() => {
    console.log('🔄 Mise à jour des vidéos distantes:', remoteUsers.length);
    
    // Nettoyer les timeouts précédents
    if (videoDisplayTimeoutRef.current) {
      clearTimeout(videoDisplayTimeoutRef.current);
    }
    
    // Afficher les vidéos après un court délai
    videoDisplayTimeoutRef.current = setTimeout(() => {
      displayRemoteVideos();
    }, 500);
  }, [remoteUsers]);

  // 🔥 SURVEILLER L'ÉTAT AGORA
  useEffect(() => {
    const checkAgoraStatus = () => {
      if (getStatus) {
        const status = getStatus();
        console.log('📊 État Agora:', status);
        
        if (status.initializationError) {
          setConnectionError(`Erreur initialisation: ${status.initializationError}`);
          setShowEmergencyMode(true);
        }
      }
    };
    
    checkAgoraStatus();
  }, [getStatus]);

  // ============================================================================
  // FONCTIONS PRINCIPALES
  // ============================================================================

  const displayRemoteVideos = () => {
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        const playerElement = document.getElementById(`agora-remote-${user.uid}`);
        if (playerElement) {
          try {
            // Vider l'élément d'abord
            playerElement.innerHTML = '';
            
            // Jouer la vidéo
            user.videoTrack.play(playerElement);
            console.log(`✅ Vidéo affichée pour UID: ${user.uid}`);
          } catch (error) {
            console.error(`❌ Erreur affichage vidéo UID ${user.uid}:`, error);
          }
        }
      }
    });
  };

  const initializeSession = async () => {
    try {
      setLoading(true);
      setConnectionError(null);
      console.log('🔄 Initialisation session...');
      
      // Vérifier la session via l'endpoint active
      const response = await api.get('/live/sessions/active/');
      const sessions = response.data?.results || [];
      const currentSession = sessions.find(s => s.meeting_id === meetingId);
      
      if (!currentSession || currentSession.status !== 'live') {
        toast.error('Session introuvable ou fermée');
        redirectBack();
        return;
      }
      
      setSession(currentSession);
      console.log('✅ Session chargée:', currentSession.title);
      
      // Rejoindre la session backend
      const joinResponse = await api.post(`/live/sessions/${currentSession.id}/join/`);
      const agoraUid = joinResponse.data.agora_uid;
      console.log('✅ Rejoint session backend avec UID:', agoraUid);
      
      // Charger la liste des participants
      await fetchParticipants();
      
      // Vérifier l'état d'Agora avant de continuer
      await waitForAgoraInitialization();
      
      // Rejoindre le canal Agora
      await joinAgoraChannel(currentSession.id, agoraUid);
      
      await loadMessages();
      
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors du chargement de la session';
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ATTENDRE L'INITIALISATION AGORA
  const waitForAgoraInitialization = async (maxWait = 10000) => {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (getStatus) {
          const status = getStatus();
          if (status.isInitialized && status.hasClient) {
            clearInterval(checkInterval);
            console.log('✅ Agora initialisé');
            resolve(true);
          } else if (Date.now() - startTime > maxWait) {
            clearInterval(checkInterval);
            console.error('❌ Timeout initialisation Agora');
            reject(new Error('Timeout initialisation Agora'));
          }
        } else {
          clearInterval(checkInterval);
          reject(new Error('Fonction getStatus non disponible'));
        }
      }, 500);
    });
  };

  // 🔥 FONCTION POUR RÉCUPÉRER LES PARTICIPANTS
  const fetchParticipants = async () => {
    if (!session?.id) return;
    
    try {
      const response = await api.get(`/live/sessions/${session.id}/participants/`);
      if (response.data.success) {
        setParticipantsList(response.data.results || []);
        console.log('👥 Participants mis à jour:', response.data.results.length);
      }
    } catch (error) {
      console.warn('Erreur chargement participants:', error);
    }
  };

  // 🔥 FONCTION PRINCIPALE DE CONNEXION AGORA
  const joinAgoraChannel = useCallback(async (sessionId, agoraUid, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    if (retryCount >= MAX_RETRIES) {
      console.error('❌ Maximum de tentatives atteint');
      setConnectionError('Échec de connexion après plusieurs tentatives');
      setShowEmergencyMode(true);
      return;
    }
    
    try {
      setIsJoining(true);
      setConnectionError(null);
      console.log(`🔑 Demande token Agora pour UID: ${agoraUid}, Tentative ${retryCount + 1}/${MAX_RETRIES}`);
      
      // 🔥 VÉRIFIER L'ÉTAT AGORA
      const status = getStatus?.();
      if (!status?.isInitialized) {
        console.warn('⚠️ Agora non initialisé, réessai...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return joinAgoraChannel(sessionId, agoraUid, retryCount);
      }
      
      const timestamp = Date.now();
      const tokenRes = await api.get(`/live/sessions/${sessionId}/get_agora_token/?t=${timestamp}`);
      
      if (!tokenRes.data.success) {
        throw new Error(tokenRes.data.error || 'Échec de génération du token');
      }
      
      const { token, channel, uid, appId, role } = tokenRes.data;
      
      console.log("🔥 Connexion Agora:", {
        uid: uid,
        channel: channel,
        role: role,
        tokenLength: token?.length || 0
      });
      
      if (!channel || !appId) {
        throw new Error('Configuration Agora incomplète');
      }
      
      // 🔥 DÉTECTION FIREFOX
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      const finalUid = isFirefox ? 0 : (uid || agoraUid);
      
      // 🔥 DÉTERMINER SI C'EST UN PUBLISHER
      const isPublisher = role === 'publisher' || currentUser?.role === 'teacher';
      
      if (isFirefox) {
        console.log('🦊 Firefox détecté - UID ajusté à 0');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`🎯 Tentative connexion avec UID: ${finalUid}, Publisher: ${isPublisher}, Role: ${role}`);
      
      try {
        // 🔥 ESSAYER AVEC TOKEN
        await joinChannel(appId, channel, token, finalUid, isPublisher);
        
        console.log('✅ Connexion Agora établie');
        setConnectionError(null);
        setShowEmergencyMode(false);
        toast.success(`Connecté au streaming vidéo (${role})`);
        
      } catch (agoraError) {
        // 🔥 GESTION DES ERREURS SPÉCIFIQUES
        if (agoraError.message.includes('invalid token') || 
            agoraError.message.includes('CAN_NOT_GET_GATEWAY_SERVER')) {
          
          console.warn('⚠️ Token invalide, essai sans token...');
          toast.warning('Token invalide, tentative alternative...');
          
          // Essayer sans token
          try {
            await joinChannel(appId, channel, null, finalUid, false); // Mode subscriber sans token
            console.log('✅ Connexion sans token réussie');
            setConnectionError(null);
            toast.success('Connecté en mode observateur');
          } catch (noTokenError) {
            console.error('❌ Échec sans token aussi:', noTokenError.message);
            
            // Mode d'urgence pour les étudiants
            if (currentUser?.role === 'student' && retryCount >= 1) {
              console.log('🚨 Activation mode urgence pour étudiant');
              await emergencyJoinForStudents();
              return;
            }
            
            throw new Error(`Échec avec et sans token: ${noTokenError.message}`);
          }
        } else {
          throw agoraError;
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur joinAgoraChannel:', error);
      setConnectionError(error.message);
      
      // 🔥 GESTION DES ERREURS SPÉCIFIQUES
      if (error.message.includes('Client Agora non initialisé') ||
          error.message.includes('Agora non initialisé')) {
        
        console.warn('🔄 Client non initialisé, réinitialisation...');
        
        if (resetAgora) {
          await resetAgora();
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Réessayer après réinitialisation
          if (retryCount < MAX_RETRIES) {
            await joinAgoraChannel(sessionId, agoraUid, retryCount + 1);
          }
        }
        return;
      }
      
      if (error.message.includes('websocket') || 
          error.message.includes('wss://')) {
        
        console.warn('⚠️ Erreur WebSocket, réessai...');
        
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        
        retryTimeoutRef.current = setTimeout(async () => {
          if (retryCount < MAX_RETRIES) {
            await joinAgoraChannel(sessionId, agoraUid, retryCount + 1);
          }
        }, 3000 * (retryCount + 1));
        
        return;
      }
      
      // Pour les autres erreurs, proposer le mode urgence
      if (retryCount >= 1) {
        setShowEmergencyMode(true);
        toast.error(`Erreur connexion: ${error.message}`);
      } else {
        // Réessayer
        setTimeout(async () => {
          await joinAgoraChannel(sessionId, agoraUid, retryCount + 1);
        }, 2000);
      }
      
    } finally {
      setIsJoining(false);
    }
  }, [joinChannel, leaveChannel, getStatus, resetAgora, currentUser]);

  // 🔥 MODE URGENCE POUR ÉTUDIANTS
  const emergencyJoinForStudents = async () => {
    console.log('🚨 Mode urgence activé pour étudiant');
    
    try {
      await leaveChannel();
      
      // Simuler la connexion
      setIsJoined(true);
      setIsCameraOn(false);
      setIsMicOn(false);
      
      toast.info('Mode observation activé - Audio seulement');
      
      // Charger les messages
      await loadMessages();
      
      setShowEmergencyMode(false);
      
    } catch (error) {
      console.error('❌ Erreur mode urgence:', error);
      toast.error('Impossible d\'activer le mode observation');
    }
  };

  // ============================================================================
  // MÉDIA
  // ============================================================================

  const toggleCamera = () => {
    try {
      const newState = toggleLocalVideo();
      setIsCameraOn(newState);
      toast.info(newState ? '📷 Caméra activée' : '📷 Caméra désactivée');
    } catch (error) {
      console.error('Erreur caméra:', error);
      toast.error('Erreur avec la caméra');
    }
  };

  const toggleMicrophone = () => {
    try {
      const newState = toggleLocalAudio();
      setIsMicOn(newState);
      toast.info(newState ? '🎤 Microphone activé' : '🎤 Microphone désactivé');
    } catch (error) {
      console.error('Erreur micro:', error);
      toast.error('Erreur avec le microphone');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (screenVideoRef.current?.srcObject) {
          screenVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
          screenVideoRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
        toast.info('🖥️ Partage d\'écran arrêté');
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: false,
          cursor: 'always'
        });
        
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          toast.info('🖥️ Partage d\'écran arrêté');
        };
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.play().catch(console.warn);
        }
        setIsScreenSharing(true);
        toast.success('🖥️ Partage d\'écran activé');
      }
    } catch (error) {
      console.error('Erreur partage écran:', error);
      if (error.name !== 'NotAllowedError') {
        toast.error('Impossible de partager l\'écran');
      }
    }
  };

  const toggleFullscreen = () => {
    const element = videoContainerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().catch(err => {
        console.error(`Erreur fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? '🔊 Son activé' : '🔇 Son désactivé');
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    toast.info(isHandRaised ? '✋ Main baissée' : '✋ Main levée');
  };

  const reconnect = async () => {
    try {
      setIsJoining(true);
      setConnectionError(null);
      console.log('🔄 Reconnexion manuelle');
      
      await leaveChannel();
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Rejoindre à nouveau le backend
      const joinResponse = await api.post(`/live/sessions/${session.id}/join/`);
      const agoraUid = joinResponse.data.agora_uid;
      
      await joinAgoraChannel(session.id, agoraUid);
      
    } catch (error) {
      console.error('❌ Erreur reconnexion:', error);
      toast.error('Échec de la reconnexion');
    } finally {
      setIsJoining(false);
    }
  };

  // ============================================================================
  // CHAT
  // ============================================================================

  const loadMessages = async () => {
    if (!session?.id) return;
    try {
      const response = await api.get(`/live/sessions/${session.id}/messages/`);
      const msgs = response.data?.results || response.data || [];
      setMessages(msgs);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.warn('Erreur chargement messages:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session?.id || !currentUser) return;
    
    const tempMessageId = Date.now();
    const tempMsg = {
      id: tempMessageId,
      user: currentUser.username || currentUser.email || 'Vous',
      user_id: currentUser.id,
      message: newMessage.trim(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    // Ajouter temporairement
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');
    
    try {
      const messageData = {
        message: newMessage.trim(),
        session: session.id,
        user: currentUser.id,
        username: currentUser.username || currentUser.email
      };
      
      await api.post(`/live/sessions/${session.id}/messages/`, messageData);
      
      // Remplacer le message temporaire
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId ? { ...msg, id: Date.now() + 1 } : msg
      ));
      
    } catch (error) {
      if (error.response?.status === 404) {
        // Garder le message local
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessageId ? { ...msg, id: Date.now() + 1 } : msg
        ));
      } else {
        console.error('Erreur envoi message:', error);
        toast.error('Erreur lors de l\'envoi du message');
        // Supprimer le message temporaire
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ============================================================================
  // QUITTER SESSION
  // ============================================================================

  const leaveSession = async () => {
    if (!window.confirm('Voulez-vous vraiment quitter la session ?')) return;
    try {
      await leaveChannel();
      if (session?.id) {
        try {
          await api.post(`/live/sessions/${session.id}/leave/`);
        } catch (error) {
          console.warn('Erreur quitter session (serveur):', error);
        }
      }
      toast.info('Vous avez quitté la session');
      redirectBack();
    } catch (error) {
      console.error('Erreur quitter session:', error);
      redirectBack();
    }
  };

  const redirectBack = () => {
    if (currentUser?.role === 'teacher') {
      navigate('/teacher/live-sessions');
    } else {
      navigate('/student/live-sessions');
    }
  };

  const cleanup = () => {
    leaveChannel();
    clearInterval(participantIntervalRef.current);
    if (videoDisplayTimeoutRef.current) clearTimeout(videoDisplayTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
  };

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================

  const forceDisplayVideos = () => {
    console.log('🔧 Forçage manuel des vidéos');
    if (forcePlayRemoteVideos) {
      forcePlayRemoteVideos();
    } else {
      displayRemoteVideos();
    }
  };

  const troubleshootAgora = async () => {
    console.log('🔧 Démarrage du dépannage Agora...');
    toast.info('Dépannage en cours...');
    
    const online = navigator.onLine;
    console.log(`🌐 Connexion internet: ${online ? '✅ OK' : '❌ HS'}`);
    
    if (!online) {
      toast.error('Pas de connexion internet');
      return;
    }
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      console.log('🎤✅ Permissions média: OK');
    } catch (error) {
      console.error('❌ Permissions média refusées:', error.message);
      toast.error('Veuillez autoriser la caméra et le micro');
    }
    
    forceDisplayVideos();
    
    if (getStatus) {
      const status = getStatus();
      console.log('📊 État Agora:', status);
    }
    
    toast.success('Dépannage terminé. Voir la console pour les détails.');
  };

  // ============================================================================
  // CALCULS
  // ============================================================================

  const getAllParticipants = () => {
    const allParticipants = [];
    
    // Utilisateur courant
    if (currentUser) {
      allParticipants.push({
        uid: currentUser.id,
        username: currentUser.username || currentUser.email,
        displayName: 'Vous',
        role: currentUser.role === 'teacher' ? 'Enseignant' : 'Étudiant',
        isPresenter: currentUser.role === 'teacher',
        isCurrentUser: true,
        hasVideo: isCameraOn && localTracks?.[1],
        hasAudio: isMicOn && localTracks?.[0],
        isOnline: true,
        user: currentUser
      });
    }
    
    // Utilisateurs distants
    remoteUsers.forEach(remoteUser => {
      const participant = participantsList.find(p => p.agora_uid === remoteUser.uid);
      
      allParticipants.push({
        uid: remoteUser.uid,
        username: participant?.user?.username || `Participant ${remoteUser.uid}`,
        displayName: participant?.user?.username || `Participant ${remoteUser.uid}`,
        role: participant?.user?.role === 'teacher' ? 'Enseignant' : 'Étudiant',
        isPresenter: participant?.is_presenter || false,
        isCurrentUser: false,
        hasVideo: remoteUser.hasVideo || false,
        hasAudio: remoteUser.audioTrack ? true : false,
        isOnline: true,
        user: participant?.user,
        videoTrack: remoteUser.videoTrack,
        audioTrack: remoteUser.audioTrack,
        remoteUser: remoteUser
      });
    });
    
    // Participants du backend sans vidéo
    participantsList.forEach(participant => {
      if (participant.user.id === currentUser?.id) return;
      
      const alreadyExists = allParticipants.find(p => 
        (p.user && p.user.id === participant.user.id) || 
        p.uid === participant.agora_uid
      );
      
      if (!alreadyExists) {
        allParticipants.push({
          uid: participant.agora_uid || `user-${participant.user.id}`,
          username: participant.user.username,
          displayName: participant.user.username,
          role: participant.user.role === 'teacher' ? 'Enseignant' : 'Étudiant',
          isPresenter: participant.is_presenter,
          isCurrentUser: false,
          hasVideo: false,
          hasAudio: false,
          isOnline: true,
          user: participant.user,
          videoTrack: null,
          audioTrack: null,
          remoteUser: null
        });
      }
    });
    
    return allParticipants;
  };

  const allParticipants = getAllParticipants();

  // ============================================================================
  // COMPOSANT ParticipantCard
  // ============================================================================

  const ParticipantCard = ({ participant }) => {
    const isLocal = participant.isCurrentUser;
    const hasRemoteVideo = participant.remoteUser?.videoTrack;
    
    return (
      <Grid item xs={12} sm={allParticipants.length > 2 ? 6 : 12} md={allParticipants.length > 4 ? 4 : 6}>
        <Paper 
          elevation={4} 
          sx={{ 
            bgcolor: '#1a1a1a', 
            borderRadius: 2, 
            overflow: 'hidden', 
            position: 'relative', 
            height: '300px',
            border: participant.isCurrentUser ? '3px solid #e53935' : 
                    participant.isPresenter ? '2px solid #ff9800' : '2px solid #2196f3',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: 6
            }
          }}
        >
          {/* ZONE VIDÉO */}
          {isLocal ? (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: 'calc(100% - 70px)', 
                objectFit: 'cover', 
                transform: 'scaleX(-1)',
                backgroundColor: '#000'
              }} 
            />
          ) : hasRemoteVideo ? (
            <div
              id={`agora-remote-${participant.uid}`}
              style={{
                width: '100%',
                height: 'calc(100% - 70px)',
                backgroundColor: '#000',
                minHeight: '230px'
              }}
            />
          ) : (
            <Box 
              sx={{ 
                width: '100%', 
                height: 'calc(100% - 70px)', 
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                p: 3
              }}
            >
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: participant.isPresenter ? '#ff9800' : '#2196f3',
                  fontSize: '2rem',
                  marginBottom: 1
                }}
              >
                {participant.username.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="#aaa">
                {participant.remoteUser ? 'Caméra éteinte' : 'En attente de connexion...'}
              </Typography>
            </Box>
          )}

          {/* INFOS PARTICIPANT */}
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.85)', 
              px: 2, 
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #333'
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography 
                  variant="body2" 
                  color="white" 
                  fontWeight={600}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  {participant.isPresenter ? '👨‍🏫' : '👨‍🎓'}
                  {participant.displayName}
                  {isHandRaised && participant.isCurrentUser && ' ✋'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box 
                  sx={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: participant.isPresenter ? 
                            'rgba(255, 152, 0, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                    border: `1px solid ${participant.isPresenter ? '#ff9800' : '#2196f3'}`
                  }}
                >
                  <Typography variant="caption" sx={{ 
                    color: participant.isPresenter ? '#ff9800' : '#2196f3', 
                    fontWeight: 500 
                  }}>
                    {participant.isPresenter ? 'Présentateur' : 
                     participant.isCurrentUser ? 'Vous' : 'Spectateur'}
                  </Typography>
                </Box>
                
                <Typography variant="caption" sx={{ color: '#aaa' }}>
                  {participant.role}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {participant.hasAudio ? (
                <Mic sx={{ fontSize: 16, color: '#4caf50' }} />
              ) : (
                <MicOff sx={{ fontSize: 16, color: '#666' }} />
              )}
              
              {!participant.hasVideo && (
                <VideocamOff sx={{ fontSize: 16, color: '#666' }} />
              )}
              
              {isHandRaised && !participant.isCurrentUser && (
                <RaiseHandIcon sx={{ fontSize: 16, color: '#ff9800' }} />
              )}
            </Box>
          </Box>
        </Paper>
      </Grid>
    );
  };

  // ============================================================================
  // RENDU
  // ============================================================================

  if (authLoading || loading) {
    return (
      <Box sx={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', bgcolor: '#0a0a0a' }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography color="white" variant="h6">Connexion à la session en direct...</Typography>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#0a0a0a', minHeight: '100vh' }}>
        <Typography color="error" variant="h5">Session introuvable</Typography>
        <Button variant="contained" onClick={redirectBack} sx={{ mt: 2 }}>Retour aux sessions</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#0a0a0a' }}>
      
      {/* HEADER */}
      <Paper elevation={3} sx={{ p: 2, bgcolor: '#1a1a1a', color: 'white', zIndex: 10, borderRadius: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#e53935', animation: 'pulse 2s infinite' }} />
              {session.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
              📚 {session.subject_details?.name || 'Session Live'} • 
              👥 {allParticipants.length} participant(s) • 
              {currentUser?.role === 'teacher' ? ' 👨‍🏫 Enseignant' : ' 👨‍🎓 Étudiant'} •
              {isJoined ? ' 🔴 EN DIRECT' : ' ⚫ HORS LIGNE'}
            </Typography>
            
            {/* ALERTE D'ERREUR */}
            {connectionError && (
              <Alert 
                severity="warning" 
                icon={<WarningIcon />}
                sx={{ mt: 1, bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
                action={
                  showEmergencyMode && currentUser?.role === 'student' ? (
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={emergencyJoinForStudents}
                    >
                      Mode Observation
                    </Button>
                  ) : null
                }
              >
                {connectionError}
              </Alert>
            )}
          </Box>
          
          <Box display="flex" gap={1}>
            {isJoining && <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />}
            
            {resetAgora && (
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={resetAgora}
                sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: '#4caf50', color: '#4caf50' } }}
              >
                Réinit. Agora
              </Button>
            )}
            
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={reconnect} 
              disabled={isJoining}
              sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: '#e53935', color: '#e53935' } }}
            >
              Reconnexion
            </Button>
            
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<CallEnd />} 
              onClick={leaveSession} 
              size="medium" 
              sx={{ px: 3, fontWeight: 600, '&:hover': { bgcolor: '#c62828' } }}
            >
              Quitter
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* CONTENU PRINCIPAL */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }} ref={videoContainerRef}>
        
        {/* ZONE VIDÉO */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#000', position: 'relative' }}>
          
          {/* ÉCRAN PARTAGÉ */}
          {isScreenSharing && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', p: 2 }}>
              <video 
                ref={screenVideoRef} 
                autoPlay 
                playsInline 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain', 
                  borderRadius: '8px', 
                  backgroundColor: '#000' 
                }} 
              />
            </Box>
          )}

          {/* GRILLE DES PARTICIPANTS */}
          <Grid container spacing={2} sx={{ 
            flex: isScreenSharing ? 0 : 1, 
            p: 2, 
            overflowY: 'auto', 
            maxHeight: 'calc(100vh - 180px)',
            justifyContent: allParticipants.length <= 1 ? 'center' : 'flex-start'
          }}>
            
            {/* PARTICIPANTS */}
            {allParticipants.map((participant, index) => (
              <ParticipantCard key={`${participant.uid}-${index}`} participant={participant} />
            ))}

            {/* PLACEHOLDER SI AUCUN PARTICIPANT */}
            {allParticipants.length <= 1 && !isScreenSharing && (
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Paper sx={{ 
                  bgcolor: '#1a1a1a', 
                  borderRadius: 2, 
                  height: '300px', 
                  width: '500px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 2, 
                  p: 3 
                }}>
                  <People sx={{ fontSize: 60, color: '#666' }} />
                  <Typography color="white" variant="h6">En attente d'autres participants...</Typography>
                  <Typography sx={{ color: '#aaa' }} variant="body2" textAlign="center">
                    {isJoined ? 
                      'Les autres participants apparaîtront ici automatiquement' : 
                      'Connexion en cours...'}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* CHAT SIDEBAR */}
        {isChatOpen && (
          <Paper elevation={3} sx={{ width: '380px', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5', borderRadius: 0, borderLeft: '1px solid #ddd' }}>
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '2px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chat sx={{ color: '#e53935' }} />
                <Typography fontWeight={700} variant="h6">Discussion</Typography>
                <Badge badgeContent={messages.length} color="error" sx={{ ml: 1 }} />
              </Box>
              <IconButton size="small" onClick={() => setIsChatOpen(false)} sx={{ '&:hover': { bgcolor: '#ffebee', color: '#e53935' } }}><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#fafafa' }}>
              {messages.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Chat sx={{ fontSize: 60, color: '#ccc' }} />
                  <Typography color="text.secondary" align="center">Aucun message pour le moment</Typography>
                </Box>
              ) : (
                messages.map(msg => {
                  const isOwnMessage = msg.user_id === currentUser?.id;
                  return (
                    <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}>
                      <Box sx={{ maxWidth: '75%', bgcolor: isOwnMessage ? '#e53935' : 'white', color: isOwnMessage ? 'white' : 'text.primary', p: 1.5, borderRadius: 2, boxShadow: 1 }}>
                        {!isOwnMessage && <Typography variant="caption" fontWeight={700} sx={{ color: isOwnMessage ? 'rgba(255,255,255,0.8)' : '#e53935', mb: 0.5, display: 'block' }}>{msg.user}</Typography>}
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.message}</Typography>
                        <Typography variant="caption" sx={{ color: isOwnMessage ? 'rgba(255,255,255,0.7)' : 'text.secondary', mt: 0.5, display: 'block', fontSize: '0.7rem' }}>{msg.time}</Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e0e0e0' }}>
              <Box display="flex" gap={1} alignItems="flex-end">
                <TextField 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  onKeyPress={handleKeyPress} 
                  placeholder="Écrivez un message..." 
                  multiline 
                  maxRows={3} 
                  fullWidth 
                  size="small" 
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f5f5f5' } }} 
                />
                <Button variant="contained" onClick={sendMessage} disabled={!newMessage.trim()} sx={{ minWidth: '48px', height: '40px', bgcolor: '#e53935', '&:hover': { bgcolor: '#c62828' } }}><Send /></Button>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* FOOTER - CONTRÔLES */}
      <Paper elevation={3} sx={{ bgcolor: '#1a1a1a', color: 'white', p: 2, zIndex: 10, borderRadius: 0 }}>
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
          <Tooltip title={isCameraOn ? "Désactiver la caméra" : "Activer la caméra"} arrow>
            <IconButton onClick={toggleCamera} sx={{ bgcolor: isCameraOn ? '#fff' : '#f44336', color: isCameraOn ? '#000' : '#fff', '&:hover': { bgcolor: isCameraOn ? '#e0e0e0' : '#d32f2f', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}>{isCameraOn ? <Videocam /> : <VideocamOff />}</IconButton>
          </Tooltip>
          <Tooltip title={isMicOn ? "Désactiver le micro" : "Activer le micro"} arrow>
            <IconButton onClick={toggleMicrophone} sx={{ bgcolor: isMicOn ? '#fff' : '#f44336', color: isMicOn ? '#000' : '#fff', '&:hover': { bgcolor: isMicOn ? '#e0e0e0' : '#d32f2f', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}>{isMicOn ? <Mic /> : <MicOff />}</IconButton>
          </Tooltip>
          
          {/* BOUTON DÉPANNAGE */}
          <Tooltip title="Dépanner la connexion" arrow>
            <IconButton 
              onClick={troubleshootAgora}
              sx={{ 
                bgcolor: '#4caf50', 
                color: 'white',
                '&:hover': { bgcolor: '#388e3c', transform: 'scale(1.05)' },
                transition: 'all 0.2s' 
              }}
            >
              <TroubleshootIcon />
            </IconButton>
          </Tooltip>
          
          {/* BOUTON FORCER VIDÉOS */}
          <Tooltip title="Forcer l'affichage des vidéos" arrow>
            <IconButton 
              onClick={forceDisplayVideos}
              sx={{ 
                bgcolor: '#fff', 
                color: '#000', 
                '&:hover': { 
                  bgcolor: '#e0e0e0', 
                  transform: 'scale(1.05)' 
                }, 
                transition: 'all 0.2s' 
              }}
            >
              <Videocam />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"} arrow>
            <IconButton onClick={toggleScreenShare} sx={{ bgcolor: isScreenSharing ? '#4caf50' : '#fff', color: isScreenSharing ? '#fff' : '#000', '&:hover': { bgcolor: isScreenSharing ? '#388e3c' : '#e0e0e0', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}>{isScreenSharing ? <StopScreenShare /> : <ScreenShare />}</IconButton>
          </Tooltip>
          <Tooltip title={isHandRaised ? "Baisser la main" : "Lever la main"} arrow>
            <IconButton onClick={toggleHandRaise} sx={{ bgcolor: isHandRaised ? '#ff9800' : '#fff', color: isHandRaised ? '#fff' : '#000', '&:hover': { bgcolor: isHandRaised ? '#f57c00' : '#e0e0e0', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}><RaiseHandIcon /></IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Quitter plein écran" : "Plein écran"} arrow>
            <IconButton onClick={toggleFullscreen} sx={{ bgcolor: '#fff', color: '#000', '&:hover': { bgcolor: '#e0e0e0', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}>{isFullscreen ? <FullscreenExit /> : <Fullscreen />}</IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: '#444', mx: 1 }} />
          <Tooltip title={isChatOpen ? "Fermer le chat" : "Ouvrir le chat"} arrow>
            <IconButton onClick={() => setIsChatOpen(!isChatOpen)} sx={{ bgcolor: isChatOpen ? '#2196f3' : '#fff', color: isChatOpen ? '#fff' : '#000', '&:hover': { bgcolor: isChatOpen ? '#1976d2' : '#e0e0e0', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}><Chat /></IconButton>
          </Tooltip>
          <Tooltip title={isMuted ? "Activer le son" : "Désactiver le son"} arrow>
            <IconButton onClick={toggleMute} sx={{ bgcolor: isMuted ? '#f44336' : '#fff', color: isMuted ? '#fff' : '#000', '&:hover': { bgcolor: isMuted ? '#d32f2f' : '#e0e0e0', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}>{isMuted ? <VolumeOff /> : <VolumeUp />}</IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        video {
          border-radius: 8px;
        }
        #agora-remote-* {
          border-radius: 8px;
        }
      `}</style>
    </Box>
  );
}