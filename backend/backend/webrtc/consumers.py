# backend/webrtc/consumers.py
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from live.models import LiveSession, LiveParticipant, ScreenShare
from notifications.models import Notification

User = get_user_model()

class WebRTCConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'webrtc_{self.room_name}'
        self.user = self.scope['user']
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Vérifier si la session existe et l'utilisateur a accès
        has_access = await self.check_access(self.room_name)
        if not has_access:
            await self.close()
            return
        
        # Ajouter au groupe
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        
        # Enregistrer le participant
        await self.register_participant()
        
        # Informer les autres participants
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_teacher': self.user.role == 'teacher'
            }
        )
    
    async def disconnect(self, close_code):
        # Retirer du groupe
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Retirer le participant
        await self.remove_participant()
        
        # Informer les autres participants
        if hasattr(self, 'user'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': self.user.id,
                    'username': self.user.username
                }
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'offer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_offer',
                    'offer': data['offer'],
                    'from': self.user.id,
                    'to': data['to']
                }
            )
        
        elif message_type == 'answer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_answer',
                    'answer': data['answer'],
                    'from': self.user.id,
                    'to': data['to']
                }
            )
        
        elif message_type == 'ice_candidate':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ice_candidate',
                    'candidate': data['candidate'],
                    'from': self.user.id,
                    'to': data['to']
                }
            )
        
        elif message_type == 'toggle_mic':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'mic_toggled',
                    'user_id': self.user.id,
                    'is_muted': data['is_muted']
                }
            )
        
        elif message_type == 'toggle_camera':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'camera_toggled',
                    'user_id': self.user.id,
                    'is_camera_off': data['is_camera_off']
                }
            )
        
        elif message_type == 'screen_share':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'screen_shared',
                    'user_id': self.user.id,
                    'is_sharing': data['is_sharing'],
                    'stream_id': data.get('stream_id')
                }
            )
        
        elif message_type == 'chat_message':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': data['message'],
                    'user_id': self.user.id,
                    'username': self.user.username
                }
            )
    
    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_teacher': event['is_teacher']
        }))
    
    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    async def webrtc_offer(self, event):
        if event['to'] == self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'offer',
                'offer': event['offer'],
                'from': event['from']
            }))
    
    async def webrtc_answer(self, event):
        if event['to'] == self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'answer',
                'answer': event['answer'],
                'from': event['from']
            }))
    
    async def ice_candidate(self, event):
        if event['to'] == self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'ice_candidate',
                'candidate': event['candidate'],
                'from': event['from']
            }))
    
    async def mic_toggled(self, event):
        await self.send(text_data=json.dumps({
            'type': 'mic_toggled',
            'user_id': event['user_id'],
            'is_muted': event['is_muted']
        }))
    
    async def camera_toggled(self, event):
        await self.send(text_data=json.dumps({
            'type': 'camera_toggled',
            'user_id': event['user_id'],
            'is_camera_off': event['is_camera_off']
        }))
    
    async def screen_shared(self, event):
        await self.send(text_data=json.dumps({
            'type': 'screen_shared',
            'user_id': event['user_id'],
            'is_sharing': event['is_sharing'],
            'stream_id': event.get('stream_id')
        }))
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'user_id': event['user_id'],
            'username': event['username'],
            'timestamp': event.get('timestamp')
        }))
    
    @database_sync_to_async
    def check_access(self, meeting_id):
        try:
            session = LiveSession.objects.get(meeting_id=meeting_id, is_active=True)
            
            if self.user.role == 'teacher':
                return session.teacher == self.user
            elif self.user.role == 'student':
                # Vérifier si l'étudiant est dans la classe de la matière
                return self.user in session.subject.class_assigned.students.all()
            else:
                return False
        except LiveSession.DoesNotExist:
            return False
    
    @database_sync_to_async
    def register_participant(self):
        session = LiveSession.objects.get(meeting_id=self.room_name)
        participant, created = LiveParticipant.objects.get_or_create(
            session=session,
            user=self.user,
            defaults={'is_presenter': self.user.role == 'teacher'}
        )
        return participant
    
    @database_sync_to_async
    def remove_participant(self):
        try:
            session = LiveSession.objects.get(meeting_id=self.room_name)
            LiveParticipant.objects.filter(session=session, user=self.user).delete()
            
            # Vérifier si l'enseignant a quitté
            if self.user.role == 'teacher':
                session.is_active = False
                session.save()
        except:
            pass