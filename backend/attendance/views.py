from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()

class AttendanceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='student/my-attendance')
    def student_attendance(self, request):
        """Retourne la présence de l'étudiant connecté"""
        user = request.user
        
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Données simulées
        attendance = {
            'rate': 92,  # 92%
            'present': 23,
            'absent': 2,
            'late': 1,
            'total_sessions': 26,
            'by_subject': {
                'Algorithmique': {'rate': 100, 'present': 10, 'absent': 0, 'late': 0},
                'Base de Données': {'rate': 88, 'present': 7, 'absent': 1, 'late': 0},
                'Développement Web': {'rate': 91, 'present': 10, 'absent': 0, 'late': 1},
            },
            'weekly_stats': [
                {'week': 'S1', 'present': 5, 'absent': 0},
                {'week': 'S2', 'present': 4, 'absent': 1},
                {'week': 'S3', 'present': 5, 'absent': 0},
                {'week': 'S4', 'present': 4, 'absent': 1},
            ]
        }
        
        return Response(attendance, status=status.HTTP_200_OK)