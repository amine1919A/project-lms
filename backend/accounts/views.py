# backend/accounts/views.py - VERSION COMPLÈTE CORRIGÉE
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from django.db.models import Q
from classes.models import Class, Subject
from notifications.models import Notification
from .serializers import RegisterSerializer, UserSerializer, AdminCreateSerializer
from .permissions import IsSuperAdmin, IsAdmin, IsTeacher, IsStudent

User = get_user_model()

# ============================================
# AUTHENTIFICATION ET TOKENS JWT
# ============================================

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        print("🔐 Validation des identifiants...")
        
        # Si on reçoit 'username' mais pas 'email', copier username dans email
        if 'username' in attrs and 'email' not in attrs:
            attrs['email'] = attrs['username']
            print(f"📧 Copié username vers email: {attrs['email']}")
        
        # Si on reçoit 'email' mais pas 'username', copier email dans username
        elif 'email' in attrs and 'username' not in attrs:
            attrs['username'] = attrs['email']
            print(f"👤 Copié email vers username: {attrs['username']}")
        
        print(f"📦 Données finales: {attrs}")
        
        # Continuer avec la validation parente
        return super().validate(attrs)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # Pour le débogage
        print(f"Login attempt for data: {request.data}")
        
        return response

# ============================================
# INSCRIPTION ET PROFIL
# ============================================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            
            # Créer une notification pour l'admin
            if Notification.objects.exists():  # Si le modèle existe
                try:
                    # Trouver les admins
                    admins = User.objects.filter(role__in=['admin', 'superadmin'], approved=True)
                    for admin in admins:
                        Notification.objects.create(
                            user=admin,
                            title="Nouvelle inscription",
                            message=f"Un nouvel utilisateur ({request.data.get('role', 'inconnu')}) s'est inscrit : {request.data.get('username', '')}",
                            notification_type='info'
                        )
                except Exception as e:
                    print(f"Erreur création notification: {e}")
            
            return Response({
                "success": True,
                "message": "Inscription réussie ! Votre compte sera activé après approbation par un administrateur.",
                "data": response.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "success": False,
                "message": str(e) if str(e) else "Erreur lors de l'inscription"
            }, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        # Ne pas permettre la modification du rôle ou de l'approbation
        if 'role' in request.data:
            request.data.pop('role')
        if 'approved' in request.data:
            request.data.pop('approved')
        if 'is_staff' in request.data:
            request.data.pop('is_staff')
        if 'is_superuser' in request.data:
            request.data.pop('is_superuser')
        
        return super().update(request, *args, **kwargs)

# ============================================
# GESTION ADMIN DES UTILISATEURS
# ============================================

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin | IsSuperAdmin]

    def get_queryset(self):
        queryset = User.objects.all()
        
        # Filtrage par rôle
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        # Filtrage par statut d'approbation
        approved = self.request.query_params.get('approved', None)
        if approved:
            if approved.lower() == 'true':
                queryset = queryset.filter(approved=True)
            elif approved.lower() == 'false':
                queryset = queryset.filter(approved=False)
        
        # Recherche
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset.order_by('-date_joined')

class PendingUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin | IsSuperAdmin]

    def get_queryset(self):
        return User.objects.filter(approved=False, role__in=['student', 'teacher']).order_by('-date_joined')

class AdminCreateView(generics.CreateAPIView):
    serializer_class = AdminCreateSerializer
    permission_classes = [IsSuperAdmin]

