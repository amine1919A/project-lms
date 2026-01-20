# backend/notifications/models.py - VERSION COMPLÈTE CORRIGÉE

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('success', 'Succès'),
        ('error', 'Erreur'),
        ('reminder', 'Rappel'),
        ('course', 'Cours'),
        ('new_course', 'Nouveau cours'),
        ('live_session', 'Session live'),
        ('test', 'Test'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255, default="Notification")
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class ChatMessage(models.Model):
    """Messages de chat pour les sessions live et les matières"""
    # Relations optionnelles (soit session, soit subject)
    session = models.ForeignKey(
        'live.LiveSession', 
        on_delete=models.CASCADE, 
        related_name='chat_messages',
        null=True,
        blank=True
    )
    subject = models.ForeignKey(
        'classes.Subject', 
        on_delete=models.CASCADE, 
        related_name='chat_messages',
        null=True,
        blank=True
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
        verbose_name = 'Message de chat'
        verbose_name_plural = 'Messages de chat'
    
    def __str__(self):
        context = self.session or self.subject or "Sans contexte"
        return f"{self.user.username} - {context} - {self.timestamp}"