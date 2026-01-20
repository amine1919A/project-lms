from rest_framework import viewsets, permissions
from .models import Course, File
from .serializers import CourseSerializer, FileSerializer
from accounts.permissions import IsTeacher, IsAdmin, IsStudent

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsTeacher() | IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsTeacher()]
        return [IsStudent() | IsTeacher() | IsAdmin()]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)