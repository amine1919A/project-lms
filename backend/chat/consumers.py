# backend/chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Message, ChatRoom

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return
        
        self.room_group_name = f'chat_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'send_message':
            await self.send_message(data)
        elif action == 'mark_read':
            await self.mark_message_read(data)
    
    async def send_message(self, data):
        room_id = data.get('room_id')
        content = data.get('content')
        
        if not room_id or not content:
            return
        
        message = await self.create_message(room_id, content)
        
        # Envoyer le message à tous les participants
        participants = await self.get_room_participants(room_id)
        
        for participant in participants:
            if participant.id != self.user.id:
                await self.channel_layer.group_send(
                    f'chat_{participant.id}',
                    {
                        'type': 'chat_message',
                        'message': await self.serialize_message(message)
                    }
                )
    
    async def mark_message_read(self, data):
        message_id = data.get('message_id')
        if message_id:
            await self.mark_as_read(message_id)
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message']
        }))
    
    @database_sync_to_async
    def create_message(self, room_id, content):
        room = ChatRoom.objects.get(id=room_id)
        message = Message.objects.create(
            room=room,
            sender=self.user,
            content=content
        )
        return message
    
    @database_sync_to_async
    def serialize_message(self, message):
        from .serializers import MessageSerializer
        return MessageSerializer(message).data
    
    @database_sync_to_async
    def get_room_participants(self, room_id):
        room = ChatRoom.objects.get(id=room_id)
        return list(room.get_participants())
    
    @database_sync_to_async
    def mark_as_read(self, message_id):
        message = Message.objects.get(id=message_id)
        message.is_read = True
        message.save()