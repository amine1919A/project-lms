# backend/chat/serializers.py - VERSION COMPLÈTE AVEC LOGGING
import logging
from rest_framework import serializers
from .models import ChatRoom, RoomParticipant, Message
from accounts.serializers import UserSerializer
from classes.serializers import ClassSerializer, SubjectSerializer

logger = logging.getLogger(__name__)

class ChatRoomSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source='created_by', read_only=True)
    class_details = ClassSerializer(source='class_related', read_only=True)
    subject_details = SubjectSerializer(source='subject_related', read_only=True)
    participants_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'room_type', 'created_by', 'created_by_details',
            'class_related', 'class_details', 'subject_related', 'subject_details',
            'participants_count', 'last_message', 'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_participants_count(self, obj):
        try:
            return obj.get_participants().count()
        except Exception as e:
            logger.error(f"❌ Erreur get_participants_count pour room {obj.id}: {str(e)}")
            return 0
    
    def get_last_message(self, obj):
        try:
            last_msg = obj.messages.last()
            if last_msg:
                return {
                    'content': last_msg.content[:100],
                    'sender_name': last_msg.sender.username,
                    'created_at': last_msg.created_at
                }
            return None
        except Exception as e:
            logger.error(f"❌ Erreur get_last_message pour room {obj.id}: {str(e)}")
            return None
    
    def get_unread_count(self, obj):
        try:
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
            return 0
        except Exception as e:
            logger.error(f"❌ Erreur get_unread_count pour room {obj.id}: {str(e)}")
            return 0

class MessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    room_details = ChatRoomSerializer(source='room', read_only=True)
    time_ago = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'room', 'room_details', 'sender', 'sender_details',
            'content', 'file', 'file_url', 'file_name', 'file_size',
            'is_read', 'created_at', 'updated_at', 'time_ago'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_read']
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        try:
            return f"{timesince(obj.created_at, timezone.now())}"
        except:
            return ""
    
    def get_file_url(self, obj):
        if obj.file:
            from django.conf import settings
            try:
                return f"{settings.MEDIA_URL}{obj.file}"
            except:
                return ""
        return None