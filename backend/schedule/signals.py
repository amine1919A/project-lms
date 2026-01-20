# schedule/signals.py → VERSION 100% FONCTIONNELLE

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

# Import correct de CustomUser (évite les imports circulaires)
User = get_user_model()

from .models import TimeSlot, TeacherSchedule
import logging

logger = logging.getLogger(__name__)

# Signal 1 : Créer automatiquement un TeacherSchedule quand un prof est créé
@receiver(post_save, sender=User)
def create_teacher_schedule(sender, instance, created, **kwargs):
    if created and instance.role == 'teacher':
        try:
            TeacherSchedule.objects.get_or_create(teacher=instance)
            logger.info(f"TeacherSchedule créé automatiquement pour {instance.get_full_name()}")
        except Exception as e:
            logger.error(f"Erreur création TeacherSchedule pour {instance.username}: {e}")

# Signal 2 : Mettre à jour les heures de l'enseignant à chaque changement de TimeSlot
@receiver([post_save, post_delete], sender=TimeSlot)
def update_teacher_schedule_on_slot_change(sender, instance, **kwargs):
    if instance.teacher:
        try:
            teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=instance.teacher)
            teacher_schedule.update_hours()
        except Exception as e:
            logger.error(f"Erreur mise à jour heures enseignant {instance.teacher}: {e}")