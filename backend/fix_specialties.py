import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from classes.models import Specialty

print("=== CORRECTION DES SPÉCIALITÉS DES ENSEIGNANTS ===")

# Mapping des professeurs vers leurs spécialités
teacher_specialties = {
    "prof.cyber@iteam.university": "Cybersecurity",
    "prof.math@iteam.university": "Math",
    "prof.info@iteam.university": "Génie Logiciel",
    "prof.reseau@iteam.university": "Réseaux & Sécurité",
    "prof.cyber2@iteam.university": "Cybersecurity",
    "prof.ai@iteam.university": "Intelligence Artificielle",
}

# Correction
for email, specialty_name in teacher_specialties.items():
    try:
        teacher = CustomUser.objects.get(email=email, role='teacher')
        specialty = Specialty.objects.get(name=specialty_name)
        
        teacher.specialty = specialty
        teacher.save()
        
        print(f"✅ {email} → {specialty_name}")
        
    except CustomUser.DoesNotExist:
        print(f"❌ {email} non trouvé")
    except Specialty.DoesNotExist:
        print(f"❌ Spécialité '{specialty_name}' non trouvée")

# Vérification finale
print("\n=== ÉTAT FINAL DES ENSEIGNANTS ===")
for teacher in CustomUser.objects.filter(role='teacher'):
    status = "✅" if teacher.specialty else "❌"
    specialty_name = teacher.specialty.name if teacher.specialty else "AUCUNE"
    print(f"{status} {teacher.email}: {specialty_name}")

print("\n=== STATISTIQUES ===")
print(f"Total enseignants: {CustomUser.objects.filter(role='teacher').count()}")
print(f"Avec spécialité: {CustomUser.objects.filter(role='teacher', specialty__isnull=False).count()}")
print(f"Sans spécialité: {CustomUser.objects.filter(role='teacher', specialty__isnull=True).count()}")