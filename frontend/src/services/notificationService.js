// src/services/notificationService.js
import api from './api';

class NotificationService {
  // Récupérer les notifications non lues
  static async getUnreadNotifications() {
    try {
      const response = await api.get('/notifications/notifications/unread/');
      return response.data;
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      return [];
    }
  }

  // Marquer comme lu
  static async markAsRead(notificationId) {
    try {
      await api.patch(`/notifications/notifications/${notificationId}/read/`);
    } catch (error) {
      console.error('Erreur marquer comme lu:', error);
    }
  }

  // Marquer tout comme lu
  static async markAllAsRead() {
    try {
      await api.post('/notifications/notifications/mark-all-read/');
    } catch (error) {
      console.error('Erreur marquer tout lu:', error);
    }
  }

  // Envoyer une notification
  static async sendNotification(userId, message, type = 'info') {
    try {
      await api.post('/notifications/notifications/send/', {
        user_id: userId,
        message: message,
        type: type
      });
    } catch (error) {
      console.error('Erreur envoi notification:', error);
    }
  }

  // Notification de session à venir
  static async scheduleSessionNotification(sessionId, minutesBefore = 5) {
    try {
      await api.post('/notifications/schedule/session/', {
        session_id: sessionId,
        minutes_before: minutesBefore
      });
    } catch (error) {
      console.error('Erreur programmation notification:', error);
    }
  }

  // Connexion WebSocket aux notifications
  static connectWebSocket(userId, onMessage, onConnect, onDisconnect) {
    const token = localStorage.getItem('access_token');
    const ws = new WebSocket(
      `ws://localhost:8000/ws/notifications/${userId}/?token=${token}`
    );

    ws.onopen = () => {
      console.log('WebSocket notifications connecté');
      if (onConnect) onConnect();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    };

    ws.onclose = () => {
      console.log('WebSocket notifications déconnecté');
      if (onDisconnect) onDisconnect();
    };

    ws.onerror = (error) => {
      console.error('WebSocket notifications error:', error);
    };

    return ws;
  }
}

export default NotificationService;