class ApproveUserView(generics.UpdateAPIView):
    permission_classes = [IsAdmin | IsSuperAdmin]
    queryset = User.objects.all()
    lookup_field = 'pk'

    def post(self, request, *args, **kwargs):
        user = self.get_object()
        action = request.data.get("action", "approve")

        if action == "reject":
            username = user.username
            user.delete()
            
            # Notification de refus (si possible)
            try:
                Notification.objects.create(
                    user=user,
                    title="Compte refusé",
                    message="Votre demande d'inscription a été refusée.",
                    notification_type='error'
                )
            except:
                pass
                
            return Response({
                "success": True,
                "message": f"Compte de {username} refusé et supprimé"
            })

        if user.role == "student":
            class_id = request.data.get("class_id")
            if not class_id:
                return Response({
                    "success": False,
                    "message": "class_id requis pour étudiant"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                cls = Class.objects.get(id=class_id)
                if cls.students.count() >= 30:
                    return Response({
                        "success": False,
                        "message": "Classe pleine (30 étudiants maximum)"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                cls.students.add(user)
                
            except Class.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Classe invalide"
                }, status=status.HTTP_400_BAD_REQUEST)

        # Approuver l'utilisateur
        user.approved = True
        user.save()

        # Notification de bienvenue
        try:
            Notification.objects.create(
                user=user,
                title="Compte approuvé !",
                message="Votre compte a été approuvé ! Bienvenue sur ITEAM University !",
                notification_type='success'
            )
        except:
            pass

        return Response({
            "success": True,
            "message": f"{user.username} approuvé avec succès !",
            "user": UserSerializer(user).data
        })

# ============================================
# VIEWS SPÉCIFIQUES PAR RÔLE
# ============================================

class TeacherListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin | IsSuperAdmin]
    
    def get_queryset(self):
        return User.objects.filter(role='teacher', approved=True)

class StudentListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin | IsSuperAdmin | IsTeacher]
    
    def get_queryset(self):
        # Les enseignants ne voient que leurs étudiants
        if self.request.user.role == 'teacher':
            # Récupérer les classes où l'enseignant a des matières
            teacher_subjects = Subject.objects.filter(teacher=self.request.user)
            class_ids = teacher_subjects.values_list('class_assigned', flat=True).distinct()
            
            # Récupérer les étudiants de ces classes
            classes = Class.objects.filter(id__in=class_ids)
            student_ids = []
            for cls in classes:
                student_ids.extend(cls.students.values_list('id', flat=True))
            
            return User.objects.filter(id__in=student_ids, role='student', approved=True)
        
        # Les admins voient tous les étudiants
        return User.objects.filter(role='student', approved=True)

# ============================================
# VIEWS API SIMPLES
# ============================================

# backend/accounts/views.py - CORRECTION de get_users_by_role
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_users_by_role(request):
    """
    Endpoint: GET /api/accounts/users/
    Params: ?role=student&approved=true
    Retourne uniquement les utilisateurs filtrés par rôle et statut approuvé
    """
    role = request.query_params.get('role')
    approved = request.query_params.get('approved')

    users = User.objects.all()

    # Filtrage par rôle
    if role:
        users = users.filter(role=role)
    
    # Filtrage par statut d'approbation
    if approved:
        if approved.lower() == 'true':
            users = users.filter(approved=True)
        elif approved.lower() == 'false':
            users = users.filter(approved=False)

    # CORRECTION : Permettre aux étudiants de voir les enseignants
    if request.user.role == 'student':
        # Les étudiants peuvent voir les enseignants et autres étudiants
        if role in ['teacher', 'student']:
            # Filtrer seulement les utilisateurs approuvés
            users = users.filter(approved=True)
        else:
            # Si le rôle n'est pas spécifié ou autre, retourner seulement étudiants
            users = users.filter(role='student', approved=True)
    
    # Pour les enseignants
    elif request.user.role == 'teacher':
        # Les enseignants peuvent voir tous les étudiants
        if role == 'student':
            # Récupérer les classes où l'enseignant a des matières
            teacher_subjects = Subject.objects.filter(teacher=request.user)
            class_ids = teacher_subjects.values_list('class_assigned', flat=True).distinct()
            classes = Class.objects.filter(id__in=class_ids)
            student_ids = []
            for cls in classes:
                student_ids.extend(cls.students.values_list('id', flat=True))
            
            users = users.filter(id__in=student_ids, role='student', approved=True)
        else:
            # Les enseignants ne peuvent voir que les étudiants
            users = users.filter(role='student', approved=True)

    serializer = UserSerializer(users, many=True)
    
    return Response({
        "success": True,
        "count": users.count(),
        "users": serializer.data
    }, status=status.HTTP_200_OK)


