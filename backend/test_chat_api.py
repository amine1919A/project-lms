# test_chat_api.py
import os
import django
import logging

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from classes.models import Class, Subject
from chat.models import ChatRoom, RoomParticipant

# Configuration du logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_my_chats_for_user(user_id):
    """Teste la logique get_queryset pour un utilisateur"""
    try:
        user = CustomUser.objects.get(id=user_id)
        logger.info(f"🔍 Test pour utilisateur: {user.username} (role: {user.role})")
        
        if user.role == 'student':
            # Pour les étudiants
            classes = user.enrolled_classes.all()
            logger.info(f"📚 Classes: {[c.name for c in classes]}")
            
            subjects = Subject.objects.filter(class_assigned__in=classes)
            logger.info(f"📖 Matières: {[s.name for s in subjects]}")
            
            # Testez chaque partie
            private_rooms = ChatRoom.objects.filter(
                room_type='private',
                participants__user=user
            ).distinct()
            logger.info(f"💬 Salles privées: {private_rooms.count()}")
            
            class_rooms = ChatRoom.objects.filter(
                room_type='group_class',
                class_related__in=classes
            ).distinct()
            logger.info(f"🏫 Groupes de classe: {class_rooms.count()}")
            
            subject_rooms = ChatRoom.objects.filter(
                room_type='group_subject',
                subject_related__in=subjects
            ).distinct()
            logger.info(f"📚 Groupes de matière: {subject_rooms.count()}")
            
            all_rooms = (private_rooms | class_rooms | subject_rooms).distinct()
            logger.info(f"✅ Total salles: {all_rooms.count()}")
            
            # Testez le serializer sur chaque salle
            from chat.serializers import ChatRoomSerializer
            from rest_framework.test import APIRequestFactory
            
            factory = APIRequestFactory()
            request = factory.get('/')
            request.user = user
            
            for room in all_rooms:
                try:
                    serializer = ChatRoomSerializer(room, context={'request': request})
                    data = serializer.data
                    logger.info(f"✅ Room {room.id} - {room.name}: OK")
                except Exception as e:
                    logger.error(f"❌ Room {room.id} - {room.name}: {str(e)}")
                    
    except Exception as e:
        logger.error(f"❌ Erreur dans test: {str(e)}", exc_info=True)

if __name__ == "__main__":
    # Testez avec votre ID d'utilisateur
    test_my_chats_for_user(1)