// src/context/AgoraContext.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const AgoraContext = createContext();

export function AgoraProvider({ children }) {
  const [client, setClient] = useState(null);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  const isInitializingRef = useRef(false);
  const isJoiningRef = useRef(false);
  const cleanupRef = useRef(false);
  const uidRef = useRef(null);
  const remoteUsersMapRef = useRef(new Map());
  const joinQueueRef = useRef([]);

  useEffect(() => {
    if (isInitializingRef.current) return;

    const init = async () => {
      try {
        isInitializingRef.current = true;
        console.log('🔄 Initialisation Agora SDK...');

        // 🔥 DÉSACTIVER LES LOGS POUR ÉVITER LES ERREURS DE CONNEXION
        AgoraRTC.setLogLevel(2); // 2 = WARN, 0 = NONE
        AgoraRTC.disableLogUpload();
        
        // 🔥 CORRECTION CRITIQUE : Configuration simplifiée sans udpport invalide
        const agoraClient = AgoraRTC.createClient({
          mode: "rtc",
          codec: "vp8",
          enableAutoUploadLog: false,
          enableDataChannel: true,
          // 🔥 SUPPRIMER LA CONFIGURATION TURN AVEC UDPPORT INVALIDE
          // Ne pas spécifier turnServer si non nécessaire
        });

        setClient(agoraClient);
        setIsInitialized(true);
        setInitializationError(null);
        console.log('✅ Client Agora initialisé avec succès');

        // Configurer les listeners
        setupListeners(agoraClient);

        // 🔥 TRAITER LA FILE D'ATTENTE DES CONNEXIONS
        processJoinQueue();

      } catch (error) {
        console.error('❌ Erreur initialisation Agora:', error);
        setIsInitialized(false);
        setInitializationError(error.message);
        
        // 🔥 TENTATIVE D'INITIALISATION DE SECOURS
        setTimeout(() => {
          if (!client && !isInitializingRef.current) {
            console.log('🔄 Tentative de réinitialisation...');
            isInitializingRef.current = false;
            init();
          }
        }, 3000);
      } finally {
        isInitializingRef.current = false;
      }
    };

    init();

    return () => {
      cleanupRef.current = true;
      cleanup();
    };
  }, []);

  // 🔥 NOUVELLE FONCTION : Traiter la file d'attente des connexions
  const processJoinQueue = () => {
    if (joinQueueRef.current.length > 0 && isInitialized && client) {
      console.log(`📋 Traitement de ${joinQueueRef.current.length} connexions en attente`);
      joinQueueRef.current.forEach(async (joinRequest) => {
        try {
          await joinChannel(...joinRequest.args);
          if (joinRequest.resolve) joinRequest.resolve(true);
        } catch (error) {
          if (joinRequest.reject) joinRequest.reject(error);
        }
      });
      joinQueueRef.current = [];
    }
  };

  const setupListeners = (agoraClient) => {
    if (!agoraClient) return;

    agoraClient.on("user-published", async (user, mediaType) => {
      try {
        console.log(`👤 User publié - UID: ${user.uid}, Type: ${mediaType}`);
        
        // S'abonner à l'utilisateur
        await agoraClient.subscribe(user, mediaType);
        
        if (mediaType === "video") {
          console.log(`🎥 Vidéo disponible pour UID: ${user.uid}`);
          
          const userWithVideo = {
            ...user,
            hasVideo: true,
            videoTrack: user.videoTrack,
            uid: user.uid
          };
          
          remoteUsersMapRef.current.set(user.uid, userWithVideo);
          
          setRemoteUsers(prevUsers => {
            const exists = prevUsers.find(u => u.uid === user.uid);
            if (!exists) {
              return [...prevUsers, userWithVideo];
            }
            return prevUsers.map(u => 
              u.uid === user.uid ? { 
                ...u, 
                hasVideo: true, 
                videoTrack: user.videoTrack 
              } : u
            );
          });
          
          setTimeout(() => {
            const playerElement = document.getElementById(`agora-remote-${user.uid}`);
            if (playerElement && user.videoTrack) {
              try {
                playerElement.innerHTML = '';
                user.videoTrack.play(playerElement);
                console.log(`✅ Vidéo jouée pour UID: ${user.uid}`);
              } catch (playError) {
                console.error(`❌ Erreur lecture vidéo UID ${user.uid}:`, playError);
              }
            }
          }, 500);
        }

        if (mediaType === "audio" && user.audioTrack) {
          console.log(`🔊 Audio disponible pour UID: ${user.uid}`);
          const userWithAudio = {
            ...user,
            audioTrack: user.audioTrack,
            uid: user.uid
          };
          
          remoteUsersMapRef.current.set(user.uid, userWithAudio);
          
          setRemoteUsers(prevUsers => {
            const exists = prevUsers.find(u => u.uid === user.uid);
            if (!exists) {
              return [...prevUsers, userWithAudio];
            }
            return prevUsers.map(u => 
              u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u
            );
          });
          
          user.audioTrack.play().catch(e => console.warn(`Audio play error: ${e}`));
        }

      } catch (error) {
        console.error(`❌ Erreur subscription user ${user.uid}:`, error);
      }
    });

    agoraClient.on("user-unpublished", (user, mediaType) => {
      console.log(`👋 User retiré - UID: ${user.uid}, Type: ${mediaType}`);
      
      if (mediaType === "video") {
        setRemoteUsers(prevUsers => 
          prevUsers.map(u => 
            u.uid === user.uid ? { ...u, hasVideo: false, videoTrack: null } : u
          )
        );
      }
    });

    agoraClient.on("user-left", (user) => {
      console.log(`🚪 User quitté - UID: ${user.uid}`);
      remoteUsersMapRef.current.delete(user.uid);
      setRemoteUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
    });

    agoraClient.on("connection-state-change", (curState, prevState) => {
      console.log(`🔄 État connexion: ${prevState} → ${curState}`);
      
      if (curState === 'CONNECTED' && prevState === 'RECONNECTING') {
        console.log('✅ Reconnexion réussie');
        localTracks.forEach(track => {
          if (track && track.setEnabled) {
            track.setEnabled(true);
          }
        });
      }
      
      if (curState === 'DISCONNECTED') {
        console.warn('⚠️ Déconnecté du canal');
      }
    });

    agoraClient.on("exception", (event) => {
      if (event.code === 1001 || event.msg?.includes('statscollector')) {
        return;
      }
      console.warn('⚠️ Exception Agora:', event);
    });
  };

  const joinChannel = async (appId, channel, token, uid, isPublisher = false) => {
    // 🔥 VÉRIFIER SI LE CLIENT EST INITIALISÉ
    if (!client || !isInitialized) {
      console.warn('⚠️ Client Agora non initialisé, mise en file d\'attente...');
      
      // Mettre en file d'attente
      return new Promise((resolve, reject) => {
        joinQueueRef.current.push({
          args: [appId, channel, token, uid, isPublisher],
          resolve,
          reject
        });
        
        // 🔥 TENTER DE RÉINITIALISER SI ERREUR
        if (initializationError && !isInitializingRef.current) {
          console.log('🔄 Tentative de réinitialisation suite à une erreur...');
          setTimeout(() => {
            if (!client) {
              const initAgora = async () => {
                try {
                  const agoraClient = AgoraRTC.createClient({
                    mode: "rtc",
                    codec: "vp8",
                    enableAutoUploadLog: false
                  });
                  setClient(agoraClient);
                  setIsInitialized(true);
                  setInitializationError(null);
                  console.log('✅ Client Agora réinitialisé');
                  processJoinQueue();
                } catch (error) {
                  console.error('❌ Échec réinitialisation:', error);
                  reject(new Error('Impossible d\'initialiser Agora'));
                }
              };
              initAgora();
            }
          }, 1000);
        } else {
          reject(new Error('Client Agora non initialisé'));
        }
      });
    }

    if (isJoiningRef.current || cleanupRef.current) {
      console.warn('⚠️ joinChannel bloqué - déjà en cours de connexion');
      return false;
    }

    try {
      isJoiningRef.current = true;
      console.log('🚀 Connexion au canal:', { 
        channel, 
        uid,
        isPublisher,
        appId: appId?.substring(0, 8) + '...'
      });

      if (!appId || !channel) {
        throw new Error(`Paramètres manquants: appId=${!!appId}, channel=${!!channel}`);
      }

      // 🔥 CORRECTION : SI TOKEN EST NULL/VIDE, ESSAYER SANS TOKEN
      const useToken = token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
      
      const finalUid = parseInt(uid) || 0;
      uidRef.current = finalUid;
      console.log(`🔥 UID final: ${finalUid}, Token: ${useToken ? 'oui' : 'non'}`);

      // Quitter si déjà connecté
      if (client.connectionState === 'CONNECTED' || client.connectionState === 'CONNECTING') {
        console.log('🔄 Déjà connecté, déconnexion d\'abord...');
        await client.leave();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 🔥 VIDER LES UTILISATEURS DISTANTS
      remoteUsersMapRef.current.clear();
      setRemoteUsers([]);

      // 🔥 CONNEXION SIMPLIFIÉE
      try {
        await client.join(
          appId,
          channel,
          useToken ? token : null,
          finalUid
        );
        
        setIsJoined(true);
        console.log(`✅ Canal rejoint: ${channel}, UID: ${finalUid}`);

        // 🔥 CRÉER ET PUBLIER LES TRACKS UNIQUEMENT SI C'EST UN PUBLISHER
        if (isPublisher) {
          try {
            console.log('🎥 Création des tracks pour publisher...');
            
            // Essayer de créer les tracks
            const tracks = await createLocalTracks();
            
            if (tracks.length > 0) {
              setLocalTracks(tracks);
              await client.publish(tracks);
              console.log(`✅ ${tracks.length} track(s) publiée(s) pour publisher`);
            } else {
              console.log('ℹ️ Publisher sans tracks locales');
            }

          } catch (trackError) {
            console.warn('⚠️ Erreur création/publier tracks:', trackError.message);
          }
        } else {
          console.log('👨‍🎓 Mode étudiant/subscriber: pas de publication de tracks');
        }

        return true;

      } catch (joinError) {
        console.error('❌ Erreur lors de la connexion:', joinError);
        
        // 🔥 TENTATIVE DE RECONNEXION SANS TOKEN
        if (useToken && joinError.message?.includes('invalid token')) {
          console.log('🔄 Tentative sans token...');
          try {
            await client.join(appId, channel, null, finalUid);
            setIsJoined(true);
            console.log(`✅ Connexion réussie sans token`);
            return true;
          } catch (noTokenError) {
            throw new Error(`Échec avec et sans token: ${noTokenError.message}`);
          }
        }
        
        throw joinError;
      }

    } catch (error) {
      console.error('❌ Erreur joinChannel:', error);
      
      // 🔥 PROPAGATION D'ERREUR AMÉLIORÉE
      throw error;
    } finally {
      isJoiningRef.current = false;
    }
  };

  // 🔥 NOUVELLE FONCTION : Création des tracks locales
  const createLocalTracks = async () => {
    try {
      const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          AEC: true,
          ANS: true,
          encoderConfig: {
            sampleRate: 48000,
            stereo: true,
            bitrate: 128
          }
        },
        {
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMin: 300,
            bitrateMax: 800
          },
          optimizationMode: 'motion',
          mirror: true,
          facingMode: 'user'
        }
      ).catch(async (error) => {
        console.warn('⚠️ Erreur création tracks complètes:', error.message);
        
        // 🔥 FALLBACK : ESSAYER SEULEMENT LA CAMÉRA
        try {
          const cameraOnly = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: 640,
              height: 480,
              frameRate: 15
            }
          });
          return [null, cameraOnly];
        } catch (cameraError) {
          console.warn('⚠️ Impossible de créer la caméra:', cameraError.message);
          return [null, null];
        }
      });

      const tracks = [];
      if (microphoneTrack) tracks.push(microphoneTrack);
      if (cameraTrack) tracks.push(cameraTrack);
      
      return tracks;
      
    } catch (error) {
      console.warn('⚠️ Erreur dans createLocalTracks:', error.message);
      return [];
    }
  };

  const leaveChannel = async () => {
    try {
      console.log('🛑 Déconnexion du canal...');

      // Arrêter les tracks locales
      localTracks.forEach(track => {
        try {
          if (track) {
            track.stop();
            track.close();
          }
        } catch (e) {
          console.warn('Erreur fermeture track:', e);
        }
      });

      // Quitter le canal
      if (client && (client.connectionState === 'CONNECTED' || client.connectionState === 'CONNECTING')) {
        await client.leave();
      }

      // Réinitialiser l'état
      setLocalTracks([]);
      remoteUsersMapRef.current.clear();
      setRemoteUsers([]);
      setIsJoined(false);
      uidRef.current = null;

      console.log('✅ Déconnexion terminée');

    } catch (error) {
      console.error('❌ Erreur leaveChannel:', error);
    }
  };

  const cleanup = async () => {
    await leaveChannel();
    setTimeout(() => {
      cleanupRef.current = false;
    }, 1000);
  };

  const toggleLocalAudio = () => {
    if (localTracks && localTracks[0]) {
      const enabled = !localTracks[0].enabled;
      localTracks[0].setEnabled(enabled);
      console.log(`🎤 Micro ${enabled ? 'activé' : 'désactivé'}`);
      return enabled;
    }
    return false;
  };

  const toggleLocalVideo = () => {
    if (localTracks && localTracks[1]) {
      const enabled = !localTracks[1].enabled;
      localTracks[1].setEnabled(enabled);
      console.log(`📷 Caméra ${enabled ? 'activée' : 'désactivée'}`);
      return enabled;
    }
    return false;
  };

  // 🔥 FONCTION POUR FORCER L'AFFICHAGE DES VIDÉOS
  const forcePlayRemoteVideos = () => {
    console.log('🔧 Forçage manuel des vidéos...');
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        const playerElement = document.getElementById(`agora-remote-${user.uid}`);
        if (playerElement) {
          try {
            playerElement.innerHTML = '';
            user.videoTrack.play(playerElement);
            console.log(`✅ Vidéo forcée pour UID: ${user.uid}`);
          } catch (error) {
            console.error(`❌ Erreur vidéo forcée UID ${user.uid}:`, error);
          }
        }
      }
    });
  };

  // 🔥 NOUVELLE FONCTION : Vérifier l'état
  const getStatus = () => {
    return {
      isInitialized,
      isJoined,
      hasClient: !!client,
      initializationError,
      clientStatus: client ? client.connectionState : 'NO_CLIENT',
      localTracksCount: localTracks.length,
      remoteUsersCount: remoteUsers.length,
      joinQueueLength: joinQueueRef.current.length
    };
  };

  // 🔥 NOUVELLE FONCTION : Réinitialiser Agora
  const resetAgora = async () => {
    console.log('🔄 Réinitialisation Agora...');
    await leaveChannel();
    setIsInitialized(false);
    setClient(null);
    setInitializationError(null);
    
    // Réinitialiser après un court délai
    setTimeout(() => {
      if (!isInitializingRef.current) {
        const initAgora = async () => {
          try {
            const agoraClient = AgoraRTC.createClient({
              mode: "rtc",
              codec: "vp8",
              enableAutoUploadLog: false
            });
            setClient(agoraClient);
            setIsInitialized(true);
            console.log('✅ Agora réinitialisé avec succès');
          } catch (error) {
            console.error('❌ Échec réinitialisation Agora:', error);
          }
        };
        initAgora();
      }
    }, 1000);
  };

  return (
    <AgoraContext.Provider value={{ 
      client,
      localTracks,
      remoteUsers,
      isJoined,
      isInitialized,
      joinChannel,
      leaveChannel,
      toggleLocalAudio,
      toggleLocalVideo,
      forcePlayRemoteVideos,
      getStatus,       // 🔥 NOUVEAU
      resetAgora       // 🔥 NOUVEAU
    }}>
      {children}
    </AgoraContext.Provider>
  );
}

export const useAgora = () => {
  const context = useContext(AgoraContext);
  if (!context) {
    throw new Error('useAgora doit être utilisé dans AgoraProvider');
  }
  return context;
};