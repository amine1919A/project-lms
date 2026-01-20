# backend/chat/views.py - VERSION COMPLÈTE CORRIGÉE
import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
import os
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from .models import ChatRoom, Message, RoomParticipant
from .serializers import ChatRoomSerializer, MessageSerializer
from accounts.models import CustomUser
from classes.models import Class, Subject

logger = logging.getLogger(__name__)

class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_private_chat(self, request):
        """Créer une conversation privée avec un utilisateur"""
        try:
            user_id = request.data.get('user_id')
            
            if not user_id:
                return Response({'error': 'user_id requis'}, status=400)
            
            # Vérifier que l'utilisateur existe
            other_user = get_object_or_404(CustomUser, id=user_id)
            
            if other_user.id == request.user.id:
                return Response({'error': 'Vous ne pouvez pas créer une conversation avec vous-même'}, 
                              status=400)
            
            # Vérifier si une conversation privée existe déjà entre ces deux utilisateurs
            existing_rooms = ChatRoom.objects.filter(
                room_type='private',
                participants__user=request.user
            ).filter(
                participants__user=other_user
            ).distinct()
            
            if existing_rooms.exists():
                room = existing_rooms.first()
                serializer = self.get_serializer(room, context={'request': request})
                return Response(serializer.data)
            
            # Créer la nouvelle conversation privée
            room = ChatRoom.objects.create(
                name=f"{request.user.username} - {other_user.username}",
                room_type='private',
                created_by=request.user
            )
            
            # Ajouter les deux participants
            RoomParticipant.objects.create(
                room=room,
                user=request.user,
                is_admin=True
            )
            
            RoomParticipant.objects.create(
                room=room,
                user=other_user,
                is_admin=True
            )
            
            serializer = self.get_serializer(room, context={'request': request})
            logger.info(f"✅ Conversation privée créée: {room.name}")
            return Response(serializer.data, status=201)
            
        except Exception as e:
            logger.error(f"❌ Erreur création conversation privée: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    def get_queryset(self):
        user = self.request.user
        logger.info(f"🔍 get_queryset pour user: {user.username} (role: {user.role})")
        
        if user.role == 'student':
            # Pour les étudiants: conversations privées + groupes de classe + groupes de matière
            classes = user.enrolled_classes.all()
            logger.info(f"📚 Classes de l'étudiant: {[c.name for c in classes]}")
            
            subjects = Subject.objects.filter(class_assigned__in=classes)
            logger.info(f"📖 Matières de l'étudiant: {[s.name for s in subjects]}")
            
            # Salles privées où l'utilisateur est participant
            private_rooms = ChatRoom.objects.filter(
                room_type='private',
                participants__user=user
            ).distinct()
            
            # Groupes de classe
            class_rooms = ChatRoom.objects.filter(
                room_type='group_class',
                class_related__in=classes
            ).distinct()
            
            # Groupes de matière
            subject_rooms = ChatRoom.objects.filter(
                room_type='group_subject',
                subject_related__in=subjects
            ).distinct()
            
            # Combiner tous les résultats
            all_rooms = (private_rooms | class_rooms | subject_rooms).distinct()
            logger.info(f"✅ Total salles trouvées: {all_rooms.count()}")
            return all_rooms
        
        elif user.role == 'teacher':
            # Pour les enseignants: conversations privées + groupes de matière qu'ils enseignent
            subjects = Subject.objects.filter(teacher=user)
            classes = Class.objects.filter(subjects__in=subjects).distinct()
            
            # Salles privées
            private_rooms = ChatRoom.objects.filter(
                room_type='private',
                participants__user=user
            ).distinct()
            
            # Groupes de matière
            subject_rooms = ChatRoom.objects.filter(
                room_type='group_subject',
                subject_related__in=subjects
            ).distinct()
            
            # Groupes de classe pour les classes où ils enseignent
            class_rooms = ChatRoom.objects.filter(
                room_type='group_class',
                class_related__in=classes
            ).distinct()
            
            return (private_rooms | subject_rooms | class_rooms).distinct()
        
        # Pour les administrateurs, voir tous les chats
        elif user.is_staff or user.is_superuser:
            return ChatRoom.objects.all()
        
        return ChatRoom.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_chats(self, request):
        """Récupérer les chats de l'utilisateur"""
        try:
            rooms = self.get_queryset()
            serializer = self.get_serializer(rooms, many=True, context={'request': request})
            
            logger.info(f"📨 my_chats - {len(rooms)} salles trouvées pour {request.user.username}")
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"❌ Erreur dans my_chats: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def create_class_group(self, request):
        """Créer un groupe de classe automatiquement"""
        try:
            class_id = request.data.get('class_id')
            class_name = request.data.get('class_name')
            
            if not class_id and not class_name:
                return Response({'error': 'class_id ou class_name requis'}, status=400)
            
            # Récupérer la classe
            if class_id:
                class_obj = get_object_or_404(Class, id=class_id)
            else:
                class_obj = get_object_or_404(Class, name=class_name)
            
            # Vérifier si le groupe existe déjà
            existing_room = ChatRoom.objects.filter(
                room_type='group_class',
                class_related=class_obj
            ).first()
            
            if existing_room:
                serializer = self.get_serializer(existing_room, context={'request': request})
                return Response(serializer.data)
            
            # Créer le groupe
            room = ChatRoom.objects.create(
                name=f"Groupe {class_obj.name}",
                room_type='group_class',
                created_by=request.user,
                class_related=class_obj
            )
            
            # Ajouter tous les étudiants de la classe
            students = class_obj.students.all()
            for student in students:
                RoomParticipant.objects.get_or_create(
                    room=room,
                    user=student,
                    defaults={'is_admin': student == request.user}
                )
            
            # Ajouter les enseignants de la classe
            teachers = CustomUser.objects.filter(
                teaching_subjects__class_assigned=class_obj
            ).distinct()
            
            for teacher in teachers:
                RoomParticipant.objects.get_or_create(
                    room=room,
                    user=teacher,
                    defaults={'is_admin': False}
                )
            
            serializer = self.get_serializer(room, context={'request': request})
            logger.info(f"✅ Groupe classe créé: {room.name}")
            return Response(serializer.data, status=201)
            
        except Exception as e:
            logger.error(f"❌ Erreur création groupe classe: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def create_subject_group(self, request):
        """Créer un groupe de matière automatiquement"""
        try:
            subject_name = request.data.get('subject_name')
            teacher_id = request.data.get('teacher_id')
            class_id = request.data.get('class_id')
            
            if not subject_name:
                return Response({'error': 'subject_name requis'}, status=400)
            
            # Chercher la matière
            subjects = Subject.objects.filter(name=subject_name)
            if class_id:
                subjects = subjects.filter(class_assigned_id=class_id)
            if teacher_id:
                subjects = subjects.filter(teacher_id=teacher_id)
            
            subject = subjects.first()
            
            if not subject:
                logger.warning(f"❌ Matière non trouvée: {subject_name}")
                return Response(
                    {'error': 'Matière non trouvée'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Vérifier si le groupe existe déjà
            existing_room = ChatRoom.objects.filter(
                room_type='group_subject',
                subject_related=subject
            ).first()
            
            if existing_room:
                serializer = self.get_serializer(existing_room, context={'request': request})
                return Response(serializer.data)
            
            # Créer le groupe
            room = ChatRoom.objects.create(
                name=f"{subject.name} - {subject.class_assigned.name if subject.class_assigned else 'Groupe'}",
                room_type='group_subject',
                created_by=request.user,
                subject_related=subject
            )
            
            # Ajouter tous les étudiants de la classe
            if subject.class_assigned:
                students = subject.class_assigned.students.all()
                for student in students:
                    RoomParticipant.objects.get_or_create(
                        room=room,
                        user=student,
                        defaults={'is_admin': False}
                    )
            
            # Ajouter l'enseignant de la matière
            if subject.teacher:
                RoomParticipant.objects.get_or_create(
                    room=room,
                    user=subject.teacher,
                    defaults={'is_admin': True}
                )
            
            serializer = self.get_serializer(room, context={'request': request})
            logger.info(f"✅ Groupe matière créé: {room.name}")
            return Response(serializer.data, status=201)
            
        except Exception as e:
            logger.error(f"❌ Erreur création groupe matière: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        # backend/chat/views.py - VERSION CORRIGÉE
@action(detail=False, methods=['get'])
def available_contacts(self, request):
    """
    Retourne la liste des contacts disponibles pour l'utilisateur
    Version simplifiée et robuste
    """
    try:
        user = request.user
        contacts = []
        
        logger.info(f"📞 Recherche contacts pour {user.username} (role: {user.role})")
        
        if user.role == 'teacher':
            # Pour les enseignants: montrer leurs étudiants et collègues enseignants
            
            # 1. Étudiants dans leurs classes
            try:
                subjects = Subject.objects.filter(teacher=user)
                classes = Class.objects.filter(subjects__in=subjects).distinct()
                
                for class_obj in classes:
                    try:
                        students = class_obj.students.all()
                        for student in students:
                            contacts.append({
                                'id': student.id,
                                'username': student.username,
                                'full_name': f"{student.first_name or ''} {student.last_name or ''}".strip() or student.username,
                                'email': student.email or '',
                                'role': student.role or 'student',
                                'class': class_obj.name,
                                'avatar_url': getattr(student, 'avatar_url', '') or ''
                            })
                    except Exception as cls_error:
                        logger.error(f"❌ Erreur étudiants classe {class_obj.id}: {cls_error}")
                        continue
            except Exception as subjects_error:
                logger.error(f"❌ Erreur récupération matières: {subjects_error}")
            
            # 2. Autres enseignants
            try:
                teachers = CustomUser.objects.filter(
                    role='teacher'
                ).exclude(id=user.id).distinct()
                
                for teacher in teachers:
                    contacts.append({
                        'id': teacher.id,
                        'username': teacher.username,
                        'full_name': f"{teacher.first_name or ''} {teacher.last_name or ''}".strip() or teacher.username,
                        'email': teacher.email or '',
                        'role': teacher.role or 'teacher',
                        'class': 'Enseignant',
                        'avatar_url': getattr(teacher, 'avatar_url', '') or ''
                    })
            except Exception as teachers_error:
                logger.error(f"❌ Erreur récupération enseignants: {teachers_error}")
            
        elif user.role == 'student':
            # Pour les étudiants: montrer leurs enseignants et camarades de classe
            
            # 1. Enseignants de leurs matières
            try:
                classes = user.enrolled_classes.all()
                subjects = Subject.objects.filter(class_assigned__in=classes)
                
                for subject in subjects:
                    if subject.teacher:
                        contacts.append({
                            'id': subject.teacher.id,
                            'username': subject.teacher.username,
                            'full_name': f"{subject.teacher.first_name or ''} {subject.teacher.last_name or ''}".strip() or subject.teacher.username,
                            'email': subject.teacher.email or '',
                            'role': subject.teacher.role or 'teacher',
                            'subject': subject.name,
                            'class': subject.class_assigned.name if subject.class_assigned else 'Non assigné',
                            'avatar_url': getattr(subject.teacher, 'avatar_url', '') or ''
                        })
            except Exception as student_error:
                logger.error(f"❌ Erreur récupération enseignants étudiant: {student_error}")
            
            # 2. Camarades de classe
            try:
                for class_obj in classes:
                    classmates = class_obj.students.all().exclude(id=user.id)
                    for classmate in classmates:
                        contacts.append({
                            'id': classmate.id,
                            'username': classmate.username,
                            'full_name': f"{classmate.first_name or ''} {classmate.last_name or ''}".strip() or classmate.username,
                            'email': classmate.email or '',
                            'role': classmate.role or 'student',
                            'class': class_obj.name,
                            'avatar_url': getattr(classmate, 'avatar_url', '') or ''
                        })
            except Exception as classmates_error:
                logger.error(f"❌ Erreur récupération camarades: {classmates_error}")
        
        elif user.is_staff or user.is_superuser:
            # Pour les administrateurs: montrer tous les utilisateurs
            try:
                all_users = CustomUser.objects.all().exclude(id=user.id)
                
                for user_obj in all_users:
                    contacts.append({
                        'id': user_obj.id,
                        'username': user_obj.username,
                        'full_name': f"{user_obj.first_name or ''} {user_obj.last_name or ''}".strip() or user_obj.username,
                        'email': user_obj.email or '',
                        'role': user_obj.role or '',
                        'avatar_url': getattr(user_obj, 'avatar_url', '') or ''
                    })
            except Exception as admin_error:
                logger.error(f"❌ Erreur récupération tous utilisateurs: {admin_error}")
        
        # Supprimer les doublons (au cas où)
        seen_ids = set()
        unique_contacts = []
        for contact in contacts:
            if contact['id'] not in seen_ids:
                seen_ids.add(contact['id'])
                unique_contacts.append(contact)
        
        logger.info(f"✅ {len(unique_contacts)} contacts trouvés pour {user.username}")
        
        return Response({
            'contacts': unique_contacts,
            'count': len(unique_contacts)
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération contacts: {str(e)}", exc_info=True)
        # Retourner une liste vide au lieu d'erreur 500
        return Response({
            'contacts': [],
            'count': 0,
            'error': str(e)
        })

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        user = self.request.user
        # Messages dans les salles auxquelles l'utilisateur a accès
        rooms = ChatRoom.objects.filter(
            Q(participants__user=user) |
            Q(room_type='group_class', class_related__students=user) |
            Q(room_type='group_subject', subject_related__class_assigned__students=user)
        ).distinct()
        
        return Message.objects.filter(room__in=rooms).order_by('created_at')
    
    def has_access_to_room(self, user, room):
        """Vérifie si l'utilisateur a accès à la salle"""
        if room.room_type == 'private':
            return room.participants.filter(user=user).exists()
        elif room.room_type == 'group_class':
            return room.class_related.students.filter(id=user.id).exists()
        elif room.room_type == 'group_subject':
            if not room.subject_related or not room.subject_related.class_assigned:
                return False
            return room.subject_related.class_assigned.students.filter(id=user.id).exists()
        return False
    
    def create(self, request, *args, **kwargs):
        """Création de message avec support des fichiers - CORRIGÉ"""
        try:
            # Vérifier si room_id est fourni
            room_id = request.data.get('room')
            if not room_id:
                return Response({'error': 'room_id requis'}, status=400)
            
            # Vérifier l'accès à la salle
            room = get_object_or_404(ChatRoom, id=room_id)
            if not self.has_access_to_room(request.user, room):
                return Response({'error': 'Accès refusé'}, status=403)
            
            # Préparer les données
            data = request.data.copy()
            data['sender'] = request.user.id
            
            # Gérer l'upload de fichier si présent
            if 'file' in request.FILES:
                uploaded_file = request.FILES['file']
                
                # Valider la taille du fichier (max 10MB)
                if uploaded_file.size > 10 * 1024 * 1024:
                    return Response({'error': 'Fichier trop volumineux (>10MB)'}, status=400)
                
                # Valider le type de fichier
                allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt']
                file_ext = os.path.splitext(uploaded_file.name)[1].lower()
                if file_ext not in allowed_extensions:
                    return Response({'error': 'Type de fichier non autorisé'}, status=400)
                
                # Enregistrer le fichier
                file_path = f'chat/files/{uploaded_file.name}'
                file_name = default_storage.save(file_path, ContentFile(uploaded_file.read()))
                
                # Ajouter les informations du fichier aux données
                data['file'] = file_name
                data['file_name'] = uploaded_file.name
                data['file_size'] = uploaded_file.size
            
            # Créer le message
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            message = serializer.save()
            
            # Marquer comme lu pour l'expéditeur
            message.is_read = True
            message.save()
            
            logger.info(f"✅ Message créé: {message.id} par {request.user.username}")
            
            return Response(serializer.data, status=201)
            
        except Exception as e:
            logger.error(f"❌ Erreur création message: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def room_messages(self, request):
        """Récupérer les messages d'une salle spécifique"""
        room_id = request.query_params.get('room_id')
        if not room_id:
            return Response({'error': 'room_id requis'}, status=400)
        
        try:
            room = get_object_or_404(ChatRoom, id=room_id)
            
            # Vérifier l'accès
            if not self.has_access_to_room(request.user, room):
                return Response({'error': 'Accès refusé'}, status=403)
            
            messages = Message.objects.filter(room=room).order_by('created_at')
            serializer = self.get_serializer(messages, many=True, context={'request': request})
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération messages: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur serveur: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )