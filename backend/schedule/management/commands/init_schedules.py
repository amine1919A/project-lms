# backend/schedule/management/commands/init_schedules.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from classes.models import Class, Subject
from schedule.models import WeeklySchedule, TimeSlot
from datetime import time

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialise les emplois du temps pour toutes les classes'
    
    def handle(self, *args, **options):
        self.stdout.write("🔄 Initialisation des emplois du temps...")
        
        # Récupérer toutes les classes
        classes = Class.objects.all()
        
        for class_obj in classes:
            self.stdout.write(f"  📋 Traitement de la classe: {class_obj.name}")
            
            # Vérifier si la classe a des étudiants
            if class_obj.students.count() == 0:
                self.stdout.write(f"    ⚠️  Aucun étudiant dans cette classe")
                continue
            
            # Vérifier si la classe a des matières avec enseignants
            subjects = Subject.objects.filter(
                class_assigned=class_obj,
                teacher__isnull=False,
                teacher__approved=True
            )
            
            if subjects.count() == 0:
                self.stdout.write(f"    ⚠️  Aucune matière avec enseignant")
                continue
            
            # Créer l'emploi du temps
            schedule, created = WeeklySchedule.objects.get_or_create(
                class_assigned=class_obj
            )
            
            if created:
                self.stdout.write(f"    ✅ Emploi créé")
            else:
                self.stdout.write(f"    ℹ️  Emploi existe déjà")
            
            # Vérifier si des créneaux existent déjà
            if schedule.time_slots.count() > 0:
                self.stdout.write(f"    ℹ️  {schedule.time_slots.count()} créneaux existants")
                continue
            
            # Créer des créneaux de démonstration
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][:3]  # 3 premiers jours
            time_slots = [
                {'start': time(8, 30), 'end': time(10, 0)},
                {'start': time(10, 15), 'end': time(11, 45)},
                {'start': time(14, 0), 'end': time(15, 30)}
            ]
            
            created_count = 0
            for day in days:
                for slot_index, slot_time in enumerate(time_slots[:2]):  # 2 créneaux par jour
                    if slot_index < subjects.count():
                        subject = subjects[slot_index]
                        teacher = subject.teacher
                        
                        TimeSlot.objects.create(
                            day=day,
                            start_time=slot_time['start'],
                            end_time=slot_time['end'],
                            subject=subject,
                            teacher=teacher,
                            classroom=f"Salle {101 + created_count}",
                            schedule=schedule
                        )
                        created_count += 1
            
            self.stdout.write(f"    ✅ {created_count} créneaux créés")
        
        self.stdout.write("✅ Initialisation terminée!")