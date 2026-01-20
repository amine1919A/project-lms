# backend/schedule/views.py - VERSION COMPLÈTE CORRIGÉE
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from .models import WeeklySchedule, TimeSlot, TeacherSchedule
from .serializers import WeeklyScheduleSerializer, TimeSlotSerializer, TeacherScheduleSerializer
from accounts.permissions import IsAdmin
from accounts.models import CustomUser
from classes.models import Class, Subject
import logging
import random
from datetime import datetime, timedelta, time
import json

logger = logging.getLogger(__name__)

# ========================================
# CLASSE POUR GÉNÉRATION INTELLIGENTE - CORRIGÉE
# ========================================
class SmartScheduleGenerator:
    """Classe intelligente pour générer et mettre à jour les emplois du temps"""
    
    @staticmethod
    def generate_schedule_for_class(class_obj, force_update=False, smart_mode=True):
        """
        Génère ou met à jour l'emploi du temps d'une classe avec synchronisation enseignants
        """
        try:
            logger.info(f"Début génération emploi pour {class_obj.name}, force_update={force_update}, smart_mode={smart_mode}")
            
            with transaction.atomic():
                # Vérifier si l'emploi existe déjà
                schedule, created = WeeklySchedule.objects.get_or_create(
                    class_assigned=class_obj
                )
                
                logger.info(f"Schedule: {'créé' if created else 'existant'}, ID: {schedule.id}")
                
                # Si pas de force_update et emploi existe déjà avec au moins 15 créneaux, on arrête
                if not force_update and not created and schedule.time_slots.count() >= 15:
                    logger.info(f"Emploi existe déjà avec {schedule.time_slots.count()} créneaux")
                    return {
                        'success': True,
                        'message': f'Emploi du temps de {class_obj.name} existe déjà et est presque complet',
                        'schedule_id': schedule.id,
                        'created_slots': schedule.time_slots.count(),
                        'updated': False
                    }
                
                # Récupérer les matières actuelles avec enseignants
                subjects = Subject.objects.filter(
                    class_assigned=class_obj,
                    teacher__isnull=False,
                    teacher__approved=True
                ).select_related('teacher', 'specialty')
                
                subjects_list = list(subjects)
                logger.info(f"Nombre de matières trouvées: {len(subjects_list)}")
                
                if len(subjects_list) == 0:
                    return {
                        'success': False,
                        'message': f'Aucune matière avec enseignant dans la classe {class_obj.name}'
                    }
                
                # Sauvegarder l'ancien nombre de créneaux
                old_slots_count = schedule.time_slots.count()
                
                # Supprimer les anciens créneaux si force_update ou création
                if force_update or created:
                    deleted_count, _ = schedule.time_slots.all().delete()
                    logger.info(f"Créneaux supprimés: {deleted_count}")
                
                # Horaires standards
                days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                slots = [
                    {'start': time(8, 30), 'end': time(10, 0)},
                    {'start': time(10, 15), 'end': time(11, 45)},
                    {'start': time(13, 0), 'end': time(14, 30)},
                    {'start': time(14, 45), 'end': time(16, 15)}
                ]
                
                created_slots = []
                errors = []
                teachers_updated = set()
                
                # Génération intelligente avec rotation des matières
                for day in days:
                    for slot_index, slot in enumerate(slots):
                        try:
                            # Choisir la matière pour ce créneau (rotation)
                            subject_index = (days.index(day) * len(slots) + slot_index) % len(subjects_list)
                            subject = subjects_list[subject_index]
                            teacher = subject.teacher
                            
                            # Vérifier si l'enseignant est déjà occupé à ce créneau
                            teacher_busy = TimeSlot.objects.filter(
                                teacher=teacher,
                                day=day,
                                start_time=slot['start'],
                                end_time=slot['end']
                            ).exists()
                            
                            if teacher_busy and smart_mode:
                                # Chercher une autre matière avec un enseignant disponible
                                alternative_subject = None
                                for sub in subjects_list:
                                    if sub.id != subject.id:
                                        sub_teacher = sub.teacher
                                        
                                        # Vérifier si l'enseignant est disponible
                                        busy = TimeSlot.objects.filter(
                                            teacher=sub_teacher,
                                            day=day,
                                            start_time=slot['start'],
                                            end_time=slot['end']
                                        ).exists()
                                        
                                        if not busy:
                                            alternative_subject = sub
                                            break
                                
                                if alternative_subject:
                                    subject = alternative_subject
                                    teacher = subject.teacher
                                else:
                                    errors.append(f"Pas d'enseignant disponible le {day} à {slot['start'].strftime('%H:%M')}")
                                    continue
                            
                            # Choisir une salle disponible
                            classroom = SmartScheduleGenerator.get_available_classroom(
                                day, slot['start'], slot['end']
                            )
                            
                            if not classroom:
                                classroom = f"B{101 + slot_index}"
                            
                            # Créer le créneau
                            time_slot = TimeSlot.objects.create(
                                day=day,
                                start_time=slot['start'],
                                end_time=slot['end'],
                                subject=subject,
                                teacher=teacher,
                                classroom=classroom,
                                schedule=schedule
                            )
                            
                            created_slots.append(time_slot.id)
                            teachers_updated.add(teacher.id)
                            
                        except Exception as e:
                            error_msg = f"Erreur créneau {day} {slot['start'].strftime('%H:%M')}: {str(e)}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                
                logger.info(f"Créneaux créés: {len(created_slots)}, Enseignants affectés: {len(teachers_updated)}")
                
                # Mettre à jour les emplois des enseignants
                for teacher_id in teachers_updated:
                    try:
                        teacher = CustomUser.objects.get(id=teacher_id)
                        teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=teacher)
                        teacher_schedule.update_hours()
                    except Exception as e:
                        logger.error(f"Erreur mise à jour enseignant {teacher_id}: {str(e)}")
                        errors.append(f"Erreur mise à jour enseignant {teacher_id}")
                
                # Mettre à jour l'horodatage
                schedule.save()
                
                return {
                    'success': True,
                    'message': f'Emploi du temps généré pour {class_obj.name}',
                    'schedule_id': schedule.id,
                    'created_slots': len(created_slots),
                    'teachers_updated': len(teachers_updated),
                    'old_slots_count': old_slots_count,
                    'errors': errors,
                    'updated': True
                }
                
        except Exception as e:
            error_msg = f"Erreur génération emploi {class_obj.name}: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
    
    @staticmethod
    def get_available_classroom(day, start_time, end_time):
        """Retourne une salle disponible pour un créneau donné"""
        try:
            all_rooms = [
                'B101', 'B102', 'B103', 'B104',
                'B201', 'B202', 'B203', 'B204',
                'B301', 'B302', 'B303', 'B304',
                'Amphi A', 'Amphi B', 'Labo Info 1', 'Labo Info 2'
            ]
            
            # Récupérer les salles occupées à ce créneau
            occupied_rooms = TimeSlot.objects.filter(
                day=day,
                start_time=start_time,
                end_time=end_time
            ).exclude(classroom__isnull=True).exclude(classroom='').values_list('classroom', flat=True)
            
            occupied_set = set(occupied_rooms)
            available_rooms = [room for room in all_rooms if room not in occupied_set]
            
            # Retourner une salle aléatoire parmi les disponibles
            if available_rooms:
                return random.choice(available_rooms)
            else:
                return "B101"
                
        except Exception as e:
            logger.error(f"Erreur recherche salle: {str(e)}")
            return "B101"
    
    @staticmethod
    def check_teacher_availability(teacher_id, new_class_id):
        """
        Vérifie si un enseignant peut prendre une nouvelle classe
        Retourne (disponible, message, heures_restantes)
        """
        try:
            teacher = CustomUser.objects.get(id=teacher_id, role='teacher')
            class_obj = Class.objects.get(id=new_class_id)
            
            # Récupérer l'emploi de l'enseignant
            teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=teacher)
            
            # Calculer les heures que prendrait la nouvelle classe
            # Estimation: 4 cours de 1h30 par semaine = 6h
            estimated_hours = 6.0
            
            if teacher_schedule.is_full():
                return False, f"L'enseignant a un emploi complet ({teacher_schedule.weekly_hours}/{teacher_schedule.max_hours}h)", 0.0
            
            # Vérifier les conflits d'horaire potentiels
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            slots = [
                {'start': time(8, 30), 'end': time(10, 0)},
                {'start': time(10, 15), 'end': time(11, 45)},
                {'start': time(13, 0), 'end': time(14, 30)},
                {'start': time(14, 45), 'end': time(16, 15)}
            ]
            
            for day in days:
                for slot in slots:
                    conflict = TimeSlot.objects.filter(
                        teacher=teacher,
                        day=day,
                        start_time=slot['start'],
                        end_time=slot['end']
                    ).exists()
                    
                    if conflict:
                        return False, f"Conflit d'horaire le {day} à {slot['start'].strftime('%H:%M')}", 0.0
            
            remaining_hours = float(teacher_schedule.max_hours) - float(teacher_schedule.weekly_hours)
            return True, f"L'enseignant peut prendre cette classe ({remaining_hours:.1f}h disponibles)", remaining_hours
            
        except CustomUser.DoesNotExist:
            return False, "Enseignant non trouvé", 0.0
        except Class.DoesNotExist:
            return False, "Classe non trouvée", 0.0
        except Exception as e:
            logger.error(f"Erreur vérification disponibilité: {str(e)}")
            return False, f"Erreur de vérification: {str(e)}", 0.0
    
    @staticmethod
    def sync_all_teachers():
        """Synchronise tous les emplois des enseignants avec les emplois de classe"""
        try:
            teachers_updated = 0
            errors = []
            
            # Pour chaque enseignant
            teacher_schedules = TeacherSchedule.objects.all().select_related('teacher')
            total_teachers = teacher_schedules.count()
            
            for teacher_schedule in teacher_schedules:
                try:
                    # Recalculer les heures
                    old_hours = float(teacher_schedule.weekly_hours)
                    new_hours = teacher_schedule.update_hours()
                    
                    if abs(float(new_hours) - old_hours) > 0.1:
                        teachers_updated += 1
                        logger.info(f"Enseignant {teacher_schedule.teacher.username} mis à jour: {old_hours} -> {new_hours}")
                        
                except Exception as e:
                    error_msg = f"Erreur enseignant {teacher_schedule.teacher.username}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            return {
                'success': True,
                'message': f'Synchronisation terminée: {teachers_updated}/{total_teachers} enseignants mis à jour',
                'teachers_updated': teachers_updated,
                'total_teachers': total_teachers,
                'errors': errors
            }
            
        except Exception as e:
            error_msg = f"Erreur synchro enseignants: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
    
    @staticmethod
    def check_for_conflicts():
        """Vérifie les conflits dans les emplois du temps"""
        try:
            conflicts = []
            
            # Vérifier les conflits d'enseignants
            time_slots = TimeSlot.objects.all().select_related(
                'teacher', 'subject', 'schedule__class_assigned'
            )
            
            # Regrouper par enseignant, jour et heure
            teacher_slots = {}
            for slot in time_slots:
                if slot.teacher and slot.start_time and slot.end_time:
                    key = f"{slot.teacher_id}_{slot.day}_{slot.start_time}_{slot.end_time}"
                    if key not in teacher_slots:
                        teacher_slots[key] = []
                    teacher_slots[key].append(slot)
            
            # Détecter les conflits enseignants
            for key, slots in teacher_slots.items():
                if len(slots) > 1:
                    conflict_info = {
                        'type': 'teacher_conflict',
                        'teacher': slots[0].teacher.get_full_name(),
                        'teacher_id': slots[0].teacher_id,
                        'day': slots[0].get_day_display(),
                        'time': f"{slots[0].start_time.strftime('%H:%M')} - {slots[0].end_time.strftime('%H:%M')}",
                        'count': len(slots),
                        'classes': []
                    }
                    
                    for slot in slots:
                        class_name = slot.schedule.class_assigned.name if slot.schedule else 'N/A'
                        conflict_info['classes'].append({
                            'class': class_name,
                            'subject': slot.subject.name if slot.subject else 'N/A',
                            'class_id': slot.schedule.class_assigned.id if slot.schedule else None
                        })
                    
                    conflicts.append(conflict_info)
            
            # Vérifier les conflits de salles
            classroom_slots = {}
            for slot in time_slots:
                if slot.classroom and slot.start_time and slot.end_time:
                    key = f"{slot.classroom}_{slot.day}_{slot.start_time}_{slot.end_time}"
                    if key not in classroom_slots:
                        classroom_slots[key] = []
                    classroom_slots[key].append(slot)
            
            for key, slots in classroom_slots.items():
                if len(slots) > 1:
                    conflict_info = {
                        'type': 'classroom_conflict',
                        'classroom': slots[0].classroom,
                        'day': slots[0].get_day_display(),
                        'time': f"{slots[0].start_time.strftime('%H:%M')} - {slots[0].end_time.strftime('%H:%M')}",
                        'count': len(slots),
                        'classes': []
                    }
                    
                    for slot in slots:
                        class_name = slot.schedule.class_assigned.name if slot.schedule else 'N/A'
                        conflict_info['classes'].append({
                            'class': class_name,
                            'subject': slot.subject.name if slot.subject else 'N/A',
                            'teacher': slot.teacher.get_full_name() if slot.teacher else 'N/A'
                        })
                    
                    conflicts.append(conflict_info)
            
            return conflicts
            
        except Exception as e:
            logger.error(f"Erreur vérification conflits: {str(e)}")
            return []

