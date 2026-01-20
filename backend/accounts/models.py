# backend/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    )
    
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='student')
    approved = models.BooleanField(default=False)
    
    # IMPORTANT: Utiliser une référence string pour éviter l'import circulaire
    specialty = models.ForeignKey(
        'classes.Specialty',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.email} ({self.role})"
    
    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip() if full_name.strip() else self.username
    
    def clean(self):
        """Validation personnalisée"""
        if self.role == 'teacher' and not self.specialty:
            raise ValidationError({
                'specialty': 'Les enseignants doivent avoir une spécialité.'
            })
        
        if self.role == 'student' and self.specialty:
            self.specialty = None
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)