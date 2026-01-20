// src/components/AgoraVideoCall.jsx - SANS ERREUR D'IMPORT

import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { Box, Paper, Button, Stack, LinearProgress, Typography } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff } from '@mui/icons-material';

// Import Agora de manière sécurisée
let AgoraRTC = null;

const AgoraVideoCall = ({ sessionId, meetingId }) => {
  const [client, setClient] = useState(null);
  const [localTracks, setLocalTracks] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [error, setError] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});

  // Charger Agora de manière dynamique
  useEffect(() => {
    const loadAgoraSDK = async () => {
      try {
        if (!AgoraRTC) {
          // Import dynamique
          const Agora = await import('agora-rtc-sdk-ng');
          AgoraRTC = Agora.default;
          console.log('✅ Agora SDK chargé');
        }
      } catch (err) {
        console.error('❌ Erreur chargement Agora:', err);
        setError('Agora SDK non disponible. Installez: npm install agora-rtc-sdk-ng');
        setLoading(false);
      }
    };

    loadAgoraSDK();
  }, []);

  useEffect(() => {
    if (!AgoraRTC) return;

    const initAgora = async () => {
      try {
        setLoading(true);
        console.log('🎥 Initializing Agora...');

        // ✅ 1. Récupérer le token du backend
        const tokenResponse = await api.get(
          `/live/sessions/${sessionId}/get_agora_token/`
        );
        
        const { token, channel, uid, appId } = tokenResponse.data;
        console.log(`✅ Token reçu pour channel: ${channel}`);

        // ✅ 2. Créer le client Agora
        const agoraClient = AgoraRTC.createClient({ 
          mode: 'rtc', 
          codec: 'vp9'
        });

        // ✅ 3. Event: Utilisateur distant publie vidéo
        agoraClient.on('user-published', async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);
          console.log(`👤 User ${user.uid} published ${mediaType}`);

          if (mediaType === 'video') {
            setRemoteUsers(prev => ({
              ...prev,
              [user.uid]: user
            }));

            // Jouer la vidéo
            setTimeout(() => {
              const videoContainer = document.getElementById(`remote-${user.uid}`);
              if (videoContainer && user.videoTrack) {
                user.videoTrack.play(videoContainer);
              }
            }, 100);
          }

          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        // ✅ 4. Event: Utilisateur distant supprime vidéo
        agoraClient.on('user-unpublished', (user, mediaType) => {
          console.log(`👤 User ${user.uid} unpublished ${mediaType}`);
          
          if (mediaType === 'video') {
            setRemoteUsers(prev => {
              const updated = { ...prev };
              delete updated[user.uid];
              return updated;
            });
          }
        });

        // ✅ 5. Event: Utilisateur quitte
        agoraClient.on('user-left', (user) => {
          console.log(`👤 User ${user.uid} left`);
          setRemoteUsers(prev => {
            const updated = { ...prev };
            delete updated[user.uid];
            return updated;
          });
        });

        // ✅ 6. Se connecter au channel
        await agoraClient.join(appId, channel, token, uid);
        console.log(`✅ Joined channel: ${channel}`);

        // ✅ 7. Créer les tracks RÉELS
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        console.log('✅ Tracks créées (micro + caméra)');

        // ✅ 8. Afficher sa vidéo LOCALE
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
          console.log('✅ Vidéo locale affichée');
        }

        // ✅ 9. Publier les tracks
        await agoraClient.publish([audioTrack, videoTrack]);
        console.log('✅ Tracks publiées');

        // Sauvegarder l'état
        setLocalTracks({ audioTrack, videoTrack });
        setClient(agoraClient);
        setLoading(false);

      } catch (err) {
        console.error('❌ Agora init error:', err);
        setLoading(false);
        
        // Erreurs courantes
        if (err.message?.includes('permission')) {
          setError('❌ Veuillez autoriser l\'accès à la caméra et au microphone');
        } else if (err.message?.includes('NotFoundError')) {
          setError('❌ Caméra ou microphone non trouvé');
        } else {
          setError(`❌ Erreur: ${err.message}`);
        }
      }
    };

    if (sessionId && meetingId) {
      initAgora();
    }

    // ✅ Cleanup: Quitter proprement
    return () => {
      if (client) {
        if (localTracks?.audioTrack) localTracks.audioTrack.close();
        if (localTracks?.videoTrack) localTracks.videoTrack.close();
        client.leave();
        console.log('✅ Agora cleanup');
      }
    };
  }, [sessionId, meetingId]);

  // ✅ Toggle Micro
  const toggleMic = async () => {
    if (!localTracks?.audioTrack) return;

    if (isMicOn) {
      localTracks.audioTrack.setEnabled(false);
      setIsMicOn(false);
      console.log('🔇 Micro désactivé');
    } else {
      localTracks.audioTrack.setEnabled(true);
      setIsMicOn(true);
      console.log('🔊 Micro activé');
    }
  };

  // ✅ Toggle Caméra
  const toggleCamera = async () => {
    if (!localTracks?.videoTrack) return;

    if (isCameraOn) {
      localTracks.videoTrack.setEnabled(false);
      setIsCameraOn(false);
      console.log('📹 Caméra désactivée');
    } else {
      localTracks.videoTrack.setEnabled(true);
      setIsCameraOn(true);
      console.log('📹 Caméra activée');
    }
  };

  // Afficher les erreurs
  if (error) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#000'
      }}>
        <Typography color="error" sx={{ mb: 2, fontSize: '1.2rem' }}>
          {error}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Pour installer Agora, exécutez:
        </Typography>
        <code style={{ 
          bgcolor: '#222', 
          color: '#0f0',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          npm install agora-rtc-sdk-ng
        </code>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#000'
      }}>
        <LinearProgress sx={{ width: '50%', mb: 2 }} />
        <Typography style={{ color: 'white' }}>
          Ouverture de la caméra...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 1,
      p: 1,
      bgcolor: '#000',
      overflow: 'auto'
    }}>
      {/* VIDÉO LOCALE */}
      <Paper sx={{
        position: 'relative',
        bgcolor: '#222',
        minHeight: '300px',
        overflow: 'hidden'
      }}>
        <div
          ref={localVideoRef}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
        <Box sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.5)',
          p: 1,
          borderRadius: 1
        }}>
          <Typography fontWeight="bold" variant="body2">
            Vous
          </Typography>
        </Box>

        {/* Contrôles */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            bottom: 10,
            right: 10
          }}
        >
          <Button
            size="small"
            variant="contained"
            color={isMicOn ? 'success' : 'error'}
            startIcon={isMicOn ? <Mic /> : <MicOff />}
            onClick={toggleMic}
          >
            {isMicOn ? 'Micro' : 'Off'}
          </Button>

          <Button
            size="small"
            variant="contained"
            color={isCameraOn ? 'success' : 'error'}
            startIcon={isCameraOn ? <Videocam /> : <VideocamOff />}
            onClick={toggleCamera}
          >
            {isCameraOn ? 'Caméra' : 'Off'}
          </Button>
        </Stack>
      </Paper>

      {/* VIDÉOS DISTANTES */}
      {Object.keys(remoteUsers).map(uid => (
        <Paper
          key={uid}
          sx={{
            position: 'relative',
            bgcolor: '#333',
            minHeight: '300px',
            overflow: 'hidden'
          }}
        >
          <div
            id={`remote-${uid}`}
            ref={el => remoteVideosRef.current[uid] = el}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
          <Box sx={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.5)',
            p: 1,
            borderRadius: 1
          }}>
            <Typography fontWeight="bold" variant="body2">
              Participant {uid}
            </Typography>
          </Box>
        </Paper>
      ))}

      {/* Si aucun participant distant */}
      {Object.keys(remoteUsers).length === 0 && (
        <Paper sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#333',
          minHeight: '300px',
          color: 'white'
        }}>
          <Typography>
            En attente d'autres participants...
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AgoraVideoCall;