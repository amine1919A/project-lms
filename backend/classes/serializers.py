# backend/classes/serializers.py - CORRECTION
from rest_framework import serializers
from .models import Class, Subject, Specialty
from django.contrib.auth import get_user_model

User = get_user_model()


class StudentInClassSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'approved']


class SubjectInClassSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True, allow_null=True)
    teacher_username = serializers.CharField(source='teacher.username', read_only=True, allow_null=True)
    specialty_name = serializers.CharField(source='specialty.name', read_only=True, allow_null=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'teacher', 'teacher_name', 'teacher_username',
            'specialty', 'specialty_name'
        ]


class ClassSerializer(serializers.ModelSerializer):
    students_count = serializers.SerializerMethodField()
    students = StudentInClassSerializer(many=True, read_only=True, source='students.all')
    subjects = SubjectInClassSerializer(many=True, read_only=True, source='subjects.all')
    # CORRECTION : Enlever le source='is_full' car le nom du champ est déjà is_full
    is_full = serializers.BooleanField(read_only=True)  # Enlever source='is_full'

    class Meta:
        model = Class
        fields = [
            'id', 'name', 'max_students',
            'students_count', 'students', 'subjects', 'is_full'
        ]
        read_only_fields = ['students_count', 'students', 'subjects', 'is_full']

    def get_students_count(self, obj):
        """Retourne le nombre d'étudiants approuvés dans la classe"""
        return obj.student_count()


class SpecialtySerializer(serializers.ModelSerializer):
    teacher_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Specialty
        fields = ['id', 'name', 'description', 'teacher_count']
    
    def get_teacher_count(self, obj):
        """Retourne le nombre d'enseignants dans cette spécialité"""
        return User.objects.filter(role='teacher', specialty=obj).count()


class SubjectSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_assigned.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True, allow_null=True)
    teacher_username = serializers.CharField(source='teacher.username', read_only=True, allow_null=True)
    specialty_name = serializers.CharField(source='specialty.name', read_only=True, allow_null=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'class_assigned', 'class_name',
            'teacher', 'teacher_name', 'teacher_username',
            'specialty', 'specialty_name'
        ]