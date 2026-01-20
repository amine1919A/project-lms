// src/hooks/useAgoraClient.js - Hook personnalisé
import { useState, useEffect, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

export default function useAgoraClient() {
  const [client, setClient] = useState(null);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  
  // Créer un client unique pour ce composant
  useEffect(() => {
    const newClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setClient(newClient);
    
    return () => {
      if (newClient) {
        newClient.leave();
      }
    };
  }, []);
  
  const joinChannel = useCallback(async (appId, channel, token, uid) => {
    if (!client) return;
    
    try {
      await client.join(appId, channel, token, uid);
      setIsJoined(true);
      
      // Créer et publier les tracks
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalTracks(tracks);
      await client.publish(tracks);
      
      // Setup listeners
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          setRemoteUsers(prev => {
            if (!prev.find(u => u.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });
        }
      });
      
      client.on("user-left", (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });
      
    } catch (error) {
      console.error('Erreur joinChannel:', error);
      throw error;
    }
  }, [client]);
  
  const leaveChannel = useCallback(async () => {
    if (client && isJoined) {
      await client.leave();
      setIsJoined(false);
      setRemoteUsers([]);
    }
    localTracks.forEach(track => track?.close());
    setLocalTracks([]);
  }, [client, isJoined, localTracks]);
  
  return {
    client,
    localTracks,
    remoteUsers,
    isJoined,
    joinChannel,
    leaveChannel
  };
}