# backend/schedule/models.py - VERSION CORRIGÉE
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from accounts.models import CustomUser
from classes.models import Class, Subject
import random
from datetime import datetime, timedelta, time
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

class WeeklySchedule(models.Model):
    class_assigned = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        related_name='weekly_schedules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('class_assigned',)
        verbose_name = "Emploi du temps de classe"
        verbose_name_plural = "Emplois du temps des classes"
    
    def __str__(self):
        return f"Emploi - {self.class_assigned.name}"
    
    def get_teachers(self):
        """Retourne tous les enseignants de cette classe"""
        teachers = []
        teacher_ids = set()
        
        for slot in self.time_slots.all():
            if slot.teacher and slot.teacher.id not in teacher_ids:
                teachers.append(slot.teacher)
                teacher_ids.add(slot.teacher.id)
        return teachers

class TeacherSchedule(models.Model):
    """Emploi du temps individuel d'un enseignant"""
    teacher = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='teacher_schedule',
        limit_choices_to={'role': 'teacher'}
    )
    weekly_hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="Nombre total d'heures par semaine"
    )
    max_hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=20.00,
        help_text="Nombre maximum d'heures par semaine"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Emploi du temps enseignant"
        verbose_name_plural = "Emplois du temps enseignants"
    
    def __str__(self):
        return f"Emploi - {self.teacher.get_full_name()}"
    
    def update_hours(self):
        """Met à jour le nombre d'heures de l'enseignant"""
        try:
            total_hours = 0.0
            time_slots = TimeSlot.objects.filter(teacher=self.teacher)
            
            for slot in time_slots:
                if slot.start_time and slot.end_time:
                    # Convertir les heures en décimal
                    start_dt = datetime.combine(datetime.today(), slot.start_time)
                    end_dt = datetime.combine(datetime.today(), slot.end_time)
                    
                    duration = end_dt - start_dt
                    hours = duration.total_seconds() / 3600  # Convertir en heures
                    total_hours += float(hours)
            
            self.weekly_hours = round(total_hours, 2)
            self.save(update_fields=['weekly_hours', 'updated_at'])
            return self.weekly_hours
        except Exception as e:
            logger.error(f"Erreur mise à jour heures enseignant {self.teacher.username}: {str(e)}")
            return self.weekly_hours
    
    def is_full(self):
        """Vérifie si l'enseignant a atteint son maximum d'heures"""
        try:
            return float(self.weekly_hours) >= float(self.max_hours)
        except:
            return False

class TimeSlot(models.Model):
    DAY_CHOICES = [
        ('Monday', 'Lundi'),
        ('Tuesday', 'Mardi'),
        ('Wednesday', 'Mercredi'),
        ('Thursday', 'Jeudi'),
        ('Friday', 'Vendredi')
    ]
    
    day = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='time_slots')
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'teacher'})
    classroom = models.CharField(max_length=50, blank=True, null=True)
    schedule = models.ForeignKey(
        WeeklySchedule, 
        on_delete=models.CASCADE, 
        related_name='time_slots', 
        null=True, 
        blank=True
    )
    teacher_schedule = models.ForeignKey(
        TeacherSchedule, 
        on_delete=models.CASCADE, 
        related_name='time_slots', 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['day', 'start_time']
        unique_together = ('teacher', 'day', 'start_time', 'end_time')
        verbose_name = "Créneau horaire"
        verbose_name_plural = "Créneaux horaires"
    
    def __str__(self):
        return f"{self.get_day_display()} {self.start_time}-{self.end_time} - {self.subject.name}"
    
    def save(self, *args, **kwargs):
        # Mettre à jour le champ teacher_schedule si nécessaire
        if self.teacher and not self.teacher_schedule:
            teacher_schedule, created = TeacherSchedule.objects.get_or_create(teacher=self.teacher)
            self.teacher_schedule = teacher_schedule
        
        # Sauvegarder
        super().save(*args, **kwargs)
        
        # Mettre à jour les heures de l'enseignant
        if self.teacher_schedule:
            try:
                self.teacher_schedule.update_hours()
            except Exception as e:
                logger.error(f"Erreur mise à jour heures après sauvegarde créneau: {str(e)}")

# Signaux
@receiver(models.signals.post_save, sender=CustomUser)
def create_teacher_schedule(sender, instance, created, **kwargs):
    """Créer automatiquement un emploi du temps pour les nouveaux enseignants"""
    try:
        if instance.role == 'teacher' and created:
            TeacherSchedule.objects.get_or_create(teacher=instance)
    except Exception as e:
        logger.error(f"Erreur création emploi enseignant: {str(e)}")

@receiver(models.signals.post_save, sender=TimeSlot)
def update_teacher_schedule_on_slot_change(sender, instance, created, **kwargs):
    """Mettre à jour l'emploi de l'enseignant quand un créneau change"""
    try:
        if instance.teacher:
            teacher_schedule, created = TeacherSchedule.objects.get_or_create(teacher=instance.teacher)
            teacher_schedule.update_hours()
    except Exception as e:
        logger.error(f"Erreur mise à jour emploi enseignant: {str(e)}")