# ========================================
# VIEWSETS PRINCIPAUX - CORRIGÉS
# ========================================
class TeacherScheduleViewSet(viewsets.ModelViewSet):
    """Gestion des emplois du temps des enseignants"""
    queryset = TeacherSchedule.objects.all().select_related('teacher', 'teacher__specialty')
    serializer_class = TeacherScheduleSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_schedule', 'available_teachers']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]
    
    def get_queryset(self):
        """Filtrer selon l'utilisateur"""
        user = self.request.user
        
        if user.is_anonymous:
            return TeacherSchedule.objects.none()
        
        if user.role in ['admin', 'superadmin']:
            return TeacherSchedule.objects.all().select_related('teacher', 'teacher__specialty')
        elif user.role == 'teacher':
            return TeacherSchedule.objects.filter(teacher=user).select_related('teacher', 'teacher__specialty')
        
        return TeacherSchedule.objects.none()
    
    @action(detail=False, methods=['get'], url_path='my-schedule')
    def my_schedule(self, request):
        """L'emploi du temps de l'enseignant connecté"""
        user = request.user
        
        if user.role != 'teacher':
            return Response({
                'success': False,
                'error': 'Cette fonctionnalité est réservée aux enseignants'
            }, status=403)
        
        try:
            teacher_schedule = get_object_or_404(TeacherSchedule, teacher=user)
            serializer = self.get_serializer(teacher_schedule)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Erreur récupération emploi enseignant: {str(e)}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération de votre emploi du temps'
            }, status=500)
    
    @action(detail=False, methods=['get'], url_path='available-teachers')
    def available_teachers(self, request):
        """Retourne la liste des enseignants disponibles pour une nouvelle classe"""
        try:
            class_id = request.query_params.get('class_id')
            if not class_id:
                return Response({
                    'success': False,
                    'error': 'class_id requis'
                }, status=400)
            
            class_obj = Class.objects.get(id=class_id)
            teachers = CustomUser.objects.filter(role='teacher', approved=True)
            
            available_teachers = []
            for teacher in teachers:
                # Vérifier la disponibilité
                available, message, hours_left = SmartScheduleGenerator.check_teacher_availability(
                    teacher.id, class_obj.id
                )
                
                # Récupérer l'emploi de l'enseignant
                teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=teacher)
                
                available_teachers.append({
                    'id': teacher.id,
                    'name': teacher.get_full_name(),
                    'email': teacher.email,
                    'specialty': teacher.specialty.name if teacher.specialty else None,
                    'available': available,
                    'message': message,
                    'current_hours': float(teacher_schedule.weekly_hours),
                    'max_hours': float(teacher_schedule.max_hours),
                    'hours_left': hours_left,
                    'is_full': teacher_schedule.is_full()
                })
            
            return Response({
                'success': True,
                'class': {
                    'id': class_obj.id,
                    'name': class_obj.name
                },
                'available_teachers': available_teachers,
                'total_teachers': len(available_teachers),
                'available_count': len([t for t in available_teachers if t['available']])
            })
            
        except Class.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Classe non trouvée'
            }, status=404)
        except Exception as e:
            logger.error(f"Erreur récupération enseignants disponibles: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur serveur: {str(e)}'
            }, status=500)
