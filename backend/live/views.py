# backend/live/views.py - VERSION COMPLÈTE CORRIGÉE (100% FONCTIONNELLE)
import logging
import random
import time
import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q
from django.conf import settings

from .models import LiveSession, LiveParticipant, ScreenShare
from .serializers import (
    LiveSessionSerializer, 
    LiveParticipantSerializer,
    ScreenShareSerializer, 
    CreateLiveSessionSerializer,
    JoinLiveSessionSerializer
)

# Agora imports
try:
    from agora_token_builder import RtcTokenBuilder
    AGORA_AVAILABLE = True
except ImportError:
    AGORA_AVAILABLE = False
    print("⚠️ Agora SDK not installed. Run: pip install agora-token-builder")

logger = logging.getLogger(__name__)

class LiveSessionViewSet(viewsets.ModelViewSet):
    queryset = LiveSession.objects.all()
    serializer_class = LiveSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CreateLiveSessionSerializer if self.action == 'create' else LiveSessionSerializer

    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['admin', 'superadmin']:
            return LiveSession.objects.all()
        
        if user.role == 'teacher':
            return LiveSession.objects.filter(teacher=user)
        
        if user.role == 'student':
            # 🔥 TOUTES les sessions live
            return LiveSession.objects.filter(status='live')
        
        return LiveSession.objects.none()

    # ------------------------------------------------------------------
    # CRÉER SESSION
    # ------------------------------------------------------------------
    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != 'teacher':
            return Response({'success': False, 'error': 'Seuls les enseignants peuvent créer des sessions'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        session = serializer.save(teacher=user, meeting_id=str(uuid.uuid4())[:12], status='scheduled')
        return Response({'success': True, 'data': LiveSessionSerializer(session).data}, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # DÉMARRER SESSION
    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        session = self.get_object()
        if session.teacher != request.user:
            return Response({'success': False, 'error': "Seul l'enseignant peut démarrer la session"}, status=status.HTTP_403_FORBIDDEN)

        session.status = 'live'
        session.start_time = timezone.now()
        session.save()

        LiveParticipant.objects.get_or_create(
            session=session, 
            user=request.user, 
            defaults={
                'is_presenter': True,
                'agora_uid': random.randint(100000, 999999)
            }
        )
        return Response({'success': True, 'message': 'Session démarrée', 'meeting_id': session.meeting_id})

    # ------------------------------------------------------------------
    # REJOINDRE SESSION
    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()
        user = request.user

        if session.status != 'live':
            return Response({'success': False, 'error': 'La session n\'est pas en direct'}, status=status.HTTP_400_BAD_REQUEST)

        if user.role == 'student':
            student_class = user.enrolled_classes.first()
            if not student_class:
                return Response({'success': False, 'error': 'Vous n\'êtes inscrit dans aucune classe'}, status=status.HTTP_403_FORBIDDEN)
            
            if not session.subject:
                return Response({'success': False, 'error': 'Session invalide (matière non définie)'}, status=status.HTTP_403_FORBIDDEN)
            
            if hasattr(session.subject, 'class_assigned') and session.subject.class_assigned:
                if session.subject.class_assigned.id != student_class.id:
                    student_subjects = student_class.subjects.all()
                    if session.subject not in student_subjects:
                        return Response({
                            'success': False, 
                            'error': f'Cette session est réservée aux étudiants de {session.subject.class_assigned.name}'
                        }, status=status.HTTP_403_FORBIDDEN)

        is_presenter = (user.role == 'teacher' and session.teacher == user)
        agora_uid = random.randint(100000, 999999)
        
        while LiveParticipant.objects.filter(session=session, agora_uid=agora_uid).exists():
            agora_uid = random.randint(100000, 999999)

        participant, created = LiveParticipant.objects.get_or_create(
            session=session,
            user=user,
            defaults={
                'is_presenter': is_presenter,
                'agora_uid': agora_uid
            }
        )

        if not created and participant.left_at:
            participant.left_at = None
            participant.save()

        return Response({
            'success': True,
            'message': 'Rejoint avec succès',
            'meeting_id': session.meeting_id,
            'is_presenter': participant.is_presenter,
            'agora_uid': participant.agora_uid,
            'user_info': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })

    # ------------------------------------------------------------------
    # TOKEN AGORA
    # ------------------------------------------------------------------
    # backend/live/views.py - CORRECTION CRITIQUE POUR LE TOKEN
    @action(detail=True, methods=['get'])
    def get_agora_token(self, request, pk=None):
        session = self.get_object()
        user = request.user

        if not AGORA_AVAILABLE:
            return Response({'success': False, 'error': 'Agora non configuré'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        app_id = getattr(settings, 'AGORA_APP_ID', None)
        app_certificate = getattr(settings, 'AGORA_APP_CERTIFICATE', None)
        
        # 🔥 VÉRIFICATION CRITIQUE DES CREDENTIALS
        if not app_id or app_id == "your-agora-app-id":
            logger.error('❌ AGORA_APP_ID non configuré ou invalide')
            return Response({'success': False, 'error': 'Configuration Agora manquante'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if not app_certificate or app_certificate == "your-agora-app-certificate":
            logger.error('❌ AGORA_APP_CERTIFICATE non configuré ou invalide')
            return Response({'success': False, 'error': 'Configuration Agora manquante'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # 🔥 TROUVER LE PARTICIPANT EXACT
            participant = LiveParticipant.objects.filter(
                session=session, 
                user=user, 
                left_at__isnull=True
            ).first()
            
            if not participant:
                # Si c'est l'enseignant, le créer automatiquement
                if user.role == 'teacher' and session.teacher == user:
                    agora_uid = random.randint(100000, 999999)
                    participant, created = LiveParticipant.objects.get_or_create(
                        session=session,
                        user=user,
                        defaults={
                            'is_presenter': True,
                            'agora_uid': agora_uid
                        }
                    )
                    logger.info(f"✅ Enseignant auto-créé: {user.username}, UID: {agora_uid}")
                else:
                    logger.error(f"❌ Participant non trouvé: {user.username}")
                    return Response({'success': False, 'error': 'Vous devez d\'abord rejoindre la session'}, 
                                status=status.HTTP_403_FORBIDDEN)

            # 🔥 S'ASSURER QUE L'UID AGORA EXISTE
            if not participant.agora_uid:
                participant.agora_uid = random.randint(100000, 999999)
                participant.save()
                logger.info(f"✅ UID généré: {participant.agora_uid}")

            # 🔥 CORRECTION DU RÔLE - IMPORTANT POUR LES ÉTUDIANTS
            # Les étudiants doivent avoir role=2 (audience)
            if user.role == 'teacher' and session.teacher == user:
                role = 1  # Publisher
            else:
                role = 2  # Subscriber (ÉTUDIANTS ET AUTRES)
            
            channel_name = session.meeting_id
            expiration = getattr(settings, 'AGORA_TOKEN_EXPIRATION', 3600)
            privilege_expired_ts = int(time.time()) + expiration

            logger.info(f"🔑 Génération token pour: {user.username}")
            logger.info(f"   - UID: {participant.agora_uid}")
            logger.info(f"   - Channel: {channel_name}")
            logger.info(f"   - Role: {'publisher' if role == 1 else 'subscriber'}")
            logger.info(f"   - Expiration: {expiration}s")

            try:
                # 🔥 GÉNÉRATION DU TOKEN AVEC VÉRIFICATION
                token = RtcTokenBuilder.buildTokenWithUid(
                    appId=app_id,
                    appCertificate=app_certificate,
                    channelName=channel_name,
                    uid=participant.agora_uid,
                    role=role,
                    privilegeExpiredTs=privilege_expired_ts
                )
                
                if not token:
                    raise ValueError("Token généré vide")
                    
                logger.info(f"✅ Token généré avec succès (premiers 20 chars): {token[:20]}...")
                
            except Exception as e:
                logger.error(f"❌ Erreur génération token Agora: {e}")
                # 🔥 FALLBACK: Générer un token simple sans privilèges
                token = RtcTokenBuilder.buildTokenWithUid(
                    appId=app_id,
                    appCertificate=app_certificate,
                    channelName=channel_name,
                    uid=participant.agora_uid,
                    role=2,  # Toujours subscriber en fallback
                    privilegeExpiredTs=privilege_expired_ts
                )
                logger.warning(f"⚠️ Token fallback généré")

            return Response({
                'success': True,
                'token': token,
                'channel': channel_name,
                'uid': participant.agora_uid,
                'appId': app_id,
                'role': 'publisher' if role == 1 else 'subscriber',
                'expiration': expiration,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role
                },
                'session': {
                    'id': session.id,
                    'title': session.title,
                    'meeting_id': session.meeting_id
                }
            })

        except Exception as e:
            logger.error(f"❌ Erreur critique get_agora_token: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({'success': False, 'error': 'Erreur interne du serveur'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ------------------------------------------------------------------
    # 🔥 ACTION ACTIVE - CORRECTION CRITIQUE
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        🔥 CORRECTION : TOUT LE MONDE VOIT TOUTES LES SESSIONS LIVE
        La validation d'accès se fait dans join(), pas ici
        """
        user = request.user
        
        logger.info(f"📱 /active/ appelé par {user.username} (rôle: {user.role})")
        
        # 🔥 TOUTES les sessions en direct, SANS FILTRE
        sessions = LiveSession.objects.filter(status='live')
        
        logger.info(f"📊 {sessions.count()} sessions live trouvées")
        
        # Log détaillé
        for session in sessions:
            logger.info(f"   📺 {session.title} (ID: {session.id}, Prof: {session.teacher.username})")
        
        # Sérialisation
        serializer = LiveSessionSerializer(sessions, many=True)
        
        return Response({
            'success': True,
            'count': sessions.count(),
            'results': serializer.data  # 🔥 'results' pour le frontend
        })

    # ------------------------------------------------------------------
    # AUTRES ACTIONS
    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        session = self.get_object()
        participant = LiveParticipant.objects.filter(session=session, user=request.user, left_at__isnull=True).first()
        if participant:
            participant.left_at = timezone.now()
            participant.save()
        return Response({'success': True, 'message': 'Vous avez quitté la session'})

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        session = self.get_object()
        participants = session.participants.filter(left_at__isnull=True)
        
        participants_data = []
        for participant in participants:
            participants_data.append({
                'id': participant.id,
                'user': {
                    'id': participant.user.id,
                    'username': participant.user.username,
                    'role': participant.user.role,
                    'first_name': participant.user.first_name,
                    'last_name': participant.user.last_name
                },
                'is_presenter': participant.is_presenter,
                'agora_uid': participant.agora_uid,
                'audio_enabled': participant.audio_enabled,
                'video_enabled': participant.video_enabled,
                'joined_at': participant.joined_at
            })
        
        return Response({
            'success': True,
            'count': participants.count(),
            'results': participants_data
        })

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        sessions = LiveSession.objects.filter(status='scheduled')
        serializer = LiveSessionSerializer(sessions, many=True)
        return Response({
            'success': True,
            'count': sessions.count(),
            'results': serializer.data
        })

class JoinSessionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = JoinLiveSessionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        meeting_id = serializer.validated_data['meeting_id']
        user = request.user
        
        try:
            session = LiveSession.objects.get(meeting_id=meeting_id, status='live')
            
            if user.role == 'student':
                student_class = user.enrolled_classes.first()
                if not student_class:
                    return Response({
                        "error": "Vous n'êtes inscrit dans aucune classe"
                    }, status=status.HTTP_403_FORBIDDEN)
                
                if session.subject and hasattr(session.subject, 'class_assigned'):
                    if session.subject.class_assigned.id != student_class.id:
                        student_subjects = student_class.subjects.all()
                        if session.subject not in student_subjects:
                            return Response({
                                "error": "Vous ne pouvez pas accéder à cette session"
                            }, status=status.HTTP_403_FORBIDDEN)
            
            is_presenter = (user.role == 'teacher' and session.teacher == user)
            agora_uid = random.randint(100000, 999999)
            
            participant, created = LiveParticipant.objects.get_or_create(
                session=session,
                user=user,
                defaults={
                    'is_presenter': is_presenter,
                    'agora_uid': agora_uid
                }
            )
            
            return Response({
                "success": True,
                "session": LiveSessionSerializer(session).data,
                "is_presenter": participant.is_presenter,
                "agora_uid": participant.agora_uid
            })
            
        except LiveSession.DoesNotExist:
            return Response({
                "error": "Session introuvable ou non en direct"
            }, status=status.HTTP_404_NOT_FOUND)

class ScreenShareViewSet(viewsets.ModelViewSet):
    queryset = ScreenShare.objects.all()
    serializer_class = ScreenShareSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ScreenShare.objects.filter(is_active=True)