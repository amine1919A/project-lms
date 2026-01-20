# backend/chat/models.py
from django.db import models
from accounts.models import CustomUser
from classes.models import Class, Subject

class ChatRoom(models.Model):
    ROOM_TYPES = [
        ('private', 'Conversation privée'),
        ('group_class', 'Groupe de classe'),
        ('group_subject', 'Groupe de matière'),
    ]
    
    name = models.CharField(max_length=200)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_rooms')
    class_related = models.ForeignKey(Class, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_rooms')
    subject_related = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_room_type_display()})"
    
    # backend/chat/models.py - Correction de la méthode get_participants
    def get_participants(self):
        if self.room_type == 'private':
            return self.participants.all()
        elif self.room_type == 'group_class':
            return self.class_related.students.all() if self.class_related else CustomUser.objects.none()
        elif self.room_type == 'group_subject':
            # AJOUTEZ CES VÉRIFICATIONS
            if not self.subject_related:
                return CustomUser.objects.none()
            if not hasattr(self.subject_related, 'class_assigned'):
                return CustomUser.objects.none()
            if not self.subject_related.class_assigned:
                return CustomUser.objects.none()
        
            students = self.subject_related.class_assigned.students.all()
            teacher = [self.subject_related.teacher] if self.subject_related.teacher else []
            return list(students) + teacher
        return CustomUser.objects.none()

class RoomParticipant(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='chat_rooms')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_admin = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['room', 'user']

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    file = models.FileField(upload_to='chat/files/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"
    
    def mark_as_read(self, user):
        if not self.is_read and self.sender != user:
            self.is_read = True
            self.save()

class MessageReadReceipt(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='read_messages')
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user']