# backend/init_simple.py
import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from classes.models import Specialty, Class, Subject
from django.contrib.auth.hashers import make_password

User = get_user_model()

def create_simple_data():
    print("=== CRÉATION DES DONNÉES INITIALES ===")
    
    # 1. Créer les spécialités
    specialties = {}
    for name in ['Cybersécurité', 'Intelligence Artificielle', 'Réseaux et Cloud', 'Développement Web', 'Mathématiques Appliquées']:
        spec, created = Specialty.objects.get_or_create(name=name)
        specialties[name] = spec
        if created:
            print(f"✅ Spécialité créée: {name}")
        else:
            print(f"⚠️  Spécialité existe déjà: {name}")
    
    # 2. Créer des classes
    classes_dict = {}
    for name in ['L3-CS-2025', 'L3-AI-2025', 'L3-NET-2025', 'M1-CS-2025', 'M1-AI-2025']:
        cls, created = Class.objects.get_or_create(name=name)
        classes_dict[name] = cls
        if created:
            print(f"✅ Classe créée: {name}")
        else:
            print(f"⚠️  Classe existe déjà: {name}")
    
    # 3. S'assurer que le superadmin existe et est configuré
    try:
        superadmin, created = User.objects.get_or_create(
            email='superadmin@iteam.university',
            defaults={
                'username': 'superadmin',
                'password': make_password('SuperAdmin2025'),
                'first_name': 'Super',
                'last_name': 'Admin',
                'role': 'superadmin',
                'approved': True,
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            print("✅ Superadmin créé: superadmin@iteam.university")
        else:
            # Mettre à jour le superadmin existant
            superadmin.role = 'superadmin'
            superadmin.approved = True
            superadmin.is_staff = True
            superadmin.is_superuser = True
            superadmin.save()
            print("✅ Superadmin mis à jour")
    except Exception as e:
        print(f"❌ Erreur avec superadmin: {e}")
    
    # 4. Créer un admin
    try:
        admin, created = User.objects.get_or_create(
            email='admin@iteam.university',
            defaults={
                'username': 'admin',
                'password': make_password('Admin2025'),
                'first_name': 'Admin',
                'last_name': 'Principal',
                'role': 'admin',
                'approved': True,
                'is_staff': True,
                'is_superuser': False
            }
        )
        if created:
            print("✅ Admin créé: admin@iteam.university")
        else:
            admin.role = 'admin'
            admin.approved = True
            admin.is_staff = True
            admin.save()
            print("✅ Admin mis à jour")
    except Exception as e:
        print(f"❌ Erreur avec admin: {e}")
    
    # 5. Créer des enseignants
    teachers_data = [
        {'email': 'prof.cyber@iteam.university', 'username': 'profcyber', 
         'first_name': 'Ahmed', 'last_name': 'Benali', 'specialty': 'Cybersécurité'},
        {'email': 'prof.ai@iteam.university', 'username': 'profai',
         'first_name': 'Nadia', 'last_name': 'Said', 'specialty': 'Intelligence Artificielle'},
        {'email': 'prof.reseau@iteam.university', 'username': 'profreseau',
         'first_name': 'Leila', 'last_name': 'Mourad', 'specialty': 'Réseaux et Cloud'},
        {'email': 'prof.web@iteam.university', 'username': 'profweb',
         'first_name': 'Karim', 'last_name': 'El Amrani', 'specialty': 'Développement Web'},
        {'email': 'prof.math@iteam.university', 'username': 'profmath',
         'first_name': 'Youssef', 'last_name': 'Hassani', 'specialty': 'Mathématiques Appliquées'},
    ]
    
    for teacher_data in teachers_data:
        try:
            teacher, created = User.objects.get_or_create(
                email=teacher_data['email'],
                defaults={
                    'username': teacher_data['username'],
                    'password': make_password('Prof2025'),
                    'first_name': teacher_data['first_name'],
                    'last_name': teacher_data['last_name'],
                    'role': 'teacher',
                    'specialty': specialties[teacher_data['specialty']],
                    'approved': True,
                    'is_staff': False,
                    'is_superuser': False
                }
            )
            if created:
                print(f"✅ Enseignant créé: {teacher_data['email']} ({teacher_data['specialty']})")
            else:
                # Mettre à jour l'enseignant existant
                teacher.role = 'teacher'
                teacher.specialty = specialties[teacher_data['specialty']]
                teacher.approved = True
                teacher.save()
                print(f"✅ Enseignant mis à jour: {teacher_data['email']}")
        except Exception as e:
            print(f"❌ Erreur avec enseignant {teacher_data['email']}: {e}")
    
    # 6. Créer des matières
    subjects_data = [
        # L3-CS-2025
        {'name': 'Cryptographie', 'class_name': 'L3-CS-2025', 'specialty': 'Cybersécurité'},
        {'name': 'Sécurité Réseau', 'class_name': 'L3-CS-2025', 'specialty': 'Cybersécurité'},
        {'name': 'Éthique Hacking', 'class_name': 'L3-CS-2025', 'specialty': 'Cybersécurité'},
        
        # L3-AI-2025
        {'name': 'Machine Learning', 'class_name': 'L3-AI-2025', 'specialty': 'Intelligence Artificielle'},
        {'name': 'Deep Learning', 'class_name': 'L3-AI-2025', 'specialty': 'Intelligence Artificielle'},
        {'name': 'Vision par Ordinateur', 'class_name': 'L3-AI-2025', 'specialty': 'Intelligence Artificielle'},
        
        # L3-NET-2025
        {'name': 'Réseaux TCP/IP', 'class_name': 'L3-NET-2025', 'specialty': 'Réseaux et Cloud'},
        {'name': 'Cloud Computing', 'class_name': 'L3-NET-2025', 'specialty': 'Réseaux et Cloud'},
        {'name': 'Virtualisation', 'class_name': 'L3-NET-2025', 'specialty': 'Réseaux et Cloud'},
        
        # M1-CS-2025
        {'name': 'Sécurité Avancée', 'class_name': 'M1-CS-2025', 'specialty': 'Cybersécurité'},
        {'name': 'Forensique Numérique', 'class_name': 'M1-CS-2025', 'specialty': 'Cybersécurité'},
        
        # M1-AI-2025
        {'name': 'NLP Avancé', 'class_name': 'M1-AI-2025', 'specialty': 'Intelligence Artificielle'},
        {'name': 'Robotique', 'class_name': 'M1-AI-2025', 'specialty': 'Intelligence Artificielle'},
    ]
    
    for subj_data in subjects_data:
        try:
            subject, created = Subject.objects.get_or_create(
                name=subj_data['name'],
                class_assigned=classes_dict[subj_data['class_name']],
                defaults={
                    'specialty': specialties[subj_data['specialty']]
                }
            )
            if created:
                print(f"✅ Matière créée: {subj_data['name']} ({subj_data['class_name']})")
            else:
                print(f"⚠️  Matière existe déjà: {subj_data['name']}")
        except Exception as e:
            print(f"❌ Erreur avec matière {subj_data['name']}: {e}")
    
    # 7. Statistiques finales
    print("\n" + "="*60)
    print("📊 RÉCAPITULATIF DES DONNÉES CRÉÉES:")
    print(f"Spécialités: {Specialty.objects.count()}")
    print(f"Classes: {Class.objects.count()}")
    print(f"Matières: {Subject.objects.count()}")
    print(f"Utilisateurs totaux: {User.objects.count()}")
    
    print("\n👥 Répartition par rôle:")
    for role_code, role_name in User.ROLE_CHOICES:
        count = User.objects.filter(role=role_code).count()
        print(f"  - {role_name}: {count}")
    
    print("\n🎓 Enseignants par spécialité:")
    for spec_name, spec_obj in specialties.items():
        count = User.objects.filter(role='teacher', specialty=spec_obj).count()
        print(f"  - {spec_name}: {count} enseignant(s)")
    
    print("="*60)
    print("\n✅ DONNÉES INITIALES CRÉÉES AVEC SUCCÈS!")
    print("\n🔑 Identifiants de test:")
    print("   Superadmin: superadmin@iteam.university / SuperAdmin2025")
    print("   Admin: admin@iteam.university / Admin2025")
    print("   Enseignants: prof.xxxx@iteam.university / Prof2025")
    print("\n🚀 Pour démarrer le serveur: python manage.py runserver")

if __name__ == '__main__':
    create_simple_data()