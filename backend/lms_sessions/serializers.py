# lms_sessions/serializers.py
from rest_framework import serializers
from .models import Session, Test, TestScore

class SessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    class_name = serializers.CharField(source='subject.class_assigned.name', read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'subject', 'subject_name', 'class_name', 'teacher', 'teacher_name', 'start_time', 'end_time', 'is_live']
        read_only_fields = ['teacher', 'start_time', 'end_time']

class TestSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = Test
        fields = ['id', 'title', 'file', 'subject', 'subject_name', 'uploaded_at']
        read_only_fields = ['uploaded_at']

class TestScoreSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    test_title = serializers.CharField(source='test.title', read_only=True)

    class Meta:
        model = TestScore
        fields = ['id', 'test', 'test_title', 'student', 'student_name', 'score']