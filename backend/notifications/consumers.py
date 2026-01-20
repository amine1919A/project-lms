# backend/notifications/consumers.py - VERSION COMPLÈTE CORRIGÉE
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from live.models import LiveSession
from notifications.models import ChatMessage, Notification
from classes.models import Subject, Class

User = get_user_model()

# ============================================
# 1. CONSOMMATEUR POUR LES SESSIONS LIVE
# ============================================
class LiveSessionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.meeting_id = self.scope['url_route']['kwargs']['meeting_id']
        self.room_group_name = f'live_{self.meeting_id}'
        
        # Vérifier l'accès
        if await self.can_access_session():
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            
            # Notifier les autres participants
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'user': self.scope['user'].username,
                    'user_id': self.scope['user'].id
                }
            )
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user': self.scope['user'].username,
                    'user_id': self.scope['user'].id
                }
            )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if data['type'] == 'chat_message':
                await self.handle_chat_message(data)
            elif data['type'] == 'media_state':
                await self.handle_media_state(data)
            elif data['type'] == 'screen_share':
                await self.handle_screen_share(data)
            elif data['type'] == 'whiteboard':
                await self.handle_whiteboard(data)
            elif data['type'] == 'raise_hand':
                await self.handle_raise_hand(data)
            elif data['type'] == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def handle_chat_message(self, data):
        # Sauvegarder le message
        chat_msg = await self.save_chat_message(data['message'])
        
        # Diffuser aux participants
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': data['message'],
                'user': self.scope['user'].username,
                'user_id': self.scope['user'].id,
                'timestamp': chat_msg.timestamp.isoformat() if chat_msg else None,
                'is_teacher': self.scope['user'].role == 'teacher'
            }
        )

    async def handle_media_state(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'media_state_update',
                'user_id': self.scope['user'].id,
                'audio_enabled': data.get('audio_enabled', True),
                'video_enabled': data.get('video_enabled', True),
                'screen_sharing': data.get('screen_sharing', False)
            }
        )

    async def handle_screen_share(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'screen_share_update',
                'user_id': self.scope['user'].id,
                'stream_id': data.get('stream_id'),
                'is_active': data.get('is_active', False)
            }
        )

    async def handle_whiteboard(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'whiteboard_update',
                'user_id': self.scope['user'].id,
                'action': data.get('action'),
                'data': data.get('data')
            }
        )

    async def handle_raise_hand(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'raise_hand',
                'user_id': self.scope['user'].id,
                'user': self.scope['user'].username
            }
        )

    # Handlers pour les événements
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'user': event['user'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp'],
            'is_teacher': event['is_teacher']
        }))

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user': event['user'],
            'user_id': event['user_id']
        }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user': event['user'],
            'user_id': event['user_id']
        }))

    async def media_state_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'media_state_update',
            'user_id': event['user_id'],
            'audio_enabled': event['audio_enabled'],
            'video_enabled': event['video_enabled'],
            'screen_sharing': event['screen_sharing']
        }))

    async def screen_share_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'screen_share_update',
            'user_id': event['user_id'],
            'stream_id': event['stream_id'],
            'is_active': event['is_active']
        }))

    async def whiteboard_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'whiteboard_update',
            'user_id': event['user_id'],
            'action': event['action'],
            'data': event['data']
        }))

    async def raise_hand(self, event):
        await self.send(text_data=json.dumps({
            'type': 'raise_hand',
            'user': event['user'],
            'user_id': event['user_id']
        }))

    @database_sync_to_async
    def can_access_session(self):
        try:
            session = LiveSession.objects.get(meeting_id=self.meeting_id)
            user = self.scope['user']
            
            if user.is_anonymous:
                return False
            
            # Enseignant de la session
            if user.role == 'teacher' and session.teacher == user:
                return True
            
            # Étudiant de la classe
            if user.role == 'student':
                return user in session.subject.class_assigned.students.all()
            
            # Admin
            if user.role in ['admin', 'superadmin']:
                return True
            
            return False
        except LiveSession.DoesNotExist:
            return False

    @database_sync_to_async
    def save_chat_message(self, message):
        try:
            session = LiveSession.objects.get(meeting_id=self.meeting_id)
            return ChatMessage.objects.create(
                session=session,
                user=self.scope['user'],
                message=message
            )
        except Exception as e:
            print(f"Erreur sauvegarde message: {e}")
            return None

