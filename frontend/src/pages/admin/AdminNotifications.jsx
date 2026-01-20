// src/pages/admin/AdminNotifications.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './AdminNotifications.css';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications/notifications/');
      setNotifications(res.data);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayCount = res.data.filter(n => 
        new Date(n.created_at) >= today
      ).length;
      
      const unreadCount = res.data.filter(n => !n.is_read).length;
      
      setStats({
        total: res.data.length,
        unread: unreadCount,
        today: todayCount
      });
    } catch (err) {
      toast.error('Erreur chargement notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/notifications/${id}/`, { is_read: true });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setStats(prev => ({ ...prev, unread: prev.unread - 1 }));
    } catch (err) {
      toast.error('Erreur mise à jour');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/notifications/mark_all_read/');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({ ...prev, unread: 0 }));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      user_id: form.user_id.value,
      title: form.title.value,
      message: form.message.value,
      notification_type: form.notification_type.value
    };
    
    try {
      await api.post('/notifications/notifications/send/', data);
      toast.success('Notification envoyée');
      form.reset();
      loadNotifications();
    } catch (err) {
      toast.error('Erreur envoi notification');
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
    <div className="admin-notifications-container">
      <div className="page-header">
        <h1>🔔 Gestion des Notifications</h1>
        <p>Envoyez et gérez les notifications du système</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total notifications</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-content">
            <h3>{stats.unread}</h3>
            <p>Non lues</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.today}</h3>
            <p>Aujourd'hui</p>
          </div>
        </div>
      </div>

      <div className="notifications-content">
        <div className="send-notification-form">
          <h3>✉️ Envoyer une notification</h3>
          <form onSubmit={sendNotification}>
            <div className="form-group">
              <label>Destinataire (ID utilisateur)</label>
              <input
                type="number"
                name="user_id"
                placeholder="1"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Titre</label>
              <input
                type="text"
                name="title"
                placeholder="Titre de la notification"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Message</label>
              <textarea
                name="message"
                placeholder="Contenu du message..."
                rows="3"
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Type</label>
              <select name="notification_type">
                <option value="info">Information</option>
                <option value="warning">Avertissement</option>
                <option value="success">Succès</option>
                <option value="error">Erreur</option>
                <option value="reminder">Rappel</option>
              </select>
            </div>
            
            <button type="submit" className="btn-send">
              Envoyer la notification
            </button>
          </form>
        </div>

        <div className="notifications-list">
          <div className="list-header">
            <h3>📋 Toutes les notifications</h3>
            {stats.unread > 0 && (
              <button onClick={markAllAsRead} className="btn-mark-all">
                Tout marquer comme lu
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="loading">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="empty-notifications">
              <div className="empty-icon">📭</div>
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="notifications-table">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Titre</th>
                    <th>Message</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map(notification => (
                    <tr key={notification.id} className={notification.is_read ? '' : 'unread'}>
                      <td>{notification.user}</td>
                      <td>{notification.title}</td>
                      <td>{notification.message}</td>
                      <td>
                        <span className={`notification-type ${notification.notification_type}`}>
                          {notification.notification_type}
                        </span>
                      </td>
                      <td>{formatTime(notification.created_at)}</td>
                      <td>
                        {notification.is_read ? (
                          <span className="status-read">✓ Lu</span>
                        ) : (
                          <span className="status-unread">● Non lu</span>
                        )}
                      </td>
                      <td>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="btn-mark-read"
                          >
                            Marquer lu
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}