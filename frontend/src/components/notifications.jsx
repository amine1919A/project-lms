// src/components/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    loadNotifications();
    setupWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications/notifications/');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    }
  };

  const setupWebSocket = () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/notifications/${userId}/`);
    
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'notification') {
        toast.info(data.message);
        loadNotifications(); // Recharger les notifications
      }
    };

    socket.onopen = () => {
      console.log('Connecté aux notifications WebSocket');
    };

    socket.onclose = () => {
      console.log('Déconnecté des notifications WebSocket');
    };

    setWs(socket);
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/notifications/${id}/`, { read: true });
      loadNotifications();
    } catch (err) {
      console.error('Erreur marquer comme lu:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(
        unreadIds.map(id => api.patch(`/notifications/notifications/${id}/`, { read: true }))
      );
      loadNotifications();
    } catch (err) {
      console.error('Erreur marquer tout lu:', err);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
    
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="notifications-container">
      <button
        className="notifications-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  {!notification.read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notifications-footer">
              <button onClick={() => {/* Naviguer vers page complète */}}>
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
