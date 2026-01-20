from rest_framework import serializers
from .models import Course, File

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "title", "description", "subject", "teacher")
        read_only_fields = ("teacher",)

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ("id", "course", "file", "uploaded_by", "uploaded_at")
        read_only_fields = ("uploaded_by", "uploaded_at")