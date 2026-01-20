# backend/schedule/management/commands/fix_all.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from classes.models import Class, Subject
from schedule.models import WeeklySchedule
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Diagnostique et répare tous les problèmes d\'emploi du temps'
    
    def handle(self, *args, **options):
        self.stdout.write("🔧 DÉBUT DIAGNOSTIC COMPLET")
        
        # 1. Vérifier tous les utilisateurs
        users = User.objects.all()
        self.stdout.write(f"\n👥 UTILISATEURS ({users.count()} total):")
        
        for user in users:
            status = "✅" if user.approved else "❌"
            classes = list(user.enrolled_classes.all())
            class_names = [c.name for c in classes]
            
            self.stdout.write(f"  {status} {user.username:20} | {user.role:10} | Approuvé: {user.approved} | Classes: {', '.join(class_names) if class_names else 'AUCUNE'}")
        
        # 2. Vérifier les classes
        classes = Class.objects.all()
        self.stdout.write(f"\n📚 CLASSES ({classes.count()} total):")
        
        for cls in classes:
            student_count = cls.students.count()
            schedule = WeeklySchedule.objects.filter(class_assigned=cls).first()
            has_schedule = schedule is not None
            schedule_status = "✅" if has_schedule else "❌"
            
            self.stdout.write(f"  {schedule_status} {cls.name:20} | Étudiants: {student_count:2} | Emploi: {'OUI' if has_schedule else 'NON'}")
            
            # Vérifier les matières
            subjects = Subject.objects.filter(class_assigned=cls)
            if subjects.exists():
                for subject in subjects:
                    teacher_status = "✅" if subject.teacher else "❌"
                    self.stdout.write(f"      {teacher_status} {subject.name:30} | Enseignant: {subject.teacher.username if subject.teacher else 'AUCUN'}")
        
        # 3. Options de réparation
        self.stdout.write(f"\n🛠️  OPTIONS DE RÉPARATION:")
        self.stdout.write("  1. Assigner tous les étudiants sans classe")
        self.stdout.write("  2. Créer des emplois du temps pour toutes les classes")
        self.stdout.write("  3. Tout réparer automatiquement")
        self.stdout.write("  4. Quitter")
        
        choice = input("\nChoisissez une option (1-4): ").strip()
        
        if choice == "1":
            self.assign_students()
        elif choice == "2":
            self.create_schedules()
        elif choice == "3":
            self.repair_all()
        else:
            self.stdout.write("✅ Diagnostic terminé.")
    
    def assign_students(self):
        """Assigner tous les étudiants sans classe"""
        self.stdout.write("\n🎓 ASSIGNATION DES ÉTUDIANTS...")
        
        students_without_class = User.objects.filter(
            role='student', 
            approved=True
        ).exclude(enrolled_classes__isnull=False)
        
        self.stdout.write(f"Étudiants sans classe: {students_without_class.count()}")
        
        if students_without_class.exists():
            # Trouver ou créer une classe par défaut
            default_class, created = Class.objects.get_or_create(
                name="ING1 Informatique",
                defaults={'max_students': 30}
            )
            
            if created:
                self.stdout.write(f"✅ Créé classe: {default_class.name}")
            
            for student in students_without_class:
                default_class.students.add(student)
                self.stdout.write(f"  ✅ Assigné {student.username} à {default_class.name}")
        
        self.stdout.write("✅ Assignation terminée.")
    
    def create_schedules(self):
        """Créer des emplois du temps pour toutes les classes"""
        self.stdout.write("\n📅 CRÉATION DES EMPLOIS DU TEMPS...")
        
        classes = Class.objects.all()
        
        for cls in classes:
            schedule, created = WeeklySchedule.objects.get_or_create(
                class_assigned=cls
            )
            
            if created:
                self.stdout.write(f"✅ Créé emploi pour {cls.name}")
            else:
                self.stdout.write(f"ℹ️  Emploi existe déjà pour {cls.name}")
        
        self.stdout.write("✅ Création terminée.")
    
    def repair_all(self):
        """Tout réparer automatiquement"""
        self.assign_students()
        self.create_schedules()
        self.stdout.write("\n✅ TOUT A ÉTÉ RÉPARÉ AVEC SUCCÈS!")