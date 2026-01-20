# backend/live/serializers.py - VERSION FINALE FONCTIONNELLE
from rest_framework import serializers
from .models import LiveSession, LiveParticipant, ScreenShare
from accounts.serializers import UserSerializer
from classes.serializers import SubjectSerializer
from classes.models import Subject
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class LiveParticipantSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    agora_uid = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = LiveParticipant
        fields = [
            'id', 'user', 'user_details', 'joined_at', 'left_at', 
            'is_presenter', 'agora_uid', 'audio_enabled', 'video_enabled', 'screen_sharing'
        ]
        read_only_fields = [
            'joined_at', 'left_at', 'id', 'agora_uid',
            'audio_enabled', 'video_enabled', 'screen_sharing'
        ]


class LiveSessionSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)
    teacher_details = UserSerializer(source='teacher', read_only=True)
    participants = LiveParticipantSerializer(many=True, read_only=True)
    participants_count = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveSession
        fields = [
            'id', 'title', 'description', 'subject', 'subject_details',
            'teacher', 'teacher_details', 'meeting_id', 'status', 
            'start_time', 'end_time', 'max_participants', 'participants',
            'participants_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'meeting_id', 'created_at', 'updated_at', 'teacher', 'id',
            'participants', 'participants_count', 'is_active'
        ]
    
    def get_participants_count(self, obj):
        return obj.participants.filter(left_at__isnull=True).count()
    
    def get_is_active(self, obj):
        return obj.status == 'live'


class ScreenShareSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = ScreenShare
        fields = [
            'id', 'session', 'user', 'user_details', 'stream_id',
            'started_at', 'ended_at', 'is_active'
        ]
        read_only_fields = ['started_at', 'ended_at', 'id']