# AJOUTER CES MÉTHODES À LA CLASSE WeeklyScheduleViewSet (après la méthode generate_smart_schedule)

class WeeklyScheduleViewSet(viewsets.ModelViewSet):
    queryset = WeeklySchedule.objects.all()
    serializer_class = WeeklyScheduleSerializer
   

    @action(detail=False, methods=['get'], url_path='student/my-teachers')
    def student_my_teachers(self, request):
        """Retourne les professeurs d'un étudiant"""
        user = request.user
        
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=403)
        
        try:
            # Trouver la classe de l'étudiant
            student_class = user.enrolled_classes.first()
            if not student_class:
                return Response({
                    'success': False,
                    'error': 'Vous n\'êtes pas dans une classe'
                }, status=404)
            
            # Trouver tous les professeurs qui enseignent dans cette classe
            teachers = CustomUser.objects.filter(
                role='teacher',
                teaching_subjects__class_assigned=student_class
            ).distinct().select_related('specialty')
            
            teacher_data = []
            for teacher in teachers:
                teacher_data.append({
                    'id': teacher.id,
                    'username': teacher.username,
                    'full_name': teacher.get_full_name(),
                    'email': teacher.email,
                    'role': 'teacher',
                    'specialty': teacher.specialty.name if teacher.specialty else None,
                    'subjects': list(teacher.teaching_subjects.filter(
                        class_assigned=student_class
                    ).values_list('name', flat=True))
                })
            
            return Response({
                'success': True,
                'count': len(teacher_data),
                'teachers': teacher_data
            })
            
        except Exception as e:
            logger.error(f"Erreur récupération professeurs: {str(e)}")
            return Response({
                'success': False,
                'error': 'Erreur serveur'
            }, status=500)
        
    # CORRECTION CRITIQUE : Définir les permissions correctement
    def get_permissions(self):
        """
        Permissions dynamiques selon l'action
        """
        # Routes accessibles aux utilisateurs authentifiés
        if self.action in ['student_my_schedule', 'teacher_my_schedule', 'my_schedule', 'student_my_teachers']:
            return [permissions.IsAuthenticated()]
        # Routes admin seulement
        return [IsAdmin()]
    
    def get_queryset(self):
        return WeeklySchedule.objects.all().prefetch_related(
            'time_slots',
            'time_slots__subject',
            'time_slots__subject__specialty',
            'time_slots__teacher',
            'time_slots__teacher_schedule',
            'class_assigned'
        ).select_related('class_assigned')

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = WeeklyScheduleSerializer(queryset, many=True)
            
            return Response({
                'success': True,
                'count': queryset.count(),
                'schedules': serializer.data
            })
        except Exception as e:
            logger.error(f"Erreur list(): {e}")
            return Response({'success': False, 'error': str(e)}, status=500)

    @action(detail=False, methods=['get'], url_path='student/my-schedule', permission_classes=[permissions.IsAuthenticated])
    def student_my_schedule(self, request):
        """Route SPÉCIFIQUE pour les étudiants seulement"""
        user = request.user
        
        logger.info(f"Route student/my-schedule appelée par {user.username} (rôle: {user.role})")
        
        # Vérifier que c'est bien un étudiant
        if user.role != 'student':
            logger.warning(f"Accès interdit: {user.username} n'est pas étudiant")
            return Response({
                'success': False,
                'error': 'Cette route est réservée aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Appeler la méthode spécifique étudiant
        return self._get_student_schedule(user)

    def _get_student_schedule(self, user):
        """Récupère l'emploi du temps d'un étudiant"""
        logger.info(f"Récupération emploi pour étudiant: {user.username}")
        
        try:
            # Vérifier si l'utilisateur est dans une classe
            student_classes = user.enrolled_classes.all()
            
            if not student_classes.exists():
                logger.info(f"Étudiant {user.username} non assigné à une classe")
                return Response({
                    'success': True,
                    'data': {
                        'class_name': None,
                        'time_slots': [],
                        'has_schedule': False,
                        'message': 'Vous n\'êtes pas encore assigné à une classe'
                    }
                })
            
            class_obj = student_classes.first()
            logger.info(f"Étudiant {user.username} dans la classe: {class_obj.name}")
            
            # Chercher l'emploi du temps de la classe
            schedule = WeeklySchedule.objects.filter(
                class_assigned=class_obj
            ).prefetch_related(
                'time_slots',
                'time_slots__subject',
                'time_slots__teacher',
                'time_slots__schedule__class_assigned'
            ).first()
            
            if not schedule:
                logger.info(f"Pas d'emploi du temps pour la classe {class_obj.name}")
                return Response({
                    'success': True,
                    'data': {
                        'class_name': class_obj.name,
                        'time_slots': [],
                        'has_schedule': False,
                        'message': 'Emploi du temps en cours de préparation',
                        'updated_at': None
                    }
                })
            
            # Récupérer tous les créneaux
            time_slots = schedule.time_slots.all().order_by('day', 'start_time')
            
            # Organiser par jour
            schedule_by_day = {}
            day_translation = {
                'Monday': 'Lundi',
                'Tuesday': 'Mardi',
                'Wednesday': 'Mercredi',
                'Thursday': 'Jeudi',
                'Friday': 'Vendredi'
            }
            
            for slot in time_slots:
                day = slot.day
                day_french = day_translation.get(day, day)
                if day_french not in schedule_by_day:
                    schedule_by_day[day_french] = []
                
                slot_data = {
                    'id': slot.id,
                    'day': slot.day,
                    'day_display': slot.get_day_display(),
                    'start_time': slot.start_time.strftime('%H:%M') if slot.start_time else '',
                    'end_time': slot.end_time.strftime('%H:%M') if slot.end_time else '',
                    'subject_name': slot.subject.name if slot.subject else 'Matière',
                    'teacher_name': slot.teacher.get_full_name() if slot.teacher else 'Enseignant',
                    'classroom': slot.classroom or 'Salle non définie',
                    'duration': self._calculate_duration(slot.start_time, slot.end_time)
                }
                schedule_by_day[day_french].append(slot_data)
            
            logger.info(f"Emploi trouvé pour {user.username}: {time_slots.count()} créneaux")
            
            return Response({
                'success': True,
                'data': {
                    'id': schedule.id,
                    'class_assigned': class_obj.id,
                    'class_name': class_obj.name,
                    'time_slots': [slot_data for day_slots in schedule_by_day.values() for slot_data in day_slots],
                    'schedule_by_day': schedule_by_day,
                    'total_slots': time_slots.count(),
                    'updated_at': schedule.updated_at,
                    'has_schedule': True
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur _get_student_schedule: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur technique: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_duration(self, start_time, end_time):
        """Calcule la durée en heures"""
        if not start_time or not end_time:
            return 0.0
        
        try:
            start_dt = datetime.combine(datetime.today(), start_time)
            end_dt = datetime.combine(datetime.today(), end_time)
            duration = (end_dt - start_dt).total_seconds() / 3600
            return round(duration, 2)
        except:
            return 0.0

    @action(detail=False, methods=['get'], url_path='teacher/my-schedule', permission_classes=[permissions.IsAuthenticated])
    def teacher_my_schedule(self, request):
        """Route SPÉCIFIQUE pour les enseignants seulement"""
        user = request.user
        
        logger.info(f"Route teacher/my-schedule appelée par {user.username} (rôle: {user.role})")
        
        # Vérifier que c'est bien un enseignant
        if user.role != 'teacher':
            logger.warning(f"Accès interdit: {user.username} n'est pas enseignant")
            return Response({
                'success': False,
                'error': 'Cette route est réservée aux enseignants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Appeler la méthode spécifique enseignant
        return self._get_teacher_schedule(user)

    def _get_teacher_schedule(self, user):
        """Récupère l'emploi du temps d'un enseignant"""
        logger.info(f"Récupération emploi pour enseignant: {user.username}")
        
        try:
            # Récupérer tous les créneaux de l'enseignant
            time_slots = TimeSlot.objects.filter(
                teacher=user
            ).select_related(
                'subject', 
                'subject__specialty', 
                'schedule__class_assigned'
            ).order_by('day', 'start_time')
            
            # Récupérer ou créer l'emploi de l'enseignant
            teacher_schedule, created = TeacherSchedule.objects.get_or_create(teacher=user)
            
            # Organiser par jour
            schedule_by_day = {}
            day_translation = {
                'Monday': 'Lundi',
                'Tuesday': 'Mardi',
                'Wednesday': 'Mercredi',
                'Thursday': 'Jeudi',
                'Friday': 'Vendredi'
            }
            
            # Calculer le total d'heures et organiser par jour
            total_hours = 0
            days_with_classes = set()
            
            for slot in time_slots:
                day = slot.day
                day_french = day_translation.get(day, day)
                if day_french not in schedule_by_day:
                    schedule_by_day[day_french] = []
                
                slot_data = {
                    'id': slot.id,
                    'day': slot.day,
                    'day_display': slot.get_day_display(),
                    'start_time': slot.start_time.strftime('%H:%M') if slot.start_time else '',
                    'end_time': slot.end_time.strftime('%H:%M') if slot.end_time else '',
                    'subject_name': slot.subject.name if slot.subject else 'Matière',
                    'class_name': slot.schedule.class_assigned.name if slot.schedule and slot.schedule.class_assigned else 'Classe',
                    'classroom': slot.classroom or 'Salle non définie',
                    'duration': self._calculate_duration(slot.start_time, slot.end_time)
                }
                schedule_by_day[day_french].append(slot_data)
                
                # Ajouter à la liste des jours avec cours
                days_with_classes.add(day_french)
                
                # Calculer les heures
                if slot.start_time and slot.end_time:
                    start_dt = datetime.combine(datetime.today(), slot.start_time)
                    end_dt = datetime.combine(datetime.today(), slot.end_time)
                    total_hours += (end_dt - start_dt).total_seconds() / 3600
            
            logger.info(f"Emploi trouvé pour enseignant {user.username}: {time_slots.count()} créneaux")
            
            return Response({
                'success': True,
                'data': {
                    'teacher_id': user.id,
                    'teacher_name': user.get_full_name(),
                    'teacher_email': user.email,
                    'teacher_specialty': user.specialty.name if user.specialty else None,
                    'teacher_schedule_id': teacher_schedule.id,
                    'weekly_hours': float(teacher_schedule.weekly_hours),
                    'max_hours': float(teacher_schedule.max_hours),
                    'is_full': teacher_schedule.is_full(),
                    'time_slots': [slot_data for day_slots in schedule_by_day.values() for slot_data in day_slots],
                    'schedule_by_day': schedule_by_day,
                    'total_hours': round(total_hours, 2),
                    'total_slots': time_slots.count(),
                    'days_with_classes': len(days_with_classes),
                    'updated_at': teacher_schedule.updated_at
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur _get_teacher_schedule: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur technique: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='my-schedule', permission_classes=[permissions.IsAuthenticated])
    def my_schedule(self, request):
        """Route GÉNÉRIQUE qui détermine automatiquement le rôle"""
        user = request.user
        
        logger.info(f"Route my-schedule appelée par {user.username} (rôle: {user.role})")
        
        if not user.is_authenticated:
            logger.error("Utilisateur non authentifié")
            return Response({
                'success': False,
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            if user.role == 'student':
                return self._get_student_schedule(user)
            elif user.role == 'teacher':
                return self._get_teacher_schedule(user)
            elif user.role in ['admin', 'superadmin']:
                return Response({
                    'success': False,
                    'error': 'Cette fonctionnalité est réservée aux étudiants et enseignants'
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({
                    'success': False,
                    'error': 'Rôle utilisateur non reconnu'
                }, status=status.HTTP_403_FORBIDDEN)
                
        except Exception as e:
            logger.error(f"Erreur my_schedule pour {user.username}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération de votre emploi du temps'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='generate-smart')
    def generate_smart_schedule(self, request):
        try:
            class_id = request.data.get('class_id')
            force_update = request.data.get('force_update', False)
            
            if not class_id:
                return Response({'success': False, 'error': 'class_id requis'}, status=400)
            
            class_obj = Class.objects.get(id=class_id)
            
            if Subject.objects.filter(class_assigned=class_obj, teacher__isnull=False).count() == 0:
                return Response({'success': False, 'error': 'Pas de matières avec enseignant'}, status=400)
            
            result = SmartScheduleGenerator.generate_schedule_for_class(class_obj, force_update, smart_mode=True)
            
            if result['success']:
                # Recharger pour avoir les time_slots
                schedule = WeeklySchedule.objects.prefetch_related('time_slots').get(class_assigned=class_obj)
                return Response({
                    'success': True,
                    'message': result['message'],
                    'data': {
                        'schedule_id': schedule.id,
                        'slots_created': result.get('created_slots', 0),
                        'teachers_updated': result.get('teachers_updated', 0),
                        'schedule': WeeklyScheduleSerializer(schedule).data
                    }
                })
            return Response({'success': False, 'error': result['message']}, status=400)
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=500)
        
class TimeSlotViewSet(viewsets.ModelViewSet):
    """Gestion des créneaux horaires"""
    queryset = TimeSlot.objects.all().select_related(
        'subject', 'teacher', 'schedule', 'teacher_schedule'
    )
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAdmin]
    
    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            
            # Mettre à jour l'enseignant si nécessaire
            if response.status_code == 201:
                teacher_id = request.data.get('teacher')
                if teacher_id:
                    try:
                        teacher = CustomUser.objects.get(id=teacher_id)
                        teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=teacher)
                        teacher_schedule.update_hours()
                    except Exception as e:
                        logger.error(f"Erreur mise à jour enseignant après création créneau: {str(e)}")
            
            return response
        except Exception as e:
            logger.error(f"Erreur création créneau: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la création du créneau: {str(e)}'
            }, status=500)
    
    def update(self, request, *args, **kwargs):
        try:
            response = super().update(request, *args, **kwargs)
            
            # Mettre à jour l'enseignant si nécessaire
            if response.status_code == 200:
                instance = self.get_object()
                if instance.teacher:
                    teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=instance.teacher)
                    teacher_schedule.update_hours()
            
            return response
        except Exception as e:
            logger.error(f"Erreur mise à jour créneau: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la mise à jour du créneau: {str(e)}'
            }, status=500)
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            teacher = instance.teacher
            
            response = super().destroy(request, *args, **kwargs)
            
            # Mettre à jour l'enseignant après suppression
            if response.status_code == 204:
                if teacher:
                    try:
                        teacher_schedule, _ = TeacherSchedule.objects.get_or_create(teacher=teacher)
                        teacher_schedule.update_hours()
                    except Exception as e:
                        logger.error(f"Erreur mise à jour enseignant après suppression créneau: {str(e)}")
            
            return response
        except Exception as e:
            logger.error(f"Erreur suppression créneau: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la suppression du créneau: {str(e)}'
            }, status=500)