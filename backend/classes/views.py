# backend/classes/views.py - VERSION COMPLÈTE CORRIGÉE
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Class, Subject, Specialty
from .serializers import ClassSerializer, SubjectSerializer, SpecialtySerializer
from accounts.permissions import IsAdmin as IsAdminPermission
import logging
from rest_framework.permissions import IsAuthenticated
logger = logging.getLogger(__name__)
from django.db.models import Q

User = get_user_model()


# ========================================
# 1. SPÉCIALITÉS → PUBLIQUE
# ========================================
class SpecialtyViewSet(viewsets.ModelViewSet):
    queryset = Specialty.objects.all().order_by('name')
    serializer_class = SpecialtySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminPermission()]


# ========================================
# 2. GESTION DES CLASSES - CORRIGÉ COMPLÈTEMENT
# ========================================
class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all().prefetch_related('subjects', 'students')
    serializer_class = ClassSerializer
    
    def get_permissions(self):
        """Permissions par action"""
        if self.action in ['list', 'retrieve', 'my_classmates', 'student_classes']:
            return [IsAuthenticated()]
        return [IsAdminPermission()]
    
    def get_queryset(self):
        """Filtrer les classes selon le rôle de l'utilisateur"""
        user = self.request.user
        
        if not user.is_authenticated:
            return Class.objects.none()
        
        # Les admins peuvent voir toutes les classes
        if user.role in ['admin', 'superadmin']:
            return Class.objects.all().prefetch_related('subjects', 'students')
        
        # Les enseignants peuvent voir les classes où ils enseignent
        elif user.role == 'teacher':
            return Class.objects.filter(
                subjects__teacher=user
            ).distinct().prefetch_related('subjects', 'students')
        
        # Les étudiants peuvent voir uniquement leur propre classe
        elif user.role == 'student':
            return user.enrolled_classes.all().prefetch_related('subjects', 'students')
        
        return Class.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Surcharger la méthode list pour retourner les données adaptées"""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': len(queryset),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], url_path='my-classmates')
    def my_classmates(self, request):
        """Retourne les camarades de classe d'un étudiant"""
        user = request.user
        
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Trouver la classe de l'étudiant
            student_class = user.enrolled_classes.first()
            if not student_class:
                return Response({
                    'success': True,
                    'class': 'Non assigné',
                    'count': 0,
                    'classmates': [],
                    'message': 'Vous n\'êtes pas encore assigné à une classe'
                })
            
            # Récupérer tous les étudiants de la classe sauf l'utilisateur
            classmates = student_class.students.filter(
                role='student'
            ).exclude(id=user.id).select_related('specialty')
            
            classmate_data = []
            for classmate in classmates:
                classmate_data.append({
                    'id': classmate.id,
                    'username': classmate.username,
                    'full_name': classmate.get_full_name(),
                    'email': classmate.email,
                    'role': 'student',
                    'class': student_class.name,
                    'specialty': classmate.specialty.name if classmate.specialty else None,
                    'avatar_color': self._generate_avatar_color(classmate.id),
                    'online': True  # À remplacer par votre logique de présence
                })
            
            return Response({
                'success': True,
                'class': student_class.name,
                'class_id': student_class.id,
                'count': len(classmate_data),
                'classmates': classmate_data
            })
            
        except Exception as e:
            logger.error(f"Erreur récupération camarades: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur serveur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='student-classes')
    def student_classes(self, request):
        """Retourne les informations complètes de la classe d'un étudiant"""
        user = request.user
        
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Trouver la classe de l'étudiant
            student_class = user.enrolled_classes.first()
            if not student_class:
                return Response({
                    'success': True,
                    'has_class': False,
                    'message': 'Vous n\'êtes pas encore assigné à une classe'
                })
            
            # Récupérer les camarades
            classmates = student_class.students.filter(
                role='student'
            ).exclude(id=user.id).select_related('specialty')
            
            # Récupérer les matières
            subjects = student_class.subjects.all().select_related('teacher', 'specialty')
            
            # Données des camarades
            classmate_data = []
            for classmate in classmates:
                classmate_data.append({
                    'id': classmate.id,
                    'username': classmate.username,
                    'full_name': classmate.get_full_name(),
                    'email': classmate.email,
                    'specialty': classmate.specialty.name if classmate.specialty else None,
                    'avatar_color': self._generate_avatar_color(classmate.id)
                })
            
            # Données des matières
            subject_data = []
            for subject in subjects:
                subject_data.append({
                    'id': subject.id,
                    'name': subject.name,
                    'teacher_id': subject.teacher.id if subject.teacher else None,
                    'teacher_name': subject.teacher.get_full_name() if subject.teacher else 'Non assigné',
                    'teacher_username': subject.teacher.username if subject.teacher else None,
                    'specialty': subject.specialty.name if subject.specialty else None
                })
            
            return Response({
                'success': True,
                'has_class': True,
                'class': {
                    'id': student_class.id,
                    'name': student_class.name,
                    'student_count': student_class.student_count(),
                    'max_students': student_class.max_students,
                    'is_full': student_class.is_full()
                },
                'classmates': {
                    'count': len(classmate_data),
                    'data': classmate_data
                },
                'subjects': {
                    'count': len(subject_data),
                    'data': subject_data
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur récupération classe étudiant: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur serveur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_avatar_color(self, user_id):
        """Génère une couleur d'avatar cohérente"""
        colors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0']
        return colors[user_id % len(colors)]

    @action(detail=True, methods=['post'], url_path='add-student')
    def add_student(self, request, pk=None):
        """Ajouter un étudiant à une classe"""
        cls = self.get_object()
        user_id = request.data.get("user_id")
        
        if not user_id:
            return Response(
                {"detail": "user_id requis", "success": False}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(pk=user_id, role='student')
        except User.DoesNotExist:
            return Response(
                {"detail": "Étudiant non trouvé", "success": False}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Vérifier si l'étudiant est déjà dans une classe
        if user.enrolled_classes.exists():
            current_class = user.enrolled_classes.first()
            return Response({
                "detail": f"Cet étudiant est déjà dans la classe '{current_class.name}'",
                "success": False,
                "current_class": {
                    "id": current_class.id,
                    "name": current_class.name
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier si la classe est pleine
        if cls.is_full():
            return Response({
                "detail": f"Cette classe est pleine ({cls.max_students} étudiants maximum)",
                "success": False,
                "max_students": cls.max_students,
                "current_count": cls.student_count()
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Ajouter l'étudiant à la classe
            cls.students.add(user)
            
            # Approuver automatiquement l'étudiant
            if not user.approved:
                user.approved = True
                user.save()

            return Response({
                "detail": f"{user.username} ajouté à {cls.name} avec succès !",
                "success": True,
                "student": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.get_full_name(),
                    "approved": user.approved
                },
                "class_info": {
                    "id": cls.id,
                    "name": cls.name,
                    "student_count": cls.student_count(),
                    "max_students": cls.max_students,
                    "is_full": cls.is_full()
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "detail": f"Erreur lors de l'ajout: {str(e)}",
                "success": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='remove-student')
    def remove_student(self, request, pk=None):
        """Retirer un étudiant d'une classe"""
        cls = self.get_object()
        user_id = request.data.get("user_id")
        
        if not user_id:
            return Response(
                {"detail": "user_id requis", "success": False}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(pk=user_id, role='student')
        except User.DoesNotExist:
            return Response(
                {"detail": "Étudiant non trouvé", "success": False}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Vérifier si l'étudiant est dans cette classe
        if not cls.students.filter(id=user.id).exists():
            return Response({
                "detail": f"Cet étudiant n'est pas dans la classe '{cls.name}'",
                "success": False
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Retirer l'étudiant de la classe
            cls.students.remove(user)
            
            # Mettre l'étudiant en attente
            user.approved = False
            user.save()

            return Response({
                "detail": f"{user.username} retiré de {cls.name} et mis en attente",
                "success": True,
                "student": {
                    "id": user.id,
                    "username": user.username,
                    "approved": user.approved
                },
                "class_info": {
                    "id": cls.id,
                    "name": cls.name,
                    "student_count": cls.student_count()
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "detail": f"Erreur lors du retrait: {str(e)}",
                "success": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        """Supprimer une classe et remettre les étudiants en attente"""
        cls = self.get_object()
        class_name = cls.name

        with transaction.atomic():
            # Récupérer tous les étudiants de la classe
            students = list(cls.students.filter(role='student'))
            
            # Supprimer la classe
            cls.delete()

            # Remettre tous les étudiants en attente
            for student in students:
                student.approved = False
                student.save()

        return Response(
            {
                "detail": f"Classe '{class_name}' supprimée.",
                "success": True,
                "students_affected": len(students),
                "message": f"{len(students)} étudiant(s) remis en attente."
            },
            status=status.HTTP_200_OK
        )
        


# ========================================
# 3. GESTION DES MATIÈRES
# ========================================
class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related('teacher', 'class_assigned', 'specialty')
    serializer_class = SubjectSerializer
    
    def get_permissions(self):
        """Autoriser les enseignants à voir les matières"""
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminPermission()]
    
    def get_queryset(self):
        """Filtrer selon l'utilisateur"""
        user = self.request.user
        
        if user.is_anonymous:
            return Subject.objects.none()
        
        if user.role in ['admin', 'superadmin']:
            return Subject.objects.all().select_related('teacher', 'class_assigned', 'specialty')
        elif user.role == 'teacher':
            # Les enseignants voient leurs matières et toutes les matières
            return Subject.objects.filter(
                Q(teacher=user) | Q(teacher__isnull=True)
            ).select_related('teacher', 'class_assigned', 'specialty')
        
        return Subject.objects.none()