# backend/chat/urls.py - AJOUTER CES ROUTES
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    
    # Routes existantes
    path('rooms/my_chats/', 
         ChatRoomViewSet.as_view({'get': 'my_chats'}), 
         name='my-chats'),
    
    path('rooms/create_private_chat/', 
         ChatRoomViewSet.as_view({'post': 'create_private_chat'}), 
         name='create-private-chat'),
    
    path('rooms/create_class_group/',  # NOUVEAU
         ChatRoomViewSet.as_view({'post': 'create_class_group'}), 
         name='create-class-group'),
    
    path('rooms/create_subject_group/',  # NOUVEAU
         ChatRoomViewSet.as_view({'post': 'create_subject_group'}), 
         name='create-subject-group'),
    
    path('messages/room_messages/', 
         MessageViewSet.as_view({'get': 'room_messages'}), 
         name='room-messages'),
     path('rooms/available_contacts/', 
         ChatRoomViewSet.as_view({'get': 'available_contacts'}), 
         name='available-contacts'),
]