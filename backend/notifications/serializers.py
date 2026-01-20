# backend/notifications/serializers.py
from rest_framework import serializers
from .models import Notification, ChatMessage


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'notification_type', 'is_read', 'created_at', 'scheduled_time']
        read_only_fields = ['id', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'session', 'subject', 'user', 'user_name', 'user_role', 'message', 'timestamp', 'is_deleted']
        read_only_fields = ['id', 'timestamp']