class CreateLiveSessionSerializer(serializers.Serializer):
    """
    🔥 CRITIQUE: Sérialiseur pour création de session
    Doit être un Serializer (pas ModelSerializer) car on fait des validations custom
    """
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.IntegerField(required=True)
    max_participants = serializers.IntegerField(
        required=False, 
        default=50, 
        min_value=1, 
        max_value=500
    )
    
    def validate_subject(self, value):
        """Vérifier que la matière existe et que l'enseignant l'enseigne"""
        try:
            subject = Subject.objects.get(id=value)
            user = self.context['request'].user
            
            logger.info(f"🔍 Validation matière - ID: {value}, Nom: {subject.name}")
            
            # Vérifier que l'enseignant enseigne cette matière
            if subject.teacher != user:
                logger.error(f"❌ Enseignant {user.username} n'enseigne pas {subject.name}")
                raise serializers.ValidationError(
                    f"Vous n'enseignez pas la matière '{subject.name}'"
                )
            
            logger.info(f"✅ Matière validée: {subject.name}")
            # 🔥 Retourner l'ID, pas l'objet Subject
            return value
            
        except Subject.DoesNotExist:
            logger.error(f"❌ Matière ID {value} non trouvée")
            raise serializers.ValidationError(f"Matière avec l'ID {value} n'existe pas")
        except Exception as e:
            logger.error(f"❌ Erreur validation matière: {str(e)}")
            raise serializers.ValidationError(f"Erreur lors de la validation: {str(e)}")
    
    def validate(self, data):
        """Validation complète des données"""
        user = self.context['request'].user
        
        logger.info(f"🔍 Validation complète - Utilisateur: {user.username}, Rôle: {user.role}")
        
        # Vérifier le rôle
        if user.role != 'teacher':
            logger.error(f"❌ Utilisateur {user.username} n'est pas enseignant")
            raise serializers.ValidationError("Seuls les enseignants peuvent créer des sessions")
        
        # Vérifier max_participants
        max_participants = data.get('max_participants', 50)
        if not isinstance(max_participants, int):
            try:
                data['max_participants'] = int(max_participants)
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "max_participants doit être un nombre entier valide"
                )
        
        # S'assurer que max_participants est dans les limites
        if data['max_participants'] < 1:
            data['max_participants'] = 1
        elif data['max_participants'] > 500:
            data['max_participants'] = 500
        
        logger.info(f"✅ Validation complète réussie")
        return data
    
    def create(self, validated_data):
        """Créer la session avec l'enseignant connecté"""
        user = self.context['request'].user
        subject_id = validated_data.get('subject')
        
        try:
            # Récupérer la matière
            subject = Subject.objects.get(id=subject_id)
            
            # Valeurs par défaut pour le titre
            title = validated_data.get('title')
            if not title or title.strip() == '':
                title = f"Session Live {subject.name} - {timezone.now().strftime('%d/%m/%Y %H:%M')}"
            
            # Créer la session
            session = LiveSession.objects.create(
                title=title,
                description=validated_data.get('description', ''),
                subject=subject,
                teacher=user,
                status='scheduled',
                max_participants=int(validated_data.get('max_participants', 50))
            )
            
            logger.info(f"✅ Session créée avec succès")
            logger.info(f"   ID: {session.id}")
            logger.info(f"   Meeting ID: {session.meeting_id}")
            logger.info(f"   Titre: {session.title}")
            logger.info(f"   Matière: {session.subject.name}")
            logger.info(f"   Enseignant: {session.teacher.username}")
            logger.info(f"   Max participants: {session.max_participants}")
            
            return session
            
        except Subject.DoesNotExist:
            logger.error(f"❌ Matière {subject_id} n'existe pas")
            raise serializers.ValidationError(f"Matière {subject_id} n'existe pas")
        except Exception as e:
            logger.error(f"❌ Erreur création session: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise serializers.ValidationError(f"Erreur lors de la création de la session: {str(e)}")


class JoinLiveSessionSerializer(serializers.Serializer):
    """Sérialiseur pour rejoindre une session par meeting_id"""
    
    meeting_id = serializers.CharField(max_length=50, required=True)
    
    def validate_meeting_id(self, value):
        """Vérifier que la session existe et est active"""
        try:
            session = LiveSession.objects.get(meeting_id=value)
            
            # Vérifier que la session est en cours
            if session.status != 'live':
                logger.warning(f"⚠️ Session {value} n'est pas en direct (statut: {session.status})")
                raise serializers.ValidationError(
                    f"La session '{session.title}' n'est pas en direct"
                )
            
            logger.info(f"✅ Meeting ID validé: {value} - Session: {session.title}")
            return value
            
        except LiveSession.DoesNotExist:
            logger.error(f"❌ Meeting ID {value} non trouvé")
            raise serializers.ValidationError(
                f"Session avec l'ID '{value}' n'existe pas"
            )
    
    def validate(self, data):
        """Validation supplémentaire si nécessaire"""
        return data


class ParticipantInfoSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les informations des participants"""
    
    user_info = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = LiveParticipant
        fields = [
            'id', 'user_info', 'is_presenter', 'agora_uid',
            'audio_enabled', 'video_enabled', 'joined_at'
        ]
        read_only_fields = fields


class AgoraTokenSerializer(serializers.Serializer):
    """Sérialiseur pour la réponse du token Agora"""
    
    success = serializers.BooleanField()
    token = serializers.CharField()
    channel = serializers.CharField()
    uid = serializers.IntegerField()
    appId = serializers.CharField()
    role = serializers.CharField()
    user = serializers.DictField()
    participant = serializers.DictField(required=False)
    session = serializers.DictField(required=False)


class LeaveSessionSerializer(serializers.Serializer):
    """Sérialiseur pour quitter une session"""
    
    session_id = serializers.IntegerField(required=True)
    
    def validate_session_id(self, value):
        """Vérifier que la session existe"""
        try:
            LiveSession.objects.get(id=value)
            return value
        except LiveSession.DoesNotExist:
            raise serializers.ValidationError(f"Session ID {value} n'existe pas")


class SessionStatusSerializer(serializers.Serializer):
    """Sérialiseur pour changer le statut d'une session"""
    
    status = serializers.ChoiceField(
        choices=['scheduled', 'live', 'ended', 'cancelled']
    )
    
    def validate_status(self, value):
        """Validation du statut"""
        valid_statuses = ['scheduled', 'live', 'ended', 'cancelled']
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Statut invalide. Doit être parmi: {', '.join(valid_statuses)}"
            )
        return value