# ============================================
# 2. CONSOMMATEUR POUR LE CHAT DES MATIÈRES
# ============================================
class SubjectChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.subject_id = self.scope['url_route']['kwargs']['subject_id']
        self.room_group_name = f'subject_chat_{self.subject_id}'
        
        if await self.can_access_subject():
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            
            # Envoyer l'historique des messages
            history = await self.get_chat_history()
            await self.send(text_data=json.dumps({
                'type': 'history',
                'messages': history
            }))
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if data['type'] == 'chat_message':
                # Sauvegarder le message
                chat_msg = await self.save_subject_chat_message(data['message'])
                
                # Diffuser à tous les participants
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': data['message'],
                        'user': self.scope['user'].username,
                        'user_id': self.scope['user'].id,
                        'timestamp': chat_msg.timestamp.isoformat() if chat_msg else None,
                        'user_role': self.scope['user'].role,
                        'is_teacher': self.scope['user'].role == 'teacher'
                    }
                )
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'user': event['user'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp'],
            'user_role': event['user_role'],
            'is_teacher': event['is_teacher']
        }))

    @database_sync_to_async
    def can_access_subject(self):
        try:
            subject = Subject.objects.get(id=self.subject_id)
            user = self.scope['user']
            
            if user.is_anonymous:
                return False
            
            # Enseignant de la matière
            if user.role == 'teacher' and subject.teacher == user:
                return True
            
            # Étudiant de la classe
            if user.role == 'student':
                return user in subject.class_assigned.students.all()
            
            # Admin
            if user.role in ['admin', 'superadmin']:
                return True
            
            return False
        except Subject.DoesNotExist:
            return False

    @database_sync_to_async
    def save_subject_chat_message(self, message):
        try:
            subject = Subject.objects.get(id=self.subject_id)
            
            # Créer le message
            chat_message = ChatMessage.objects.create(
                subject=subject,
                user=self.scope['user'],
                message=message
            )
            
            # Créer des notifications
            if self.scope['user'].role == 'teacher':
                # Notifier les étudiants
                students = subject.class_assigned.students.all()
                for student in students:
                    if student != self.scope['user']:
                        Notification.objects.create(
                            user=student,
                            title=f"Nouveau message de {self.scope['user'].username}",
                            message=f"{subject.name}: {message[:100]}...",
                            notification_type='info'
                        )
            else:
                # Notifier l'enseignant
                if subject.teacher and subject.teacher != self.scope['user']:
                    Notification.objects.create(
                        user=subject.teacher,
                        title=f"Message de {self.scope['user'].username}",
                        message=f"{subject.name}: {message[:100]}...",
                        notification_type='info'
                    )
            
            return chat_message
        except Exception as e:
            print(f"Erreur sauvegarde message matière: {e}")
            return None

    @database_sync_to_async
    def get_chat_history(self):
        try:
            subject = Subject.objects.get(id=self.subject_id)
            messages = ChatMessage.objects.filter(
                subject=subject
            ).select_related('user').order_by('-timestamp')[:50]
            
            history = []
            for msg in messages:
                history.append({
                    'id': msg.id,
                    'user': msg.user.username,
                    'user_id': msg.user.id,
                    'message': msg.message,
                    'timestamp': msg.timestamp.isoformat(),
                    'user_role': msg.user.role,
                    'is_teacher': msg.user.role == 'teacher'
                })
            
            return history
        except Exception as e:
            print(f"Erreur historique: {e}")
            return []

# ============================================
# 3. CONSOMMATEUR POUR LES NOTIFICATIONS
# ============================================
class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
            return

        self.user_id = self.scope["user"].id
        self.room_group_name = f"notifications_{self.user_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Envoi des notifications non lues
        unread = await self.get_unread_notifications()
        for notif in unread:
            await self.send(text_data=json.dumps({
                'type': 'notification',
                'id': notif['id'],
                'title': notif['title'],
                'message': notif['message'],
                'notification_type': notif['notification_type'],
                'created_at': notif['created_at']
            }))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'mark_read':
                await self.mark_all_read()
            elif data.get('type') == 'mark_as_read':
                await self.mark_as_read(data.get('notification_id'))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    @database_sync_to_async
    def get_unread_notifications(self):
        try:
            return list(
                Notification.objects.filter(
                    user=self.scope["user"], 
                    is_read=False
                ).values('id', 'title', 'message', 'notification_type', 'created_at')
            )
        except Exception as e:
            print(f"Erreur récupération notifications: {e}")
            return []

    @database_sync_to_async
    def mark_all_read(self):
        try:
            Notification.objects.filter(
                user=self.scope["user"], 
                is_read=False
            ).update(is_read=True)
        except Exception as e:
            print(f"Erreur marquer toutes lues: {e}")

    @database_sync_to_async
    def mark_as_read(self, notification_id):
        try:
            Notification.objects.filter(
                id=notification_id,
                user=self.scope["user"]
            ).update(is_read=True)
        except Exception as e:
            print(f"Erreur marquer comme lue: {e}")