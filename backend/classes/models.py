# backend/classes/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

# Utiliser get_user_model() pour éviter les imports circulaires
User = get_user_model()

class Specialty(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    
    class Meta:
        verbose_name_plural = "Specialties"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Class(models.Model):
    name = models.CharField(max_length=50, unique=True)
    max_students = models.IntegerField(default=30)
    
    # CORRECTION : Utiliser get_user_model() directement
    students = models.ManyToManyField(
        User,
        related_name='enrolled_classes',
        blank=True,
        # Enlever limit_choices_to car il cause des problèmes avec l'API
    )
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = "Classes"
    
    def __str__(self):
        return self.name
    
    def student_count(self):
        """Retourne le nombre d'étudiants approuvés dans la classe"""
        return self.students.filter(role='student', approved=True).count()
    
    def is_full(self):
        return self.student_count() >= self.max_students
    
    def clean(self):
        """Validation personnalisée"""
        # S'assurer que le nom est unique
        if Class.objects.filter(name=self.name).exclude(id=self.id).exists():
            raise ValidationError(f"Une classe avec le nom '{self.name}' existe déjà.")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Subject(models.Model):
    name = models.CharField(max_length=100)
    class_assigned = models.ForeignKey(
        Class, 
        on_delete=models.CASCADE, 
        related_name='subjects'
    )
    specialty = models.ForeignKey(
        Specialty, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='subjects'
    )
    teacher = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teaching_subjects'
        # Enlever limit_choices_to pour éviter les problèmes
    )
    
    class Meta:
        unique_together = ('name', 'class_assigned')
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.class_assigned.name})"
    
    def clean(self):
        """Validation de la cohérence enseignant-spécialité"""
        if self.teacher and self.teacher.role != 'teacher':
            raise ValidationError("Seuls les enseignants peuvent être assignés à une matière.")
        
        if self.teacher and self.specialty:
            if self.teacher.specialty and self.teacher.specialty != self.specialty:
                raise ValidationError(
                    f"L'enseignant {self.teacher.get_full_name()} est spécialisé en "
                    f"{self.teacher.specialty.name}, mais cette matière est associée à "
                    f"{self.specialty.name}."
                )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)