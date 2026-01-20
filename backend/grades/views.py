from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
import random

User = get_user_model()

class GradeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='student/my-grades')
    def student_grades(self, request):
        """Retourne les notes de l'étudiant connecté"""
        user = request.user
        
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Données simulées - À remplacer par votre logique métier
        subjects = [
            'Algorithmique', 
            'Base de Données', 
            'Développement Web',
            'Systèmes d\'Exploitation',
            'Réseaux Informatiques',
            'Mathématiques',
            'Anglais'
        ]
        
        # Générer des notes aléatoires
        grades = []
        for i in range(8):
            subject = random.choice(subjects)
            score = random.randint(8, 20)
            max_score = 20
            percentage = int((score / max_score) * 100)
            
            grades.append({
                'id': i + 1,
                'test_name': f'Évaluation {random.choice(["Quiz", "Examen", "Devoir", "TP"])} {subject.split()[0]}',
                'score': score,
                'max_score': max_score,
                'percentage': percentage,
                'subject_name': subject,
                'date': (datetime.now() - timedelta(days=random.randint(1, 60))).strftime('%Y-%m-%d'),
                'teacher_name': f'Prof. {random.choice(["Martin", "Dubois", "Leroy", "Moreau", "Simon"])}'
            })
        
        return Response(grades, status=status.HTTP_200_OK)