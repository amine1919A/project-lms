# backend/notifications/views.py - VERSION CORRIGÉE
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Endpoint spécifique pour les notifications non lues"""
        try:
            notifications = self.get_queryset().filter(is_read=False)
            serializer = self.get_serializer(notifications, many=True)
            
            return Response({
                'success': True,
                'count': notifications.count(),
                'notifications': serializer.data
            }, status=200)
        
        except Exception as e:
            logger.error(f"Erreur récupération notifications non lues: {str(e)}")
            return Response({
                'success': False,
                'error': 'Erreur serveur',
                'notifications': []
            }, status=200)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications comme lues"""
        try:
            updated = self.get_queryset().filter(is_read=False).update(is_read=True)
            return Response({
                "success": True,
                "detail": f"{updated} notifications marquées comme lues"
            })
        except Exception as e:
            logger.error(f"Erreur mark_all_read: {str(e)}")
            return Response({
                "success": False,
                "error": "Erreur lors de la mise à jour"
            }, status=500)

    @action(detail=True, methods=['post', 'patch'])
    def mark_read(self, request, pk=None):
        """Marquer une notification comme lue"""
        try:
            notification = self.get_object()
            notification.is_read = True
            notification.save()
            return Response({
                "success": True,
                "detail": "Notification marquée comme lue"
            })
        except Exception as e:
            logger.error(f"Erreur mark_read: {str(e)}")
            return Response({
                "success": False,
                "error": "Erreur lors de la mise à jour"
            }, status=500)

    @action(detail=False, methods=['post'])
    def send(self, request):
        """Envoyer une notification à un utilisateur"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        user_id = request.data.get('user_id')
        title = request.data.get('title', 'Notification')
        message = request.data.get('message')
        notification_type = request.data.get('type', 'info')
        
        if not user_id or not message:
            return Response({
                "success": False,
                "detail": "user_id et message requis"
            }, status=400)
        
        try:
            user = User.objects.get(id=user_id)
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type
            )
            
            return Response({
                "success": True,
                "detail": "Notification envoyée",
                "notification": NotificationSerializer(notification).data
            })
        except User.DoesNotExist:
            return Response({
                "success": False,
                "detail": "Utilisateur non trouvé"
            }, status=404)
        except Exception as e:
            logger.error(f"Erreur envoi notification: {str(e)}")
            return Response({
                "success": False,
                "error": str(e)
            }, status=500)

    @action(detail=False, methods=['get'])
    def pending_sessions(self, request):
        """Récupérer les sessions à venir avec notifications"""
        try:
            from schedule.models import TimeSlot
            
            user = request.user
            now = timezone.now()
            next_hour = now + timedelta(hours=1)
            
            if user.role == 'student':
                classes = user.enrolled_classes.all()
                sessions = TimeSlot.objects.filter(
                    subject__class_assigned__in=classes,
                    start_time__gte=now,
                    start_time__lte=next_hour
                ).select_related('subject', 'teacher')
                
            elif user.role == 'teacher':
                sessions = TimeSlot.objects.filter(
                    teacher=user,
                    start_time__gte=now,
                    start_time__lte=next_hour
                ).select_related('subject')
                
            else:
                sessions = TimeSlot.objects.none()
            
            data = []
            for session in sessions:
                time_diff = session.start_time - now
                minutes_left = int(time_diff.total_seconds() / 60)
                
                data.append({
                    'id': session.id,
                    'subject': session.subject.name,
                    'teacher': session.teacher.get_full_name() if user.role == 'student' else 'Vous',
                    'start_time': session.start_time,
                    'end_time': session.end_time,
                    'classroom': session.classroom,
                    'minutes_left': minutes_left,
                    'needs_notification': minutes_left <= 10 and minutes_left > 0
                })
            
            return Response({
                "success": True,
                "sessions": data
            })
        except Exception as e:
            logger.error(f"Erreur pending_sessions: {str(e)}")
            return Response({
                "success": False,
                "sessions": []
            })