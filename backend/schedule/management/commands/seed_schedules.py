# Créez un fichier backend/schedule/management/commands/seed_schedules.py
from django.core.management.base import BaseCommand
from schedule.models import WeeklySchedule, TimeSlot, TeacherSchedule
from classes.models import Class, Subject
from accounts.models import CustomUser
from django.utils import timezone
from datetime import datetime, time
import random

class Command(BaseCommand):
    help = 'Génère des emplois du temps de test pour toutes les classes'

    def handle(self, *args, **options):
        self.stdout.write('🎯 Génération des emplois du temps de test...')
        
        classes = Class.objects.all()
        
        if not classes.exists():
            self.stdout.write(self.style.ERROR('❌ Aucune classe trouvée'))
            return
        
        for class_obj in classes:
            self.stdout.write(f'📚 Traitement de la classe: {class_obj.name}')
            
            # Vérifier ou créer l'emploi du temps
            schedule, created = WeeklySchedule.objects.get_or_create(
                class_assigned=class_obj
            )
            
            # Supprimer les anciens créneaux
            schedule.time_slots.all().delete()
            
            # Récupérer les matières de la classe
            subjects = Subject.objects.filter(class_assigned=class_obj, teacher__isnull=False)
            
            if subjects.exists():
                days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                time_slots = [
                    {'start': time(8, 30), 'end': time(10, 0)},
                    {'start': time(10, 15), 'end': time(11, 45)},
                    {'start': time(13, 0), 'end': time(14, 30)},
                    {'start': time(14, 45), 'end': time(16, 15)}
                ]
                
                created_count = 0
                for day in days:
                    for slot in time_slots:
                        try:
                            # Choisir une matière aléatoire
                            subject = random.choice(list(subjects))
                            
                            # Créer le créneau
                            TimeSlot.objects.create(
                                day=day,
                                start_time=slot['start'],
                                end_time=slot['end'],
                                subject=subject,
                                teacher=subject.teacher,
                                classroom=f'Salle {random.randint(100, 300)}',
                                schedule=schedule
                            )
                            created_count += 1
                        except Exception as e:
                            self.stdout.write(f'   ⚠️ Erreur: {str(e)}')
                            continue
                
                self.stdout.write(self.style.SUCCESS(f'   ✅ {created_count} créneaux créés'))
                
                # Mettre à jour les enseignants
                for subject in subjects:
                    if subject.teacher:
                        teacher_schedule, _ = TeacherSchedule.objects.get_or_create(
                            teacher=subject.teacher
                        )
                        teacher_schedule.update_hours()
            else:
                self.stdout.write(self.style.WARNING('   ⚠️ Aucune matière avec enseignant'))
        
        self.stdout.write(self.style.SUCCESS('✅ Génération terminée !'))