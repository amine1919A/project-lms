# backend/schedule/serializers.py - VERSION COMPLÈTE
from rest_framework import serializers
from .models import WeeklySchedule, TimeSlot, TeacherSchedule
from classes.models import Class
from accounts.models import CustomUser
from datetime import datetime

class TimeSlotSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    teacher_email = serializers.CharField(source='teacher.email', read_only=True, allow_null=True)
    class_name = serializers.SerializerMethodField(read_only=True)
    specialty_name = serializers.CharField(source='subject.specialty.name', read_only=True, allow_null=True)
    duration = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = TimeSlot
        fields = [
            'id', 'day', 'day_display', 'start_time', 'end_time',
            'subject', 'subject_name', 'teacher', 'teacher_name', 'teacher_email',
            'class_name', 'classroom', 'schedule', 'teacher_schedule',
            'specialty_name', 'duration', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_class_name(self, obj):
        if obj.schedule and obj.schedule.class_assigned:
            return obj.schedule.class_assigned.name
        return None
    
    def get_duration(self, obj):
        if obj.start_time and obj.end_time:
            try:
                start_dt = datetime.combine(datetime.today(), obj.start_time)
                end_dt = datetime.combine(datetime.today(), obj.end_time)
                duration = end_dt - start_dt
                return round(duration.total_seconds() / 3600, 2)
            except:
                return 0
        return 0

class TeacherScheduleSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    teacher_email = serializers.CharField(source='teacher.email', read_only=True)
    teacher_specialty = serializers.SerializerMethodField(read_only=True)
    is_full = serializers.SerializerMethodField(read_only=True)
    time_slots = serializers.SerializerMethodField(read_only=True)
    schedule_by_day = serializers.SerializerMethodField(read_only=True)
    available_slots = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = TeacherSchedule
        fields = [
            'id', 'teacher', 'teacher_name', 'teacher_email', 'teacher_specialty',
            'weekly_hours', 'max_hours', 'is_full', 
            'time_slots', 'schedule_by_day', 'available_slots',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_teacher_specialty(self, obj):
        if obj.teacher.specialty:
            return obj.teacher.specialty.name
        return None
    
    def get_is_full(self, obj):
        return obj.is_full()
    
    def get_time_slots(self, obj):
        """Récupère tous les créneaux de l'enseignant"""
        try:
            time_slots = TimeSlot.objects.filter(
                teacher=obj.teacher
            ).select_related(
                'subject', 'subject__specialty', 'schedule__class_assigned'
            ).order_by('day', 'start_time')
            
            return TimeSlotSerializer(time_slots, many=True).data
        except Exception as e:
            return []
    
    def get_schedule_by_day(self, obj):
        """Organise les créneaux par jour"""
        try:
            time_slots = TimeSlot.objects.filter(
                teacher=obj.teacher
            ).select_related(
                'subject', 'subject__specialty', 'schedule__class_assigned'
            ).order_by('day', 'start_time')
            
            schedule_by_day = {}
            for slot in time_slots:
                day = slot.get_day_display()
                if day not in schedule_by_day:
                    schedule_by_day[day] = []
                
                schedule_by_day[day].append(TimeSlotSerializer(slot).data)
            
            return schedule_by_day
        except Exception as e:
            return {}
    
    def get_available_slots(self, obj):
        """Récupère les créneaux disponibles par jour"""
        try:
            available_slots = {}
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            
            for day in days:
                slots = obj.get_available_slots(day)
                if slots:
                    day_display = dict(TimeSlot.DAY_CHOICES).get(day, day)
                    available_slots[day_display] = slots
            
            return available_slots
        except Exception as e:
            return {}

class WeeklyScheduleSerializer(serializers.ModelSerializer):
    time_slots = TimeSlotSerializer(many=True, read_only=True)
    class_name = serializers.CharField(source='class_assigned.name', read_only=True)
    class_info = serializers.SerializerMethodField(read_only=True)
    teachers = serializers.SerializerMethodField(read_only=True)
    total_hours = serializers.SerializerMethodField(read_only=True)
    is_complete = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = WeeklySchedule
        fields = [
            'id', 'class_assigned', 'class_name', 'class_info',
            'teachers', 'time_slots', 'total_hours', 'is_complete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_class_info(self, obj):
        """Retourne des informations détaillées sur la classe"""
        try:
            class_obj = obj.class_assigned
            return {
                'id': class_obj.id,
                'name': class_obj.name,
                'student_count': class_obj.student_count(),
                'max_students': class_obj.max_students,
                'is_full': class_obj.is_full()
            }
        except:
            return {
                'id': obj.class_assigned.id,
                'name': obj.class_assigned.name,
                'student_count': 0,
                'max_students': 30,
                'is_full': False
            }
    
    def get_teachers(self, obj):
        """Retourne la liste des enseignants de cette classe"""
        try:
            teachers = []
            seen_teacher_ids = set()
            
            for slot in obj.time_slots.all():
                if slot.teacher and slot.teacher.id not in seen_teacher_ids:
                    teacher_data = {
                        'id': slot.teacher.id,
                        'name': slot.teacher.get_full_name(),
                        'email': slot.teacher.email,
                    }
                    
                    if slot.teacher.specialty:
                        teacher_data['specialty'] = slot.teacher.specialty.name
                    
                    teachers.append(teacher_data)
                    seen_teacher_ids.add(slot.teacher.id)
            
            return teachers
        except Exception as e:
            return []
    
    def get_total_hours(self, obj):
        """Calcule le total d'heures de la classe"""
        try:
            total_hours = 0.0
            for slot in obj.time_slots.all():
                if slot.start_time and slot.end_time:
                    start_dt = datetime.combine(datetime.today(), slot.start_time)
                    end_dt = datetime.combine(datetime.today(), slot.end_time)
                    duration = end_dt - start_dt
                    total_hours += duration.total_seconds() / 3600
            
            return round(total_hours, 2)
        except:
            return 0.0
    
    def get_is_complete(self, obj):
        """Vérifie si l'emploi est complet (20 créneaux = semaine complète)"""
        return obj.time_slots.count() >= 20