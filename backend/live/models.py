# backend/live/models.py - VERSION FINALE CORRIGÉE
from django.db import models
from django.utils.crypto import get_random_string
from django.contrib.auth import get_user_model
from classes.models import Subject
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class LiveSession(models.Model):
    """
    Modèle pour les sessions live
    
    Champs clés:
    - meeting_id: Identifiant unique généré automatiquement
    - status: scheduled, live, ended, cancelled
    - teacher: Enseignant qui anime la session (NOT NULL)
    - subject: Matière de la session (NOT NULL)
    """
    
    STATUS_CHOICES = [
        ('scheduled', 'Programmée'),
        ('live', 'En cours'),
        ('ended', 'Terminée'),
        ('cancelled', 'Annulée'),
    ]
    
    # Champs obligatoires
    subject = models.ForeignKey(
        Subject, 
        on_delete=models.CASCADE, 
        related_name='live_sessions',
        help_text="Matière pour laquelle la session est créée"
    )
    teacher = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='hosted_sessions',
        limit_choices_to={'role': 'teacher'},
        help_text="Enseignant qui anime la session"
    )
    
    # Champs de description
    title = models.CharField(
        max_length=200,
        help_text="Titre de la session"
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Description optionnelle"
    )
    
    # Champs techniques
    meeting_id = models.CharField(
        max_length=50, 
        unique=True, 
        editable=False,
        help_text="ID unique générée automatiquement pour la réunion"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='scheduled',
        help_text="Statut actuel de la session"
    )
    
    # Champs temporels
    start_time = models.DateTimeField(
        auto_now_add=True,
        help_text="Heure de création/démarrage"
    )
    end_time = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Heure de fin (NULL si pas terminée)"
    )
    
    # Limitation des participants
    max_participants = models.IntegerField(
        default=50,
        help_text="Nombre maximum de participants"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_time']
        verbose_name = 'Session Live'
        verbose_name_plural = 'Sessions Live'
        indexes = [
            models.Index(fields=['teacher', '-start_time']),
            models.Index(fields=['status']),
            models.Index(fields=['meeting_id']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.subject.name}) - {self.teacher.username}"
    
    def save(self, *args, **kwargs):
        """Générer meeting_id si non présent"""
        if not self.meeting_id:
            self.meeting_id = get_random_string(10)
            logger.info(f"🔑 Generated meeting_id: {self.meeting_id}")
        super().save(*args, **kwargs)
    
    def is_active(self):
        """Retourne True si la session est en cours"""
        return self.status == 'live'
    
    def get_participant_count(self):
        """Retourne le nombre de participants actuels"""
        return self.participants.filter(left_at__isnull=True).count()


class LiveParticipant(models.Model):
    """
    Modèle pour tracker les participants d'une session live
    
    Enregistre:
    - Qui a participé
    - Quand ils ont rejoint/quitté
    - Si micro/caméra étaient activés
    - Si c'est un présentateur
    - agora_uid: UID unique pour Agora
    """
    
    session = models.ForeignKey(
        LiveSession, 
        on_delete=models.CASCADE, 
        related_name='participants',
        help_text="Session à laquelle participe l'utilisateur"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        help_text="Utilisateur qui participe"
    )
    
    # Temporel
    joined_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Quand l'utilisateur a rejoint"
    )
    left_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Quand l'utilisateur a quitté (NULL si toujours présent)"
    )
    
    # État de participation
    is_presenter = models.BooleanField(
        default=False,
        help_text="True si c'est l'enseignant ou un présentateur"
    )
    
    # Agora UID - NOUVEAU CHAMP
    agora_uid = models.BigIntegerField(
        null=True, 
        blank=True,
        unique=False,  # IMPORTANT: Peut être dupliqué dans différentes sessions
        help_text="UID unique pour Agora dans cette session"
    )
    
    # Statut média
    audio_enabled = models.BooleanField(
        default=True,
        help_text="Micro activé?"
    )
    video_enabled = models.BooleanField(
        default=True,
        help_text="Caméra activée?"
    )
    screen_sharing = models.BooleanField(
        default=False,
        help_text="Partage d'écran activé?"
    )
    
    class Meta:
        unique_together = ('session', 'user')
        verbose_name = 'Participant'
        verbose_name_plural = 'Participants'
        indexes = [
            models.Index(fields=['session', 'left_at']),
            models.Index(fields=['agora_uid']),
        ]
    
    def __str__(self):
        status = "🟢" if not self.left_at else "🔴"
        presenter = "🎤" if self.is_presenter else ""
        return f"{status} {presenter} {self.user.username} in {self.session.title}"
    
    def get_duration(self):
        """Retourne la durée de participation en secondes"""
        from django.utils import timezone
        end_time = self.left_at or timezone.now()
        duration = (end_time - self.joined_at).total_seconds()
        return int(duration)
    
    def is_active(self):
        """Retourne True si le participant est actif dans la session"""
        return self.left_at is None