# backend/accounts/views.py - NOUVELLE VIEW
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def chat_contacts(request):
    """
    Endpoint pour récupérer les contacts pour le chat
    Retourne les enseignants et étudiants selon le rôle de l'utilisateur
    """
    user = request.user
    
    if user.role == 'student':
        # Les étudiants voient tous les enseignants
        teachers = User.objects.filter(role='teacher', approved=True).select_related('specialty')
        # Et les autres étudiants de leur classe
        if hasattr(user, 'enrolled_classes') and user.enrolled_classes.exists():
            class_obj = user.enrolled_classes.first()
            students = class_obj.students.filter(role='student', approved=True).exclude(id=user.id)
        else:
            students = User.objects.none()
        
        teachers_data = [{
            'id': t.id,
            'username': t.username,
            'full_name': t.get_full_name(),
            'email': t.email,
            'role': 'teacher',
            'specialty': t.specialty.name if t.specialty else None,
            'is_online': False  # À implémenter avec WebSocket
        } for t in teachers]
        
        students_data = [{
            'id': s.id,
            'username': s.username,
            'full_name': s.get_full_name(),
            'email': s.email,
            'role': 'student',
            'class': s.enrolled_classes.first().name if s.enrolled_classes.exists() else None,
            'is_online': False
        } for s in students]
        
        return Response({
            'success': True,
            'teachers': teachers_data,
            'students': students_data
        })
    
    elif user.role == 'teacher':
        # Les enseignants voient leurs étudiants
        teacher_subjects = Subject.objects.filter(teacher=user)
        class_ids = teacher_subjects.values_list('class_assigned', flat=True).distinct()
        classes = Class.objects.filter(id__in=class_ids)
        students = []
        for cls in classes:
            students.extend(cls.students.filter(role='student', approved=True))
        
        students_data = [{
            'id': s.id,
            'username': s.username,
            'full_name': s.get_full_name(),
            'email': s.email,
            'role': 'student',
            'class': cls.name if (cls := s.enrolled_classes.first()) else None,
            'is_online': False
        } for s in students]
        
        # Les enseignants peuvent aussi voir d'autres enseignants
        other_teachers = User.objects.filter(role='teacher', approved=True).exclude(id=user.id)
        teachers_data = [{
            'id': t.id,
            'username': t.username,
            'full_name': t.get_full_name(),
            'email': t.email,
            'role': 'teacher',
            'specialty': t.specialty.name if t.specialty else None,
            'is_online': False
        } for t in other_teachers]
        
        return Response({
            'success': True,
            'students': students_data,
            'teachers': teachers_data
        })
    
    return Response({
        'success': False,
        'error': 'Rôle non supporté'
    }, status=403)




@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_current_user(request):
    """Récupérer les informations de l'utilisateur courant"""
    serializer = UserSerializer(request.user)
    return Response({
        "success": True,
        "user": serializer.data
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Changer le mot de passe"""
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not old_password or not new_password:
        return Response({
            "success": False,
            "message": "Ancien et nouveau mot de passe requis"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Vérifier l'ancien mot de passe
    if not user.check_password(old_password):
        return Response({
            "success": False,
            "message": "Ancien mot de passe incorrect"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Changer le mot de passe
    user.set_password(new_password)
    user.save()
    
    return Response({
        "success": True,
        "message": "Mot de passe changé avec succès"
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_username(request):
    """Vérifier si un username est disponible"""
    username = request.query_params.get('username')
    email = request.query_params.get('email')
    
    if username:
        exists = User.objects.filter(username__iexact=username).exists()
        return Response({
            "available": not exists,
            "message": "Username déjà pris" if exists else "Username disponible"
        })
    
    if email:
        exists = User.objects.filter(email__iexact=email).exists()
        return Response({
            "available": not exists,
            "message": "Email déjà utilisé" if exists else "Email disponible"
        })
    
    return Response({
        "success": False,
        "message": "Paramètre username ou email requis"
    }, status=status.HTTP_400_BAD_REQUEST)

# ============================================
# VIEWS POUR LES STATISTIQUES
# ============================================

@api_view(['GET'])
@permission_classes([IsAdmin | IsSuperAdmin])
def user_stats(request):
    """Statistiques sur les utilisateurs"""
    total_users = User.objects.count()
    approved_users = User.objects.filter(approved=True).count()
    pending_users = User.objects.filter(approved=False).count()
    
    role_stats = {}
    for role_code, role_name in User.ROLE_CHOICES:
        count = User.objects.filter(role=role_code).count()
        approved_count = User.objects.filter(role=role_code, approved=True).count()
        role_stats[role_code] = {
            'name': role_name,
            'total': count,
            'approved': approved_count,
            'pending': count - approved_count
        }
    
    return Response({
        "success": True,
        "stats": {
            "total_users": total_users,
            "approved_users": approved_users,
            "pending_users": pending_users,
            "by_role": role_stats,
            "approval_rate": (approved_users / total_users * 100) if total_users > 0 else 0
        }
    })