class ScreenShare(models.Model):
    """
    Modèle pour tracker les partages d'écran
    
    Enregistre:
    - Qui partage son écran
    - Quand il a commencé/arrêté
    - ID du stream
    """
    
    session = models.ForeignKey(
        LiveSession, 
        on_delete=models.CASCADE, 
        related_name='screen_shares',
        help_text="Session dans laquelle l'écran est partagé"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        help_text="Utilisateur qui partage son écran"
    )
    
    # Stream
    stream_id = models.CharField(
        max_length=200,
        help_text="ID du stream WebRTC"
    )
    
    # Temporel
    started_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Quand le partage a commencé"
    )
    ended_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Quand le partage s'est arrêté"
    )
    
    # État
    is_active = models.BooleanField(
        default=True,
        help_text="Le partage est-il en cours?"
    )
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Partage d\'écran'
        verbose_name_plural = 'Partages d\'écran'
        indexes = [
            models.Index(fields=['session', 'is_active']),
        ]
    
    def __str__(self):
        return f"Screen share by {self.user.username} in {self.session.title}"
    
    def get_duration(self):
        """Retourne la durée du partage en secondes"""
        from django.utils import timezone
        end_time = self.ended_at or timezone.now()
        duration = (end_time - self.started_at).total_seconds()
        return int(duration)


# ===== ADMIN CONFIGURATION =====

from django.contrib import admin

@admin.register(LiveSession)
class LiveSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'subject', 'status', 'meeting_id', 'start_time', 'get_participant_count')
    list_filter = ('status', 'created_at', 'teacher', 'subject')
    search_fields = ('title', 'meeting_id', 'teacher__username', 'subject__name')
    readonly_fields = ('meeting_id', 'created_at', 'updated_at', 'get_participant_count')
    
    fieldsets = (
        ('Informations', {
            'fields': ('title', 'description', 'subject', 'teacher')
        }),
        ('État', {
            'fields': ('status', 'max_participants', 'get_participant_count')
        }),
        ('Technique', {
            'fields': ('meeting_id', 'start_time', 'end_time')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_participant_count(self, obj):
        return obj.get_participant_count()
    get_participant_count.short_description = 'Participants actifs'


@admin.register(LiveParticipant)
class LiveParticipantAdmin(admin.ModelAdmin):
    list_display = ('user', 'session', 'is_presenter', 'agora_uid', 'joined_at', 'left_at', 'is_active')
    list_filter = ('is_presenter', 'joined_at', 'session__status', 'session__subject')
    search_fields = ('user__username', 'user__email', 'session__title', 'agora_uid')
    readonly_fields = ('joined_at', 'agora_uid')
    list_select_related = ('user', 'session')
    
    fieldsets = (
        ('Participant', {
            'fields': ('user', 'session', 'is_presenter')
        }),
        ('Agora', {
            'fields': ('agora_uid',)
        }),
        ('Statut média', {
            'fields': ('audio_enabled', 'video_enabled', 'screen_sharing')
        }),
        ('Temporel', {
            'fields': ('joined_at', 'left_at')
        }),
    )
    
    def is_active(self, obj):
        return obj.is_active()
    is_active.boolean = True
    is_active.short_description = 'Actif'


@admin.register(ScreenShare)
class ScreenShareAdmin(admin.ModelAdmin):
    list_display = ('user', 'session', 'is_active', 'started_at', 'ended_at', 'get_duration')
    list_filter = ('is_active', 'started_at', 'session')
    search_fields = ('user__username', 'session__title')
    readonly_fields = ('started_at', 'ended_at', 'get_duration')
    
    fieldsets = (
        ('Partage', {
            'fields': ('user', 'session', 'stream_id')
        }),
        ('État', {
            'fields': ('is_active',)
        }),
        ('Temporel', {
            'fields': ('started_at', 'ended_at', 'get_duration')
        }),
    )
    
    def get_duration(self, obj):
        return f"{obj.get_duration()}s"
    get_duration.short_description = 'Durée'