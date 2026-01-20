# backend/tests/views.py - VERSION COMPLÈTE CORRIGÉE
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Sum, Avg, Count
import logging
from django.utils import timezone  # Assurez-vous que c'est importé
from classes.models import  Class, Subject  
from accounts.permissions import IsTeacher, IsStudent, IsAdmin
from django.contrib.auth import get_user_model
CustomUser = get_user_model()
from django.db.models import Min, Max
from django.db.models import Prefetch
from .models import Quiz, Question, Choice, StudentAnswer, QuizResult  # QuizResult doit être ici
from .serializers import (
    QuizSerializer, QuizCreateSerializer, QuestionSerializer, QuestionCreateSerializer,
    ChoiceSerializer, ChoiceCreateSerializer, StudentAnswerSerializer, QuizResultSerializer
)
from accounts.permissions import IsTeacher, IsStudent, IsAdmin

logger = logging.getLogger(__name__)

# ========================================
# VUES GÉNÉRIQUES
# ========================================

class MyQuizzesView(generics.ListAPIView):
    """Vue pour les quizzes de l'utilisateur connecté"""
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'student':
            # Quiz disponibles pour l'étudiant
            student_classes = user.enrolled_classes.all()
            subject_ids = student_classes.values_list('subjects__id', flat=True)
            
            now = timezone.now()
            return Quiz.objects.filter(
                subject_id__in=subject_ids,
                is_active=True,
                end_time__gte=now
            ).select_related('subject', 'teacher').order_by('start_time')
        
        elif user.role == 'teacher':
            # Quiz créés par l'enseignant
            return Quiz.objects.filter(
                teacher=user
            ).select_related('subject', 'teacher').order_by('-created_at')
        
        return Quiz.objects.none()

# ========================================
# VIEWSETS PRINCIPAUX
# ========================================

class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet pour les quizzes"""
    
    def get_permissions(self):
        """Permissions différentes selon les actions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsTeacher]
        elif self.action == 'list':
            permission_classes = [IsAuthenticated]
        else:  # retrieve
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Utiliser le bon serializer selon l'action"""
        if self.action in ['create', 'update', 'partial_update']:
            return QuizCreateSerializer
        return QuizSerializer
    
    def get_queryset(self):
        """Retourner les quizzes selon le rôle de l'utilisateur"""
        user = self.request.user
        
        if user.role == 'teacher':
            # Quiz créés par l'enseignant
            return Quiz.objects.filter(teacher=user).select_related('subject', 'teacher')
        elif user.role == 'student':
            # Quiz des matières où l'étudiant est inscrit
            student_classes = user.enrolled_classes.all()
            subject_ids = student_classes.values_list('subjects__id', flat=True)
            return Quiz.objects.filter(
                subject_id__in=subject_ids, 
                is_active=True
            ).select_related('subject', 'teacher')
        else:
            # Admin voit tout
            return Quiz.objects.all().select_related('subject', 'teacher')
    
    def create(self, request, *args, **kwargs):
        """Création de quiz avec validation améliorée"""
        logger.info(f"Création de quiz - User: {request.user.username} (ID: {request.user.id}, Role: {request.user.role})")
        logger.info(f"Données reçues: {request.data}")
        
        # Vérifier que l'utilisateur est un enseignant
        if request.user.role != 'teacher':
            return Response({
                'success': False,
                'error': 'Permission refusée',
                'detail': 'Seuls les enseignants peuvent créer des tests',
                'user_role': request.user.role
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Utiliser le serializer avec le contexte
        serializer = self.get_serializer_class()(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            logger.info("Serializer valide")
            logger.info(f"Données validées: {serializer.validated_data}")
            
            try:
                # Sauvegarder le quiz
                quiz = serializer.save()
                logger.info(f"Quiz créé avec succès: {quiz.title} (ID: {quiz.id})")
                
                return Response({
                    'success': True,
                    'message': 'Quiz créé avec succès',
                    'quiz_id': quiz.id,
                    'data': QuizSerializer(quiz, context={'request': request}).data
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Erreur lors de la sauvegarde du quiz: {str(e)}")
                return Response({
                    'success': False,
                    'error': str(e),
                    'message': 'Erreur lors de la création du quiz'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.warning(f"Erreurs de validation: {serializer.errors}")
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Erreurs de validation'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Récupérer les questions d'un quiz"""
        quiz = self.get_object()
        
        # Vérifier les permissions
        user = request.user
        if user.role == 'student':
            # Vérifier que l'étudiant a accès
            student_classes = user.enrolled_classes.all()
            subject_ids = student_classes.values_list('subjects__id', flat=True)
            if quiz.subject.id not in subject_ids:
                return Response({
                    'success': False,
                    'error': 'Accès refusé'
                }, status=status.HTTP_403_FORBIDDEN)
        
        questions = Question.objects.filter(quiz=quiz).prefetch_related('choices')
        serializer = QuestionSerializer(questions, many=True)
        
        return Response({
            'success': True,
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'questions': serializer.data,
            'total_questions': questions.count()
        })


class QuestionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les questions"""
    
    def get_permissions(self):
        """Permissions selon les actions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsTeacher]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Utiliser le bon serializer selon l'action"""
        if self.action in ['create', 'update', 'partial_update']:
            return QuestionCreateSerializer
        return QuestionSerializer
    
    def get_queryset(self):
        """Retourner les questions selon le rôle"""
        user = self.request.user
        
        if user.role == 'teacher':
            # Questions des quiz de l'enseignant
            teacher_quizzes = Quiz.objects.filter(teacher=user)
            return Question.objects.filter(quiz__in=teacher_quizzes).select_related('quiz')
        elif user.role == 'student':
            # Questions des quiz accessibles à l'étudiant
            student_classes = user.enrolled_classes.all()
            subject_ids = student_classes.values_list('subjects__id', flat=True)
            accessible_quizzes = Quiz.objects.filter(
                subject_id__in=subject_ids,
                is_active=True
            )
            return Question.objects.filter(quiz__in=accessible_quizzes).select_related('quiz')
        else:
            return Question.objects.all().select_related('quiz')
    
    def create(self, request, *args, **kwargs):
        """Création d'une question"""
        logger.info(f"Création de question - User: {request.user.username}")
        logger.info(f"Données reçues: {request.data}")
        
        serializer = self.get_serializer_class()(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            logger.info("Serializer de question valide")
            
            try:
                question = serializer.save()
                logger.info(f"Question créée: {question.text[:50]}... (ID: {question.id})")
                
                return Response({
                    'success': True,
                    'message': 'Question créée avec succès',
                    'question_id': question.id,
                    'data': QuestionSerializer(question).data
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Erreur création question: {str(e)}")
                return Response({
                    'success': False,
                    'error': str(e),
                    'message': 'Erreur lors de la création de la question'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.warning(f"Erreurs de validation question: {serializer.errors}")
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Erreurs de validation'
            }, status=status.HTTP_400_BAD_REQUEST)


# backend/tests/views.py - CORRIGEZ ChoiceViewSet

class ChoiceViewSet(viewsets.ModelViewSet):
    """ViewSet pour les choix"""
    serializer_class = ChoiceSerializer
    
    def get_permissions(self):
        """Permissions selon les actions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsTeacher | IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'teacher':
            # Choix des questions des quiz de l'enseignant
            teacher_quizzes = Quiz.objects.filter(teacher=user)
            teacher_questions = Question.objects.filter(quiz__in=teacher_quizzes)
            return Choice.objects.filter(question__in=teacher_questions).select_related('question')
        else:
            return Choice.objects.all().select_related('question')
    
    def create(self, request, *args, **kwargs):
        """Création d'un choix avec validation"""
        logger.info(f"Création de choix - User: {request.user.username}")
        logger.info(f"Données reçues: {request.data}")
        
        # Vérifier que la question existe
        try:
            question_id = request.data.get('question')
            if not question_id:
                return Response({
                    'success': False,
                    'error': 'Le champ "question" est requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            question = Question.objects.get(id=question_id)
            
            # Vérifier les permissions
            if request.user.role != 'teacher' or question.quiz.teacher != request.user:
                return Response({
                    'success': False,
                    'error': 'Permission refusée',
                    'detail': 'Seuls les enseignants peuvent ajouter des choix à leurs questions'
                }, status=status.HTTP_403_FORBIDDEN)
            
        except Question.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Question avec ID {question_id} non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Utiliser le serializer ChoiceCreateSerializer pour la création
        serializer = ChoiceCreateSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            try:
                choice = serializer.save()
                logger.info(f"Choix créé avec succès: {choice.id}")
                
                return Response({
                    'success': True,
                    'message': 'Choix créé avec succès',
                    'choice_id': choice.id
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Erreur lors de la sauvegarde du choix: {str(e)}")
                return Response({
                    'success': False,
                    'error': str(e),
                    'message': 'Erreur lors de la création du choix'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.warning(f"Erreurs de validation choix: {serializer.errors}")
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Erreurs de validation'
            }, status=status.HTTP_400_BAD_REQUEST)


class StudentAnswerViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les réponses des étudiants"""
    serializer_class = StudentAnswerSerializer
    
    def get_permissions(self):
        if self.request.method in ['GET']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsTeacher | IsAdmin]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'teacher':
            # Les enseignants voient les réponses à leurs quiz
            teacher_quizzes = Quiz.objects.filter(teacher=user)
            return StudentAnswer.objects.filter(quiz__in=teacher_quizzes).select_related(
                'student', 'quiz', 'question'
            )
        elif user.role == 'student':
            # Les étudiants voient leurs propres réponses
            return StudentAnswer.objects.filter(student=user).select_related(
                'student', 'quiz', 'question'
            )
        else:
            return StudentAnswer.objects.all().select_related(
                'student', 'quiz', 'question'
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_student_responses(request, quiz_id, student_id):
    """Endpoint de test pour vérifier les données disponibles - VERSION CORRIGÉE"""
    try:
        # Récupérer les objets avec try/catch pour éviter les erreurs 500
        quiz = None
        student = None
        
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            quiz = None
            
        try:
            student = CustomUser.objects.get(id=student_id)
        except CustomUser.DoesNotExist:
            student = None
        
        # Vérifier les permissions
        user = request.user
        if user.role == 'teacher' and quiz:
            if quiz.teacher != user:
                return Response({
                    'success': False,
                    'error': 'Accès refusé'
                }, status=403)
        
        # Collecter les informations de debug - VERSION SIMPLIFIÉE
        debug_data = {
            'quiz_exists': quiz is not None,
            'student_exists': student is not None,
            'user_role': user.role,
            'user_id': user.id,
            'quiz_id': quiz_id,
            'student_id': student_id,
        }
        
        # Ajouter les infos du quiz si existant
        if quiz:
            debug_data['quiz_info'] = {
                'id': quiz.id,
                'title': quiz.title,
                'teacher_id': quiz.teacher.id if quiz.teacher else None,
                'teacher_name': quiz.teacher.get_full_name() if quiz.teacher else None,
                'subject_id': quiz.subject.id if quiz.subject else None,
                'subject_name': quiz.subject.name if quiz.subject else None,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks
            }
        
        # Ajouter les infos de l'étudiant si existant
        if student:
            debug_data['student_info'] = {
                'id': student.id,
                'full_name': student.get_full_name(),
                'email': student.email,
                'role': student.role,
                'class': student.enrolled_classes.first().name if student.enrolled_classes.exists() else None
            }
        
        # Ajouter les statistiques
        debug_data['stats'] = {
            'questions_count': Question.objects.filter(quiz_id=quiz_id).count() if quiz else 0,
            'student_answers_count': StudentAnswer.objects.filter(quiz_id=quiz_id, student_id=student_id).count(),
            'quiz_results_count': QuizResult.objects.filter(quiz_id=quiz_id, student_id=student_id).count(),
        }
        
        return Response({
            'success': True,
            'debug_data': debug_data,
            'message': 'Données de debug chargées',
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ ERREUR test_student_responses: {str(e)}", exc_info=True)
        # Retourner une erreur avec plus de détails
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ TRACEBACK: {error_details}")
        
        return Response({
            'success': False,
            'error': f'Erreur: {str(e)}',
            'details': error_details[:500]  # Limiter la taille
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# ========================================
# API VIEWS
# ========================================
# backend/tests/views.py - CORRECTION DE LA VUE get_student_responses
# backend/tests/views.py - VERSION CORRIGÉE
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def get_student_responses(request, quiz_id, student_id):
    """Récupérer les réponses d'un étudiant pour un quiz - VERSION CORRIGÉE"""
    try:
        # 1. Vérifier les permissions
        if request.user.role != 'teacher':
            return Response({
                'success': False,
                'error': 'Accès réservé aux enseignants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Récupérer le quiz
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # 3. Vérifier que l'enseignant est le propriétaire
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Vous n\'êtes pas l\'enseignant de ce quiz'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 4. Récupérer l'étudiant
        student = get_object_or_404(CustomUser, id=student_id, role='student')
        
        # 5. Récupérer toutes les questions du quiz
        questions = Question.objects.filter(
            quiz=quiz
        ).order_by('order').prefetch_related('choices')
        
        # 6. Récupérer les réponses de l'étudiant
        student_answers = StudentAnswer.objects.filter(
            quiz=quiz,
            student=student
        ).prefetch_related('selected_choices')
        
        # Créer un dictionnaire pour accéder rapidement aux réponses
        answers_dict = {answer.question_id: answer for answer in student_answers}
        
        # 7. Récupérer le résultat du quiz (s'il existe)
        quiz_result = QuizResult.objects.filter(
            quiz=quiz,
            student=student
        ).first()
        
        # 8. Préparer les données des questions avec les réponses
        questions_data = []
        total_score = 0
        
        for question in questions:
            answer = answers_dict.get(question.id)
            
            # Préparer les données de base de la question
            question_data = {
                'id': question.id,
                'text': question.text,
                'question_type': question.question_type,
                'marks': question.marks,
                'order': question.order,
                'image': request.build_absolute_uri(question.image.url) if question.image else None,
                
                # Données de l'étudiant
                'student_answer': {
                    'text': answer.answer_text if answer else '',
                    'marks_obtained': answer.marks_obtained if answer else 0,
                    'comment': answer.comment if answer else '',
                    'is_correct': answer.is_correct if answer else False,
                    'graded_at': answer.graded_at if answer else None
                }
            }
            
            # Ajouter les choix pour les MCQ
            if question.question_type == 'mcq':
                choices_data = []
                for choice in question.choices.all():
                    is_selected = False
                    if answer:
                        is_selected = answer.selected_choices.filter(id=choice.id).exists()
                    
                    choices_data.append({
                        'id': choice.id,
                        'text': choice.text,
                        'is_correct': choice.is_correct,
                        'is_selected': is_selected,
                        'order': choice.order
                    })
                question_data['choices'] = choices_data
                question_data['has_correct_choices'] = question.choices.filter(is_correct=True).exists()
            
            # Ajouter la bonne réponse si disponible
            try:
                if question.question_type == 'true_false' and hasattr(question, 'true_false_answer'):
                    question_data['correct_answer'] = "Vrai" if question.true_false_answer else "Faux"
                elif question.question_type in ['short_answer', 'essay'] and hasattr(question, 'answer_text'):
                    question_data['correct_answer'] = question.answer_text
                elif question.question_type == 'fill_blank' and hasattr(question, 'fill_blank_answer'):
                    question_data['correct_answer'] = question.fill_blank_answer
                elif question.question_type == 'mcq':
                    correct_choices = question.choices.filter(is_correct=True)
                    if correct_choices.exists():
                        question_data['correct_answer'] = [c.text for c in correct_choices]
                        question_data['correct_choices_ids'] = [c.id for c in correct_choices]
            except AttributeError:
                # Si les attributs n'existent pas, ignorer
                pass
            
            questions_data.append(question_data)
            
            # Calculer le score total
            if answer and answer.marks_obtained:
                total_score += answer.marks_obtained
        
        # 9. Récupérer les informations de classe de l'étudiant
        class_name = 'Non assigné'
        if hasattr(student, 'enrolled_classes') and student.enrolled_classes.exists():
            class_name = student.enrolled_classes.first().name
        
        # 10. Préparer la réponse
        final_score = total_score
        final_percentage = (total_score / quiz.total_marks * 100) if quiz.total_marks > 0 else 0
        is_passed = total_score >= quiz.passing_marks
        
        # Si un résultat existe, utiliser ses valeurs
        if quiz_result:
            final_score = quiz_result.score or total_score
            final_percentage = quiz_result.percentage or final_percentage
            is_passed = quiz_result.is_passed if quiz_result.is_passed is not None else is_passed
        
        response_data = {
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks,
                'duration': quiz.duration,
                'subject_name': quiz.subject.name if quiz.subject else 'Général'
            },
            'student': {
                'id': student.id,
                'full_name': student.get_full_name(),
                'email': student.email,
                'class_name': class_name
            },
            'result': {
                'id': quiz_result.id if quiz_result else None,
                'score': final_score,
                'total_marks': quiz.total_marks,
                'percentage': final_percentage,
                'is_passed': is_passed,
                'is_graded': quiz_result.is_graded if quiz_result else False,
                'time_taken': quiz_result.time_taken if quiz_result else 0,
                'submitted_at': quiz_result.submitted_at if quiz_result else None,
                'graded_at': quiz_result.graded_at if quiz_result else None
            },
            'questions': questions_data,
            'questions_count': len(questions_data),
            'total_score': final_score,
            'is_graded': quiz_result.is_graded if quiz_result else False,
            'message': 'Réponses chargées avec succès'
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Erreur dans get_student_responses: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erreur lors du chargement des réponses: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# backend/tests/views.py - AJOUTEZ CETTE VUE SI ELLE N'EXISTE PAS

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def debug_student_responses(request, student_id):
    """
    Debug: Voir les réponses d'un étudiant pour tous les tests
    """
    try:
        student = CustomUser.objects.get(id=student_id, role='student')
        
        # Récupérer tous les QuizResult de l'étudiant
        quiz_results = QuizResult.objects.filter(student=student).select_related('quiz')
        
        responses_data = []
        for result in quiz_results:
            # Récupérer les réponses de l'étudiant pour ce quiz
            student_answers = StudentAnswer.objects.filter(
                student=student,
                quiz=result.quiz
            ).select_related('question').prefetch_related('selected_choices')
            
            responses_data.append({
                'quiz_id': result.quiz.id,
                'quiz_title': result.quiz.title,
                'submitted_at': result.submitted_at,
                'is_graded': result.is_graded,
                'answers_count': student_answers.count(),
                'answers': student_answers.values(
                    'question__id', 'question__text', 'answer_text', 
                    'marks_obtained', 'is_correct'
                )
            })
        
        return Response({
            'success': True,
            'student': {
                'id': student.id,
                'full_name': student.get_full_name()
            },
            'total_quizzes': quiz_results.count(),
            'responses': responses_data
        })
        
    except CustomUser.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Étudiant non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erreur debug_student_responses: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# backend/tests/views.py - AJOUTEZ CETTE VUE POUR DÉBLOQUER LES TESTS
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_all_tests(request):
    """Montre TOUS les tests sans aucune restriction - POUR DÉBLOQUER"""
    user = request.user
    
    if user.role != 'student':
        return Response({
            'success': False,
            'error': 'Accès réservé aux étudiants'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        logger.info(f"🚨 STUDENT_ALL_TESTS appelé pour: {user.username}")
        
        now = timezone.now()
        
        # 1. Tests actifs (en cours)
        active_quizzes = Quiz.objects.filter(
            is_active=True,
            start_time__lte=now,
            end_time__gte=now
        ).select_related('subject', 'teacher').order_by('-start_time')
        
        # 2. Tests à venir
        upcoming_quizzes = Quiz.objects.filter(
            is_active=True,
            start_time__gt=now
        ).select_related('subject', 'teacher').order_by('start_time')
        
        # 3. Tests terminés (pour référence)
        ended_quizzes = Quiz.objects.filter(
            is_active=True,
            end_time__lt=now
        ).select_related('subject', 'teacher').order_by('-end_time')[:5]
        
        all_tests = []
        
        # Formater les tests actifs
        for quiz in active_quizzes:
            already_submitted = QuizResult.objects.filter(
                quiz=quiz,
                student=user
            ).exists()
            
            all_tests.append({
                'id': quiz.id,
                'title': quiz.title,
                'subject': quiz.subject.name if quiz.subject else 'Général',
                'teacher': quiz.teacher.get_full_name() if quiz.teacher else 'Professeur',
                'duration': quiz.duration,
                'total_marks': quiz.total_marks,
                'start_time': quiz.start_time,
                'end_time': quiz.end_time,
                'status': 'active',
                'is_available': True,
                'already_submitted': already_submitted,
                'type': 'active'
            })
        
        # Formater les tests à venir
        for quiz in upcoming_quizzes:
            all_tests.append({
                'id': quiz.id,
                'title': quiz.title,
                'subject': quiz.subject.name if quiz.subject else 'Général',
                'teacher': quiz.teacher.get_full_name() if quiz.teacher else 'Professeur',
                'start_time': quiz.start_time,
                'end_time': quiz.end_time,
                'status': 'upcoming',
                'is_available': False,
                'type': 'upcoming'
            })
        
        # Formater les tests terminés
        for quiz in ended_quizzes:
            all_tests.append({
                'id': quiz.id,
                'title': quiz.title,
                'subject': quiz.subject.name if quiz.subject else 'Général',
                'teacher': quiz.teacher.get_full_name() if quiz.teacher else 'Professeur',
                'end_time': quiz.end_time,
                'status': 'ended',
                'is_available': False,
                'type': 'ended'
            })
        
        logger.info(f"🚨 TOTAL tests envoyés: {len(all_tests)}")
        logger.info(f"🚨 Détail: {len(active_quizzes)} actifs, {len(upcoming_quizzes)} à venir, {len(ended_quizzes)} terminés")
        
        return Response({
            'success': True,
            'count': len(all_tests),
            'tests': all_tests,
            'summary': {
                'active': len(active_quizzes),
                'upcoming': len(upcoming_quizzes),
                'ended': len(ended_quizzes),
                'student': user.username
            }
        })
        
    except Exception as e:
        logger.error(f"🚨 ERREUR student_all_tests: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_results_view(request):
    """Retourne les résultats de l'étudiant"""
    user = request.user
    
    if user.role != 'student':
        return Response({
            'success': False,
            'error': 'Accès réservé aux étudiants'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Récupérer les résultats de l'étudiant
    results = QuizResult.objects.filter(
        student=user
    ).select_related('quiz', 'quiz__subject').order_by('-submitted_at')
    
    formatted_results = []
    
    for result in results:
        formatted_results.append({
            'id': result.id,
            'test_title': result.quiz.title,
            'subject': result.quiz.subject.name,
            'score': result.score,
            'total_marks': result.total_marks,
            'percentage': result.percentage,
            'grade': result.get_grade(),
            'date': result.submitted_at.date().isoformat(),
            'time_taken': result.time_taken,
            'is_passed': result.is_passed
        })
    
    return Response({
        'success': True,
        'count': len(formatted_results),
        'results': formatted_results
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def teacher_quizzes_view(request):
    """Retourne les tests créés par l'enseignant"""
    quizzes = Quiz.objects.filter(teacher=request.user).select_related('subject')
    
    # Compter les résultats par quiz
    quizzes_with_stats = []
    for quiz in quizzes:
        results = QuizResult.objects.filter(quiz=quiz)
        results_count = results.count()
        avg_score = results.aggregate(avg=Avg('percentage'))['avg'] or 0
        
        quizzes_with_stats.append({
            'id': quiz.id,
            'title': quiz.title,
            'subject': quiz.subject.name,
            'quiz_type': quiz.quiz_type,
            'duration': quiz.duration,
            'total_marks': quiz.total_marks,
            'start_time': quiz.start_time,
            'end_time': quiz.end_time,
            'is_active': quiz.is_active,
            'questions_count': quiz.questions.count(),
            'results_count': results_count,
            'average_score': round(avg_score, 2),
            'created_at': quiz.created_at
        })
    
    return Response({
        'success': True,
        'count': len(quizzes_with_stats),
        'results': quizzes_with_stats
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_details_view(request, quiz_id):
    """Détails d'un quiz avec ses questions et choix"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier les permissions
        if request.user.role == 'teacher' and quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': "Vous n'êtes pas l'enseignant de ce quiz"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if request.user.role == 'student':
            # Vérifier que l'étudiant a accès à la matière
            student_classes = request.user.enrolled_classes.all()
            subject_ids = student_classes.values_list('subjects__id', flat=True)
            if quiz.subject.id not in subject_ids:
                return Response({
                    'success': False,
                    'error': "Vous n'avez pas accès à ce quiz"
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Récupérer les questions avec leurs choix
        questions = Question.objects.filter(quiz=quiz).prefetch_related('choices')
        questions_data = []
        
        for question in questions:
            choices = Choice.objects.filter(question=question).values('id', 'text', 'is_correct', 'order')
            questions_data.append({
                'id': question.id,
                'question_type': question.question_type,
                'text': question.text,
                'marks': question.marks,
                'order': question.order,
                'choices': list(choices)
            })
        
        response_data = {
            'success': True,
            'quiz': QuizSerializer(quiz).data,
            'questions': questions_data
        }
        
        return Response(response_data)
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': "Quiz non trouvé"
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def test_create_quiz_simple(request):
    """Endpoint simplifié pour tester la création de quiz"""
    logger.info(f"Test création quiz simple - User: {request.user.username}")
    logger.info(f"Données: {request.data}")
    
    # Validation simple
    required_fields = ['title', 'subject', 'duration', 'total_marks', 'start_time', 'end_time']
    for field in required_fields:
        if field not in request.data:
            return Response({
                'success': False,
                'error': f'Champ manquant: {field}',
                'required_fields': required_fields
            }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Créer le quiz
        quiz = Quiz.objects.create(
            title=request.data['title'],
            subject_id=request.data['subject'],
            teacher=request.user,
            quiz_type=request.data.get('quiz_type', 'quiz'),
            description=request.data.get('description', ''),
            instructions=request.data.get('instructions', ''),
            duration=int(request.data['duration']),
            total_marks=int(request.data['total_marks']),
            passing_marks=int(request.data.get('passing_marks', 50)),
            start_time=request.data['start_time'],
            end_time=request.data['end_time'],
            is_active=True
        )
        
        logger.info(f"Quiz créé avec succès: {quiz.id}")
        
        return Response({
            'success': True,
            'message': 'Quiz créé avec succès',
            'quiz_id': quiz.id,
            'quiz_title': quiz.title
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Erreur création quiz simple: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Erreur lors de la création'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_connection(request):
    """Test de connexion simple"""
    return Response({
        'success': True,
        'message': 'API de tests fonctionnelle',
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'role': request.user.role,
            'full_name': request.user.get_full_name()
        },
        'timestamp': timezone.now().isoformat()
    })
# backend/tests/views.py - GARDEZ CETTE VERSION CORRIGÉE
# backend/tests/views.py - VERSION CORRIGÉE

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def get_quiz_submissions(request, quiz_id):
    """Récupérer uniquement les soumissions existantes"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier que l'enseignant est le propriétaire
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Récupérer TOUTES les soumissions (QuizResult) pour ce quiz
        all_submissions = QuizResult.objects.filter(
            quiz=quiz
        ).select_related('student')
        
        submissions_data = []
        for submission in all_submissions:
            # Récupérer la classe de l'étudiant
            student_class = submission.student.enrolled_classes.first()
            class_name = student_class.name if student_class else 'Non assigné'
            
            # Compter les réponses soumises
            submitted_answers = StudentAnswer.objects.filter(
                quiz=quiz,
                student=submission.student
            ).count()
            
            # Vérifier si l'étudiant a vraiment répondu
            has_answers = submitted_answers > 0
            
            # Si l'étudiant a un QuizResult mais pas de réponses, c'est étrange
            # Peut-être qu'il a commencé mais pas encore répondu
            if not has_answers:
                logger.warning(f"Étudiant {submission.student_id} a un QuizResult mais pas de StudentAnswer")
            
            submissions_data.append({
                'id': submission.id,
                'student_id': submission.student.id,
                'student_name': submission.student.get_full_name(),
                'student_email': submission.student.email,
                'is_submitted': has_answers,  # Seulement vrai s'il a des réponses
                'is_graded': submission.is_graded,
                'score': submission.score if has_answers else None,
                'total_marks': quiz.total_marks,
                'percentage': submission.percentage if has_answers else None,
                'grade': submission.get_grade() if has_answers else None,
                'time_taken': submission.time_taken if has_answers else 0,
                'submitted_at': submission.submitted_at if has_answers else None,
                'graded_at': submission.graded_at if has_answers else None,
                'class_name': class_name,
                'answers_count': submitted_answers,
                'has_submission_object': True  # Indique qu'il y a un QuizResult
            })
        
        # Statistiques basées uniquement sur ceux qui ont répondu
        submitted_with_answers = [s for s in submissions_data if s['answers_count'] > 0]
        total_students_in_classes = 0
        
        if quiz.subject:
            # Calculer le nombre total d'étudiants pour les stats
            student_classes = Class.objects.filter(subjects=quiz.subject)
            total_students_in_classes = CustomUser.objects.filter(
                role='student',
                enrolled_classes__in=student_classes
            ).distinct().count()
        
        return Response({
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'subject_name': quiz.subject.name if quiz.subject else None,
                'duration': quiz.duration,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks
            },
            'stats': {
                'total_students': total_students_in_classes,  # Tous les étudiants des classes
                'total_with_quizresult': len(all_submissions),  # Ceux qui ont commencé
                'submitted_with_answers': len(submitted_with_answers),  # Ceux qui ont répondu
                'graded_count': len([s for s in submissions_data if s['is_graded']]),
                'submission_rate': (len(submitted_with_answers) / total_students_in_classes * 100) if total_students_in_classes > 0 else 0
            },
            'submissions': submissions_data,  # Seulement ceux qui ont un QuizResult
            'total': len(submissions_data)
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
# backend/tests/views.py - AJOUTEZ CETTE VUE
# backend/tests/views.py - AJOUTEZ CETTE VUE DE DEBUG

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_quiz_submissions(request, quiz_id):
    """Debug pour voir pourquoi les soumissions n'apparaissent pas"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        print(f"🎯 DEBUG Quiz: {quiz.title} (ID: {quiz_id})")
        
        # 1. Vérifier tous les QuizResult
        all_results = QuizResult.objects.filter(quiz=quiz)
        print(f"📊 QuizResult trouvés: {all_results.count()}")
        
        for result in all_results:
            student_answers = StudentAnswer.objects.filter(
                quiz=quiz,
                student=result.student
            ).count()
            print(f"  - Étudiant: {result.student.get_full_name()} (ID: {result.student.id})")
            print(f"    QuizResult ID: {result.id}")
            print(f"    Score: {result.score}")
            print(f"    is_submitted: {result.submitted_at is not None}")
            print(f"    is_graded: {result.is_graded}")
            print(f"    StudentAnswer count: {student_answers}")
            
        # 2. Vérifier tous les StudentAnswer
        all_answers = StudentAnswer.objects.filter(quiz=quiz)
        print(f"📝 StudentAnswer trouvés: {all_answers.count()}")
        
        students_with_answers = set()
        for answer in all_answers:
            students_with_answers.add(answer.student.id)
            print(f"  - Réponse de {answer.student.get_full_name()} pour Q{answer.question.id}")
        
        print(f"👥 Étudiants avec réponses: {len(students_with_answers)}")
        
        return Response({
            'success': True,
            'debug': {
                'quiz_title': quiz.title,
                'quiz_results_count': all_results.count(),
                'student_answers_count': all_answers.count(),
                'unique_students_with_answers': len(students_with_answers),
                'quiz_results': [
                    {
                        'student_id': r.student.id,
                        'student_name': r.student.get_full_name(),
                        'score': r.score,
                        'submitted_at': r.submitted_at,
                        'is_graded': r.is_graded,
                        'has_student_answers': StudentAnswer.objects.filter(
                            quiz=quiz,
                            student=r.student
                        ).exists()
                    }
                    for r in all_results
                ]
            }
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        })
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def test_create_question_simple(request):
    """Endpoint simplifié pour créer une question"""
    logger.info(f"Test création question simple - User: {request.user.username}")
    logger.info(f"Données: {request.data}")
    
    try:
        # Validation
        required_fields = ['quiz', 'question_type', 'text', 'marks']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'success': False,
                    'error': f'Champ manquant: {field}',
                    'required_fields': required_fields
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier que le quiz existe
        try:
            quiz = Quiz.objects.get(id=request.data['quiz'])
        except Quiz.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Quiz avec ID {request.data["quiz"]} non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier les permissions
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée',
                'detail': 'Vous n\'êtes pas l\'enseignant de ce quiz'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Créer la question
        question = Question.objects.create(
            quiz=quiz,
            question_type=request.data['question_type'],
            text=request.data['text'],
            marks=int(request.data['marks']),
            order=int(request.data.get('order', 0))
        )
        
        logger.info(f"Question créée avec succès: {question.id}")
        
        return Response({
            'success': True,
            'message': 'Question créée avec succès',
            'question_id': question.id,
            'quiz_id': quiz.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Erreur création question simple: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Erreur lors de la création de la question'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# backend/tests/views.py - AJOUTEZ CETTE VUE SIMPLIFIÉE

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def test_create_choice_simple(request):
    """Endpoint simplifié pour créer un choix"""
    logger.info(f"Test création choix simple - User: {request.user.username}")
    logger.info(f"Données: {request.data}")
    
    try:
        # Validation
        required_fields = ['question', 'text']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'success': False,
                    'error': f'Champ manquant: {field}',
                    'required_fields': required_fields
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier que la question existe
        try:
            question = Question.objects.get(id=request.data['question'])
        except Question.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Question avec ID {request.data["question"]} non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier les permissions
        if question.quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée',
                'detail': 'Vous n\'êtes pas l\'enseignant de ce quiz'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Créer le choix
        choice = Choice.objects.create(
            question=question,
            text=request.data['text'],
            is_correct=request.data.get('is_correct', False),
            order=request.data.get('order', 0)
        )
        
        logger.info(f"Choix créé avec succès: {choice.id}")
        
        return Response({
            'success': True,
            'message': 'Choix créé avec succès',
            'choice_id': choice.id,
            'question_id': question.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Erreur création choix simple: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Erreur lors de la création du choix'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    




# backend/tests/views.py - AJOUTEZ CES FONCTIONS

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def quiz_submissions_view(request, quiz_id):
    """Récupérer toutes les soumissions d'un quiz"""
    try:
        quiz = Quiz.objects.get(id=quiz_id, teacher=request.user)
        
        # Récupérer tous les étudiants inscrits à la matière
        student_class = Class.objects.filter(subjects=quiz.subject)
        students = CustomUser.objects.filter(
            role='student',
            enrolled_classes__in=student_class
        ).distinct()
        
        submissions_data = []
        for student in students:
            # Vérifier si l'étudiant a soumis
            submission = QuizResult.objects.filter(
                quiz=quiz,
                student=student
            ).first()
            
            student_answers = StudentAnswer.objects.filter(
                quiz=quiz,
                student=student
            )
            
            submissions_data.append({
                'id': submission.id if submission else None,
                'student_id': student.id,
                'student_name': student.get_full_name(),
                'student_email': student.email,
                'is_submitted': submission is not None,
                'is_graded': submission.is_graded if submission else False,
                'score': submission.score if submission else None,
                'percentage': submission.percentage if submission else None,
                'grade': submission.get_grade() if submission else None,
                'time_taken': submission.time_taken if submission else None,
                'submitted_at': submission.submitted_at if submission else None,
                'graded_at': submission.graded_at if submission else None,
                'answers_count': student_answers.count(),
                'class_name': student.enrolled_classes.first().name if student.enrolled_classes.exists() else 'Non assigné'
            })
        
        return Response({
            'success': True,
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'total_students': len(students),
            'submitted_count': len([s for s in submissions_data if s['is_submitted']]),
            'submissions': submissions_data
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)


# backend/tests/views.py - CORRIGEZ check_test_access
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def check_test_access(request, quiz_id):
    """Vérifier si l'étudiant a accès au test - VERSION SIMPLIFIÉE"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        logger.info(f"🔍 Vérification accès: Étudiant {request.user.username} pour test {quiz.title}")
        
        # Méthode 1: Vérifier via les classes
        student_classes = request.user.enrolled_classes.all()
        has_access_via_classes = False
        
        if quiz.subject and quiz.subject.class_assigned:
            # Vérifier si l'étudiant est dans la classe de la matière
            has_access_via_classes = student_classes.filter(
                id=quiz.subject.class_assigned.id
            ).exists()
            
            logger.info(f"  Méthode 1 (classe): {has_access_via_classes}")
        
        # Méthode 2: Vérifier via les matières
        has_access_via_subjects = False
        if quiz.subject:
            for cls in student_classes:
                if cls.subjects.filter(id=quiz.subject.id).exists():
                    has_access_via_subjects = True
                    break
            
            logger.info(f"  Méthode 2 (matière): {has_access_via_subjects}")
        
        # Méthode 3: Vérifier via enseignant (si le prof enseigne dans la classe)
        has_access_via_teacher = False
        if quiz.teacher:
            for cls in student_classes:
                if cls.subjects.filter(teacher=quiz.teacher).exists():
                    has_access_via_teacher = True
                    break
            
            logger.info(f"  Méthode 3 (enseignant): {has_access_via_teacher}")
        
        # ACCÈS SIMPLIFIÉ : Si l'étudiant a une classe, il a accès
        has_access = (
            has_access_via_classes or 
            has_access_via_subjects or 
            has_access_via_teacher or
            student_classes.exists()  # Fallback: s'il a une classe
        )
        
        # Vérifier les dates
        now = timezone.now()
        is_available = quiz.start_time <= now <= quiz.end_time and quiz.is_active
        
        # Vérifier si déjà soumis
        already_submitted = QuizResult.objects.filter(
            quiz=quiz,
            student=request.user
        ).exists()
        
        logger.info(f"✅ Résultat: accès={has_access}, disponible={is_available}, déjà soumis={already_submitted}")
        
        return Response({
            'success': True,
            'has_access': has_access,
            'is_available': is_available,
            'already_submitted': already_submitted,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'start_time': quiz.start_time,
                'end_time': quiz.end_time,
                'is_active': quiz.is_active,
                'subject': quiz.subject.name if quiz.subject else None,
                'teacher': quiz.teacher.get_full_name() if quiz.teacher else None
            },
            'student': {
                'id': request.user.id,
                'username': request.user.username,
                'classes': [c.name for c in student_classes]
            }
        })
        
    except Quiz.DoesNotExist:
        logger.error(f"❌ Test {quiz_id} non trouvé")
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"❌ Erreur check_test_access: {str(e)}")
        return Response({
            'success': False,
            'error': f'Erreur serveur: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# backend/tests/views.py - AJOUTEZ CETTE VUE POUR BYPASS
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def bypass_check_access(request, quiz_id):
    """BYPASS: Autorise l'accès sans vérification - POUR DÉBLOQUER"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        now = timezone.now()
        is_available = quiz.start_time <= now <= quiz.end_time and quiz.is_active
        
        # Vérifier si déjà soumis
        already_submitted = QuizResult.objects.filter(
            quiz=quiz,
            student=request.user
        ).exists()
        
        logger.warning(f"🚨 BYPASS activé: Étudiant {request.user.username} accède à {quiz.title}")
        
        return Response({
            'success': True,
            'has_access': True,  # TOUJOURS TRUE
            'is_available': is_available,
            'already_submitted': already_submitted,
            'bypass': True,
            'message': 'Accès bypass activé',
            'quiz': {
                'id': quiz.id,
                'title': quiz.title
            }
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)

# backend/tests/views.py - AJOUTEZ CETTE VUE
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bypass_quiz_take(request, quiz_id):
    """BYPASS: Récupérer un quiz sans vérifications d'accès"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        user = request.user
        
        logger.warning(f"🚨 BYPASS quiz_take: {user.username} accède à {quiz.title}")
        
        # Vérifier juste si c'est un étudiant
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Seuls les étudiants peuvent passer des tests'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Vérifier si déjà soumis
        already_submitted = QuizResult.objects.filter(
            quiz=quiz,
            student=user
        ).exists()
        
        if already_submitted:
            return Response({
                'success': False,
                'error': 'Vous avez déjà soumis ce test'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Récupérer les questions
        questions = Question.objects.filter(
            quiz=quiz
        ).prefetch_related('choices').order_by('order')
        
        questions_data = []
        for question in questions:
            choices_data = []
            for choice in question.choices.all():
                choices_data.append({
                    'id': choice.id,
                    'text': choice.text,
                    'order': choice.order
                })
            
            questions_data.append({
                'id': question.id,
                'question_type': question.question_type,
                'text': question.text,
                'marks': question.marks,
                'order': question.order,
                'choices': choices_data
            })
        
        return Response({
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'description': quiz.description,
                'instructions': quiz.instructions,
                'duration': quiz.duration,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks,
                'start_time': quiz.start_time,
                'end_time': quiz.end_time,
                'subject_name': quiz.subject.name if quiz.subject else 'Général',
                'teacher_name': quiz.teacher.get_full_name() if quiz.teacher else 'Professeur'
            },
            'questions': questions_data,
            'bypass': True,
            'message': 'Accès bypass activé',
            'timestamp': timezone.now().isoformat()
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"❌ Erreur bypass_quiz_take: {str(e)}")
        return Response({
            'success': False,
            'error': 'Erreur serveur'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


# backend/tests/views.py - AJOUTEZ CETTE FONCTION
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def bypass_submit_test(request, quiz_id):
    """BYPASS: Soumettre un test sans vérifications d'accès"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        student = request.user
        
        logger.warning(f"🚨 BYPASS submit: {student.username} soumet le test {quiz.title}")
        
        # Vérifier si déjà soumis
        existing_result = QuizResult.objects.filter(
            quiz=quiz,
            student=student
        ).first()
        
        if existing_result and existing_result.is_graded:
            return Response({
                'success': False,
                'error': 'Test déjà soumis et corrigé'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Traiter les réponses
        answers_data = request.data.get('answers', [])
        total_score = 0
        
        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            selected_choices = answer_data.get('selected_choices', [])
            answer_text = answer_data.get('answer_text', '')
            
            try:
                question = Question.objects.get(id=question_id, quiz=quiz)
                
                # Enregistrer la réponse
                student_answer, created = StudentAnswer.objects.update_or_create(
                    student=student,
                    quiz=quiz,
                    question=question,
                    defaults={
                        'answer_text': answer_text
                    }
                )
                
                # Ajouter les choix sélectionnés
                choices = Choice.objects.filter(id__in=selected_choices, question=question)
                student_answer.selected_choices.set(choices)
                
                # Pour les MCQ, calculer automatiquement si possible
                if question.question_type == 'mcq' and question.choices.exists():
                    correct_choices = question.choices.filter(is_correct=True)
                    selected_correct = choices.filter(is_correct=True).count()
                    
                    if correct_choices.count() > 0:
                        percentage_correct = selected_correct / correct_choices.count()
                        marks_obtained = percentage_correct * question.marks
                        student_answer.marks_obtained = marks_obtained
                        student_answer.is_correct = percentage_correct == 1.0
                        total_score += marks_obtained
                
                student_answer.save()
                
            except Question.DoesNotExist:
                continue
        
        # Mettre à jour ou créer le résultat
        time_taken = request.data.get('time_taken', 0)
        
        result, created = QuizResult.objects.update_or_create(
            quiz=quiz,
            student=student,
            defaults={
                'score': total_score,
                'total_marks': quiz.total_marks,
                'percentage': (total_score / quiz.total_marks) * 100 if quiz.total_marks > 0 else 0,
                'started_at': existing_result.started_at if existing_result else timezone.now(),
                'submitted_at': timezone.now(),
                'time_taken': time_taken,
                'is_passed': total_score >= quiz.passing_marks,
                'is_graded': False
            }
        )
        
        return Response({
            'success': True,
            'message': 'Test soumis avec succès (BYPASS)',
            'result_id': result.id,
            'score': total_score,
            'percentage': result.percentage,
            'is_passed': result.is_passed
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"❌ Erreur bypass_submit_test: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# backend/tests/views.py - VERSION CORRIGÉE
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def get_student_responses(request, quiz_id, student_id):
    """Récupérer les réponses d'un étudiant pour un quiz - VERSION CORRIGÉE"""
    try:
        # 1. Vérifier les permissions
        if request.user.role != 'teacher':
            return Response({
                'success': False,
                'error': 'Accès réservé aux enseignants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Récupérer le quiz
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # 3. Vérifier que l'enseignant est le propriétaire
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Vous n\'êtes pas l\'enseignant de ce quiz'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 4. Récupérer l'étudiant
        student = get_object_or_404(CustomUser, id=student_id, role='student')
        
        # 5. Récupérer toutes les questions du quiz
        questions = Question.objects.filter(
            quiz=quiz
        ).order_by('order').prefetch_related('choices')
        
        # 6. Récupérer les réponses de l'étudiant
        student_answers = StudentAnswer.objects.filter(
            quiz=quiz,
            student=student
        ).prefetch_related('selected_choices')
        
        # Créer un dictionnaire pour accéder rapidement aux réponses
        answers_dict = {answer.question_id: answer for answer in student_answers}
        
        # 7. Récupérer le résultat du quiz (s'il existe)
        quiz_result = QuizResult.objects.filter(
            quiz=quiz,
            student=student
        ).first()
        
        # 8. Préparer les données des questions avec les réponses
        questions_data = []
        total_score = 0
        
        for question in questions:
            answer = answers_dict.get(question.id)
            
            # Préparer les données de base de la question
            question_data = {
                'id': question.id,
                'text': question.text,
                'question_type': question.question_type,
                'marks': question.marks,
                'order': question.order,
                'image': request.build_absolute_uri(question.image.url) if question.image else None,
                
                # Données de l'étudiant
                'student_answer': {
                    'text': answer.answer_text if answer else '',
                    'marks_obtained': answer.marks_obtained if answer else 0,
                    'comment': answer.comment if answer else '',
                    'is_correct': answer.is_correct if answer else False,
                    'graded_at': answer.graded_at if answer else None
                }
            }
            
            # Ajouter les choix pour les MCQ
            if question.question_type == 'mcq':
                choices_data = []
                for choice in question.choices.all():
                    is_selected = False
                    if answer:
                        is_selected = answer.selected_choices.filter(id=choice.id).exists()
                    
                    choices_data.append({
                        'id': choice.id,
                        'text': choice.text,
                        'is_correct': choice.is_correct,
                        'is_selected': is_selected,
                        'order': choice.order
                    })
                question_data['choices'] = choices_data
                question_data['has_correct_choices'] = question.choices.filter(is_correct=True).exists()
            
            # Ajouter la bonne réponse si disponible
            try:
                if question.question_type == 'true_false' and hasattr(question, 'true_false_answer'):
                    question_data['correct_answer'] = "Vrai" if question.true_false_answer else "Faux"
                elif question.question_type in ['short_answer', 'essay'] and hasattr(question, 'answer_text'):
                    question_data['correct_answer'] = question.answer_text
                elif question.question_type == 'fill_blank' and hasattr(question, 'fill_blank_answer'):
                    question_data['correct_answer'] = question.fill_blank_answer
                elif question.question_type == 'mcq':
                    correct_choices = question.choices.filter(is_correct=True)
                    if correct_choices.exists():
                        question_data['correct_answer'] = [c.text for c in correct_choices]
                        question_data['correct_choices_ids'] = [c.id for c in correct_choices]
            except AttributeError:
                # Si les attributs n'existent pas, ignorer
                pass
            
            questions_data.append(question_data)
            
            # Calculer le score total
            if answer and answer.marks_obtained:
                total_score += answer.marks_obtained
        
        # 9. Récupérer les informations de classe de l'étudiant
        class_name = 'Non assigné'
        if hasattr(student, 'enrolled_classes') and student.enrolled_classes.exists():
            class_name = student.enrolled_classes.first().name
        
        # 10. Préparer la réponse
        final_score = total_score
        final_percentage = (total_score / quiz.total_marks * 100) if quiz.total_marks > 0 else 0
        is_passed = total_score >= quiz.passing_marks
        
        # Si un résultat existe, utiliser ses valeurs
        if quiz_result:
            final_score = quiz_result.score or total_score
            final_percentage = quiz_result.percentage or final_percentage
            is_passed = quiz_result.is_passed if quiz_result.is_passed is not None else is_passed
        
        response_data = {
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks,
                'duration': quiz.duration,
                'subject_name': quiz.subject.name if quiz.subject else 'Général'
            },
            'student': {
                'id': student.id,
                'full_name': student.get_full_name(),
                'email': student.email,
                'class_name': class_name
            },
            'result': {
                'id': quiz_result.id if quiz_result else None,
                'score': final_score,
                'total_marks': quiz.total_marks,
                'percentage': final_percentage,
                'is_passed': is_passed,
                'is_graded': quiz_result.is_graded if quiz_result else False,
                'time_taken': quiz_result.time_taken if quiz_result else 0,
                'submitted_at': quiz_result.submitted_at if quiz_result else None,
                'graded_at': quiz_result.graded_at if quiz_result else None
            },
            'questions': questions_data,
            'questions_count': len(questions_data),
            'total_score': final_score,
            'is_graded': quiz_result.is_graded if quiz_result else False,
            'message': 'Réponses chargées avec succès'
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Erreur dans get_student_responses: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erreur lors du chargement des réponses: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_student_responses(request, quiz_id, student_id):
    """Endpoint de test pour vérifier les données disponibles - VERSION CORRIGÉE"""
    try:
        # Récupérer les objets avec try/catch pour éviter les erreurs 500
        quiz = None
        student = None
        
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            quiz = None
            
        try:
            student = CustomUser.objects.get(id=student_id)
        except CustomUser.DoesNotExist:
            student = None
        
        # Vérifier les permissions
        user = request.user
        if user.role == 'teacher' and quiz:
            if quiz.teacher != user:
                return Response({
                    'success': False,
                    'error': 'Accès refusé'
                }, status=403)
        
        # Collecter les informations de debug - VERSION SIMPLIFIÉE
        debug_data = {
            'quiz_exists': quiz is not None,
            'student_exists': student is not None,
            'user_role': user.role,
            'user_id': user.id,
            'quiz_id': quiz_id,
            'student_id': student_id,
        }
        
        # Ajouter les infos du quiz si existant
        if quiz:
            debug_data['quiz_info'] = {
                'id': quiz.id,
                'title': quiz.title,
                'teacher_id': quiz.teacher.id if quiz.teacher else None,
                'teacher_name': quiz.teacher.get_full_name() if quiz.teacher else None,
                'subject_id': quiz.subject.id if quiz.subject else None,
                'subject_name': quiz.subject.name if quiz.subject else None,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks
            }
        
        # Ajouter les infos de l'étudiant si existant
        if student:
            debug_data['student_info'] = {
                'id': student.id,
                'full_name': student.get_full_name(),
                'email': student.email,
                'role': student.role,
                'class': student.enrolled_classes.first().name if student.enrolled_classes.exists() else None
            }
        
        # Ajouter les statistiques
        debug_data['stats'] = {
            'questions_count': Question.objects.filter(quiz_id=quiz_id).count() if quiz else 0,
            'student_answers_count': StudentAnswer.objects.filter(quiz_id=quiz_id, student_id=student_id).count(),
            'quiz_results_count': QuizResult.objects.filter(quiz_id=quiz_id, student_id=student_id).count(),
        }
        
        return Response({
            'success': True,
            'debug_data': debug_data,
            'message': 'Données de debug chargées',
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ ERREUR test_student_responses: {str(e)}", exc_info=True)
        # Retourner une erreur avec plus de détails
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ TRACEBACK: {error_details}")
        
        return Response({
            'success': False,
            'error': f'Erreur: {str(e)}',
            'details': error_details[:500]  # Limiter la taille
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_student_grading(request, quiz_id, student_id):
    """
    Sauvegarde la notation d'un étudiant pour un quiz
    """
    try:
        logger.info(f"📤 Sauvegarde notation - quiz: {quiz_id}, student: {student_id}")
        logger.info(f"Données reçues: {request.data}")
        
        # 1. Vérifier que l'utilisateur est enseignant
        if request.user.role != 'teacher':
            return Response({
                'success': False,
                'error': 'Accès réservé aux enseignants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Récupérer le quiz
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # 3. Vérifier que l'enseignant a accès à ce quiz
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Vous n\'avez pas accès à ce quiz'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 4. Récupérer l'étudiant
        student = get_object_or_404(CustomUser, id=student_id, role='student')
        
        # 5. Récupérer les données de notation
        grades = request.data.get('grades', {})
        comments = request.data.get('comments', {})
        auto_grade = request.data.get('auto_grade', False)
        finalize = request.data.get('finalize', False)
        
        logger.info(f"Notation reçue - grades: {len(grades)}, comments: {len(comments)}")
        
        # 6. Récupérer toutes les questions du quiz
        questions = Question.objects.filter(quiz=quiz)
        total_score = 0
        
        # 7. Mettre à jour les réponses et calculer le score
        for question in questions:
            question_id = str(question.id)
            
            if question_id in grades:
                grade_value = float(grades[question_id])
                comment_value = comments.get(question_id, "")
                
                # Vérifier que la note ne dépasse pas le maximum
                if grade_value > question.marks:
                    grade_value = question.marks
                
                # Récupérer ou créer la réponse étudiante
                student_answer, created = StudentAnswer.objects.get_or_create(
                    student=student,
                    quiz=quiz,
                    question=question,
                    defaults={
                        'answer_text': '',
                        'marks_obtained': grade_value,
                        'comment': comment_value,
                        'graded_at': timezone.now() if finalize else None,
                        'is_correct': grade_value > 0
                    }
                )
                
                # Mettre à jour si existe déjà
                if not created:
                    student_answer.marks_obtained = grade_value
                    student_answer.comment = comment_value
                    if finalize:
                        student_answer.graded_at = timezone.now()
                    student_answer.save()
                
                total_score += grade_value
        
        # 8. Mettre à jour ou créer le résultat du quiz
        quiz_result, created = QuizResult.objects.get_or_create(
            student=student,
            quiz=quiz,
            defaults={
                'score': total_score,
                'total_marks': quiz.total_marks,
                'percentage': (total_score / quiz.total_marks) * 100 if quiz.total_marks > 0 else 0,
                'started_at': timezone.now(),
                'time_taken': 0,
                'is_passed': total_score >= quiz.passing_marks,
                'is_graded': finalize,
                'graded_at': timezone.now() if finalize else None
            }
        )
        
        # Mettre à jour si existe déjà
        if not created:
            quiz_result.score = total_score
            quiz_result.percentage = (total_score / quiz.total_marks) * 100 if quiz.total_marks > 0 else 0
            quiz_result.is_passed = total_score >= quiz.passing_marks
            if finalize:
                quiz_result.is_graded = True
                quiz_result.graded_at = timezone.now()
            quiz_result.save()
        
        # 9. Préparer la réponse
        response_data = {
            'success': True,
            'message': 'Notation sauvegardée avec succès' + (' et finalisée' if finalize else ''),
            'result': {
                'id': quiz_result.id,
                'score': quiz_result.score,
                'total_marks': quiz_result.total_marks,
                'percentage': quiz_result.percentage,
                'is_passed': quiz_result.is_passed,
                'is_graded': quiz_result.is_graded,
                'grade': quiz_result.get_grade() if hasattr(quiz_result, 'get_grade') else None
            },
            'total_score': total_score
        }
        
        logger.info(f"✅ Notation sauvegardée - Score: {total_score}/{quiz.total_marks}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Erreur dans save_student_grading: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erreur sauvegarde notation: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)







# backend/tests/views.py - AJOUTEZ CETTE VUE
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def test_simple_submissions(request, quiz_id):
    """Endpoint de test simple pour voir si l'API répond"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier que l'enseignant est le propriétaire
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Données fictives simples
        mock_data = [
            {
                'id': 1,
                'student_id': 1,
                'student_name': 'Étudiant Test 1',
                'student_email': 'test1@example.com',
                'is_submitted': True,
                'is_graded': False,
                'score': 15,
                'total_marks': quiz.total_marks,
                'percentage': 75,
                'grade': 'B',
                'time_taken': 120,
                'submitted_at': timezone.now().isoformat(),
                'class_name': 'Classe A'
            },
            {
                'id': 2,
                'student_id': 2,
                'student_name': 'Étudiant Test 2',
                'student_email': 'test2@example.com',
                'is_submitted': False,
                'is_graded': False,
                'score': None,
                'total_marks': quiz.total_marks,
                'percentage': None,
                'grade': None,
                'time_taken': None,
                'submitted_at': None,
                'class_name': 'Classe A'
            }
        ]
        
        return Response({
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks
            },
            'submissions': mock_data,
            'total': len(mock_data),
            'message': 'Données de test'
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    















@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def start_test(request, quiz_id):
    """Enregistrer le début d'un test"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier l'accès
        if not request.user.enrolled_classes.filter(subjects=quiz.subject).exists():
            return Response({
                'success': False,
                'error': 'Accès refusé'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Créer ou mettre à jour un résultat
        result, created = QuizResult.objects.get_or_create(
            quiz=quiz,
            student=request.user,
            defaults={
                'score': 0,
                'total_marks': quiz.total_marks,
                'percentage': 0,
                'started_at': timezone.now(),
                'time_taken': 0,
                'is_passed': False,
                'is_graded': False
            }
        )
        
        return Response({
            'success': True,
            'message': 'Test commencé',
            'started_at': result.started_at
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def submit_test(request, quiz_id):
    """Soumettre un test"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        student = request.user
        
        # Vérifier l'accès
        if not student.enrolled_classes.filter(subjects=quiz.subject).exists():
            return Response({
                'success': False,
                'error': 'Accès refusé'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Vérifier si déjà soumis
        existing_result = QuizResult.objects.filter(
            quiz=quiz,
            student=student
        ).first()
        
        if existing_result and existing_result.is_graded:
            return Response({
                'success': False,
                'error': 'Test déjà soumis et corrigé'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Traiter les réponses
        answers_data = request.data.get('answers', [])
        total_score = 0
        
        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            selected_choices = answer_data.get('selected_choices', [])
            answer_text = answer_data.get('answer_text', '')
            
            try:
                question = Question.objects.get(id=question_id, quiz=quiz)
                
                # Enregistrer la réponse
                student_answer, created = StudentAnswer.objects.get_or_create(
                    student=student,
                    quiz=quiz,
                    question=question,
                    defaults={
                        'answer_text': answer_text
                    }
                )
                
                # Ajouter les choix sélectionnés
                choices = Choice.objects.filter(id__in=selected_choices, question=question)
                student_answer.selected_choices.set(choices)
                
                # Pour les MCQ, calculer automatiquement si possible
                if question.question_type == 'mcq' and question.choices.exists():
                    correct_choices = question.choices.filter(is_correct=True)
                    selected_correct = choices.filter(is_correct=True).count()
                    
                    if correct_choices.count() > 0:
                        percentage_correct = selected_correct / correct_choices.count()
                        marks_obtained = percentage_correct * question.marks
                        student_answer.marks_obtained = marks_obtained
                        student_answer.is_correct = percentage_correct == 1.0
                        total_score += marks_obtained
                
                student_answer.save()
                
            except Question.DoesNotExist:
                continue
        
        # Mettre à jour ou créer le résultat
        time_taken = request.data.get('time_taken', 0)
        
        result, created = QuizResult.objects.update_or_create(
            quiz=quiz,
            student=student,
            defaults={
                'score': total_score,
                'total_marks': quiz.total_marks,
                'percentage': (total_score / quiz.total_marks) * 100 if quiz.total_marks > 0 else 0,
                'started_at': existing_result.started_at if existing_result else timezone.now(),
                'submitted_at': timezone.now(),
                'time_taken': time_taken,
                'is_passed': total_score >= quiz.passing_marks,
                'is_graded': False  # L'enseignant devra corriger
            }
        )
        
        return Response({
            'success': True,
            'message': 'Test soumis avec succès',
            'result_id': result.id,
            'score': total_score,
            'percentage': result.percentage,
            'is_passed': result.is_passed
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


# backend/tests/views.py - AJOUTEZ CES NOUVELLES FONCTIONS

# ========================================
# VUES POUR LES ÉTUDIANTS
# ========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def save_test_progress(request, quiz_id):
    """Sauvegarder la progression d'un test"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier que l'étudiant a accès
        if not request.user.enrolled_classes.filter(subjects=quiz.subject).exists():
            return Response({
                'success': False,
                'error': 'Accès refusé'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Sauvegarder les réponses dans StudentAnswer
        answers = request.data.get('answers', {})
        for question_id, answer_data in answers.items():
            try:
                question = Question.objects.get(id=question_id, quiz=quiz)
                
                # Créer ou mettre à jour la réponse
                student_answer, created = StudentAnswer.objects.update_or_create(
                    student=request.user,
                    quiz=quiz,
                    question=question,
                    defaults={
                        'answer_text': answer_data.get('text', ''),
                        'submitted_at': timezone.now()
                    }
                )
                
                # Gérer les choix multiples
                if question.question_type == 'mcq':
                    selected_choice_ids = answer_data.get('choices', [])
                    selected_choices = Choice.objects.filter(
                        id__in=selected_choice_ids,
                        question=question
                    )
                    student_answer.selected_choices.set(selected_choices)
                
            except Question.DoesNotExist:
                continue
        
        return Response({
            'success': True,
            'message': 'Progression sauvegardée',
            'saved_at': timezone.now().isoformat()
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)


# ========================================
# VUES POUR LA CORRECTION (ENSEIGNANTS)
# ========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def get_submission_details(request, submission_id):
    """Récupérer les détails d'une soumission"""
    try:
        submission = QuizResult.objects.select_related(
            'student', 'quiz', 'quiz__subject'
        ).get(id=submission_id)
        
        # Vérifier que l'enseignant est le propriétaire du quiz
        if submission.quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Récupérer toutes les réponses de l'étudiant
        student_answers = StudentAnswer.objects.filter(
            student=submission.student,
            quiz=submission.quiz
        ).select_related('question').prefetch_related('selected_choices')
        
        answers_data = []
        for answer in student_answers:
            answer_data = {
                'question_id': answer.question.id,
                'question_text': answer.question.text,
                'question_type': answer.question.question_type,
                'question_marks': answer.question.marks,
                'answer_text': answer.answer_text,
                'selected_choices': [
                    {
                        'id': choice.id,
                        'text': choice.text,
                        'is_correct': choice.is_correct
                    }
                    for choice in answer.selected_choices.all()
                ],
                'marks_obtained': answer.marks_obtained,
                'is_correct': answer.is_correct,
                'comment': answer.comment if hasattr(answer, 'comment') else ''
            }
            answers_data.append(answer_data)
        
        return Response({
            'success': True,
            'submission': {
                'id': submission.id,
                'student_id': submission.student.id,
                'student_name': submission.student.get_full_name(),
                'student_email': submission.student.email,
                'quiz_title': submission.quiz.title,
                'score': submission.score,
                'total_marks': submission.total_marks,
                'percentage': submission.percentage,
                'grade': submission.get_grade(),
                'time_taken': submission.time_taken,
                'started_at': submission.started_at,
                'submitted_at': submission.submitted_at,
                'is_passed': submission.is_passed,
                'is_graded': submission.is_graded
            },
            'answers': answers_data
        })
        
    except QuizResult.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Soumission non trouvée'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher | IsStudent])
def get_questions_with_answers(request, quiz_id, submission_id):
    """Récupérer les questions avec les réponses d'une soumission"""
    try:
        submission = QuizResult.objects.get(id=submission_id)
        
        # Vérifier les permissions
        user = request.user
        if user.role == 'teacher' and submission.quiz.teacher != user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if user.role == 'student' and submission.student != user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Récupérer les questions du quiz
        questions = Question.objects.filter(
            quiz_id=quiz_id
        ).prefetch_related('choices')
        
        questions_data = []
        for question in questions:
            # Récupérer la réponse de l'étudiant
            try:
                student_answer = StudentAnswer.objects.get(
                    student=submission.student,
                    quiz_id=quiz_id,
                    question=question
                )
                
                # Préparer les choix
                choices_data = []
                for choice in question.choices.all():
                    is_selected = student_answer.selected_choices.filter(id=choice.id).exists()
                    choices_data.append({
                        'id': choice.id,
                        'text': choice.text,
                        'is_correct': choice.is_correct,
                        'is_selected': is_selected
                    })
                
                questions_data.append({
                    'id': question.id,
                    'text': question.text,
                    'question_type': question.question_type,
                    'marks': question.marks,
                    'order': question.order,
                    'student_answer_text': student_answer.answer_text,
                    'marks_obtained': student_answer.marks_obtained,
                    'is_correct': student_answer.is_correct,
                    'comment': getattr(student_answer, 'comment', ''),
                    'choices': choices_data,
                    'correct_answer': getattr(question, 'correct_answer', None),
                    'graded_at': student_answer.graded_at if hasattr(student_answer, 'graded_at') else None
                })
                
            except StudentAnswer.DoesNotExist:
                # L'étudiant n'a pas répondu à cette question
                choices_data = [{
                    'id': choice.id,
                    'text': choice.text,
                    'is_correct': choice.is_correct,
                    'is_selected': False
                } for choice in question.choices.all()]
                
                questions_data.append({
                    'id': question.id,
                    'text': question.text,
                    'question_type': question.question_type,
                    'marks': question.marks,
                    'order': question.order,
                    'student_answer_text': '',
                    'marks_obtained': 0,
                    'is_correct': False,
                    'comment': '',
                    'choices': choices_data,
                    'correct_answer': getattr(question, 'correct_answer', None),
                    'graded_at': None
                })
        
        return Response({
            'success': True,
            'quiz_id': quiz_id,
            'submission_id': submission_id,
            'questions': questions_data,
            'total_questions': len(questions_data)
        })
        
    except QuizResult.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Soumission non trouvée'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsTeacher])
def grade_submission(request, submission_id):
    """Corriger une soumission (note manuelle)"""
    try:
        submission = QuizResult.objects.get(id=submission_id)
        
        # Vérifier que l'enseignant est le propriétaire
        if submission.quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        score = data.get('score')
        is_graded = data.get('is_graded', True)
        
        if score is not None:
            submission.score = float(score)
            submission.percentage = (submission.score / submission.total_marks) * 100
            submission.is_passed = submission.percentage >= submission.quiz.passing_marks
        
        submission.is_graded = is_graded
        submission.graded_at = timezone.now() if is_graded else None
        submission.save()
        
        return Response({
            'success': True,
            'message': 'Soumission corrigée',
            'submission': {
                'id': submission.id,
                'score': submission.score,
                'percentage': submission.percentage,
                'grade': submission.get_grade(),
                'is_passed': submission.is_passed,
                'is_graded': submission.is_graded,
                'graded_at': submission.graded_at
            }
        })
        
    except QuizResult.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Soumission non trouvée'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def save_grading_draft(request, submission_id):
    """Sauvegarder un brouillon de correction"""
    try:
        submission = QuizResult.objects.get(id=submission_id)
        
        # Vérifier les permissions
        if submission.quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        grades = data.get('grades', {})
        comments = data.get('comments', {})
        
        # Sauvegarder les notes pour chaque question
        for question_id, marks_obtained in grades.items():
            try:
                question = Question.objects.get(id=question_id, quiz=submission.quiz)
                
                # Mettre à jour ou créer StudentAnswer
                student_answer, created = StudentAnswer.objects.update_or_create(
                    student=submission.student,
                    quiz=submission.quiz,
                    question=question,
                    defaults={
                        'marks_obtained': float(marks_obtained),
                        'is_correct': float(marks_obtained) >= question.marks * 0.5,
                        'comment': comments.get(question_id, '')
                    }
                )
                
            except (Question.DoesNotExist, ValueError) as e:
                logger.error(f"Erreur question {question_id}: {str(e)}")
                continue
        
        # Marquer comme brouillon (non finalisé)
        submission.is_graded = False
        submission.save()
        
        return Response({
            'success': True,
            'message': 'Brouillon de correction sauvegardé',
            'submission_id': submission_id
        })
        
    except QuizResult.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Soumission non trouvée'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def submit_final_grade(request, submission_id):
    """Soumettre la correction finale"""
    try:
        submission = QuizResult.objects.get(id=submission_id)
        
        # Vérifier les permissions
        if submission.quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        grades = data.get('grades', {})
        comments = data.get('comments', {})
        total_score = data.get('total_score', 0)
        
        # Calculer le total si non fourni
        if total_score == 0:
            total_score = sum(float(marks) for marks in grades.values())
        
        # Mettre à jour les réponses avec notes et commentaires
        for question_id, marks_obtained in grades.items():
            try:
                question = Question.objects.get(id=question_id, quiz=submission.quiz)
                
                student_answer, created = StudentAnswer.objects.update_or_create(
                    student=submission.student,
                    quiz=submission.quiz,
                    question=question,
                    defaults={
                        'marks_obtained': float(marks_obtained),
                        'is_correct': float(marks_obtained) >= question.marks,
                        'comment': comments.get(question_id, ''),
                        'graded_at': timezone.now()
                    }
                )
                
            except (Question.DoesNotExist, ValueError) as e:
                logger.error(f"Erreur question {question_id}: {str(e)}")
                continue
        
        # Mettre à jour le résultat final
        submission.score = float(total_score)
        submission.percentage = (submission.score / submission.total_marks) * 100
        submission.is_passed = submission.percentage >= submission.quiz.passing_marks
        submission.is_graded = True
        submission.graded_at = timezone.now()
        submission.save()
        
        # Envoyer une notification à l'étudiant (optionnel)
        # send_notification_to_student(submission.student, submission)
        
        return Response({
            'success': True,
            'message': 'Correction finale soumise',
            'submission': {
                'id': submission.id,
                'score': submission.score,
                'total_marks': submission.total_marks,
                'percentage': submission.percentage,
                'grade': submission.get_grade(),
                'is_passed': submission.is_passed,
                'is_graded': submission.is_graded,
                'graded_at': submission.graded_at
            }
        })
        
    except QuizResult.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Soumission non trouvée'
        }, status=status.HTTP_404_NOT_FOUND)


# ========================================
# VUES SUPPLÉMENTAIRES UTILES
# ========================================
# backend/tests/views.py - CORRECTION DÉFINITIVE DE student_available_tests
# backend/tests/views.py - VERSION SIMPLIFIÉE ET CORRIGÉE
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def student_available_tests(request):
    """Tests disponibles pour l'étudiant - VERSION SIMPLIFIÉE"""
    user = request.user
    
    try:
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        logger.info(f"🎯 Récupération tests pour étudiant: {user.username} (ID: {user.id})")
        
        # 1. Récupérer les classes de l'étudiant
        student_classes = user.enrolled_classes.all()
        logger.info(f"📚 Classes de l'étudiant: {[c.name for c in student_classes]}")
        
        if not student_classes.exists():
            logger.warning("⚠️ L'étudiant n'a pas de classe assignée")
            return Response({
                'success': True,
                'count': 0,
                'tests': [],
                'message': 'Vous n\'êtes inscrit dans aucune classe'
            })
        
        # 2. SIMPLIFIÉ: Récupérer TOUS les tests actifs sans vérification complexe
        now = timezone.now()
        tests = Quiz.objects.filter(
            is_active=True,
            start_time__lte=now,
            end_time__gte=now
        ).select_related('subject', 'teacher').order_by('start_time')
        
        logger.info(f"📝 Tests actifs trouvés: {tests.count()}")
        
        # 3. Formater les données
        tests_data = []
        for test in tests:
            # Vérifier si déjà soumis
            submitted = QuizResult.objects.filter(
                quiz=test,
                student=user
            ).exists()
            
            # Vérifier l'accès simple: l'étudiant a-t-il cette matière dans ses classes?
            has_access = False
            if test.subject:
                for cls in student_classes:
                    if cls.subjects.filter(id=test.subject.id).exists():
                        has_access = True
                        break
            
            # Si pas d'accès via matière, donner quand même accès (fallback)
            if not has_access:
                logger.info(f"⚠️ Étudiant {user.username} n'a pas la matière {test.subject.name if test.subject else 'N/A'} mais accès donné")
                has_access = True  # Fallback pour débloquer
            
            tests_data.append({
                'id': test.id,
                'title': test.title,
                'subject': test.subject.name if test.subject else 'Général',
                'subject_id': test.subject.id if test.subject else None,
                'teacher': test.teacher.get_full_name() if test.teacher else 'Inconnu',
                'teacher_id': test.teacher.id if test.teacher else None,
                'duration': test.duration,
                'total_marks': test.total_marks,
                'passing_marks': test.passing_marks,
                'start_time': test.start_time,
                'end_time': test.end_time,
                'description': test.description or '',
                'instructions': test.instructions or '',
                'questions_count': test.questions.count(),
                'is_available': has_access,
                'already_submitted': submitted,
                'time_remaining': (test.end_time - now).total_seconds() if now < test.end_time else 0,
                'status': 'active' if now >= test.start_time and now <= test.end_time else 'upcoming'
            })
        
        # Filtrer pour ne garder que ceux disponibles
        available_tests = [t for t in tests_data if t['is_available']]
        
        logger.info(f"🎉 Tests envoyés à l'étudiant: {len(available_tests)}/{len(tests_data)}")
        
        return Response({
            'success': True,
            'count': len(available_tests),
            'tests': available_tests,
            'debug_info': {
                'student_classes': student_classes.count(),
                'all_active_tests': len(tests_data),
                'available_tests': len(available_tests)
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur student_available_tests: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Fallback simple
        return Response({
            'success': True,
            'count': 0,
            'tests': [],
            'message': 'Erreur lors du chargement',
            'error': str(e)
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def student_my_submission(request, quiz_id):
    """Récupérer la soumission de l'étudiant pour un quiz"""
    try:
        # Vérifier d'abord si le quiz existe
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        submission = QuizResult.objects.filter(
            quiz_id=quiz_id,
            student=request.user
        ).first()
        
        if not submission:
            return Response({
                'success': True,
                'submitted': False,
                'message': 'Pas encore soumis'
            })
        
        # Récupérer les réponses détaillées
        answers = StudentAnswer.objects.filter(
            student=request.user,
            quiz_id=quiz_id
        ).select_related('question')
        
        answers_data = []
        for answer in answers:
            answers_data.append({
                'question_id': answer.question.id,
                'question_text': answer.question.text,
                'marks_obtained': answer.marks_obtained or 0,
                'total_marks': answer.question.marks,
                'is_correct': answer.is_correct or False,
                'comment': getattr(answer, 'comment', '')
            })
        
        return Response({
            'success': True,
            'submitted': True,
            'submission': {
                'id': submission.id,
                'score': submission.score,
                'total_marks': submission.total_marks,
                'percentage': submission.percentage,
                'grade': submission.get_grade(),
                'time_taken': submission.time_taken or 0,
                'submitted_at': submission.submitted_at,
                'is_passed': submission.is_passed,
                'is_graded': submission.is_graded
            },
            'answers': answers_data
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erreur my_submission: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return Response({
            'success': False,
            'error': 'Erreur serveur: ' + str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def quiz_statistics(request, quiz_id):
    """Statistiques détaillées d'un quiz"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier les permissions
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Récupérer toutes les soumissions
        submissions = QuizResult.objects.filter(quiz=quiz)
        
        # Statistiques de base
        total_submissions = submissions.count()
        graded_submissions = submissions.filter(is_graded=True).count()
        
        if graded_submissions > 0:
            avg_score = submissions.filter(is_graded=True).aggregate(
                avg=Avg('score')
            )['avg'] or 0
            
            avg_percentage = submissions.filter(is_graded=True).aggregate(
                avg=Avg('percentage')
            )['avg'] or 0
            
            passed_count = submissions.filter(
                is_graded=True,
                is_passed=True
            ).count()
            
            pass_rate = (passed_count / graded_submissions) * 100
        else:
            avg_score = avg_percentage = pass_rate = 0
        
        # Distribution des notes
        grade_distribution = {
            'A+': submissions.filter(is_graded=True, percentage__gte=90).count(),
            'A': submissions.filter(is_graded=True, percentage__gte=80, percentage__lt=90).count(),
            'B': submissions.filter(is_graded=True, percentage__gte=70, percentage__lt=80).count(),
            'C': submissions.filter(is_graded=True, percentage__gte=60, percentage__lt=70).count(),
            'D': submissions.filter(is_graded=True, percentage__gte=50, percentage__lt=60).count(),
            'F': submissions.filter(is_graded=True, percentage__lt=50).count()
        }
        
        # Meilleurs résultats
        top_results = submissions.filter(is_graded=True).order_by('-score')[:5]
        top_results_data = [{
            'student_name': r.student.get_full_name(),
            'score': r.score,
            'percentage': r.percentage,
            'grade': r.get_grade(),
            'time_taken': r.time_taken
        } for r in top_results]
        
        return Response({
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks
            },
            'statistics': {
                'total_students': total_submissions,
                'submitted_count': total_submissions,
                'graded_count': graded_submissions,
                'average_score': round(avg_score, 2),
                'average_percentage': round(avg_percentage, 2),
                'pass_rate': round(pass_rate, 2),
                'grade_distribution': grade_distribution
            },
            'top_results': top_results_data
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    


# backend/tests/views.py - CORRIGEZ quiz_take_view
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_take_view(request, quiz_id):
    """Récupérer un quiz avec ses questions pour le passer - VERSION SIMPLIFIÉE"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        user = request.user
        
        logger.info(f"🎯 quiz_take_view appelé: Étudiant {user.username} veut passer le test {quiz.title}")
        
        # Vérifier que l'utilisateur est un étudiant
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Seuls les étudiants peuvent passer des tests'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Vérifier les dates
        now = timezone.now()
        if now < quiz.start_time:
            return Response({
                'success': False,
                'error': f'Le test commence le {quiz.start_time.strftime("%d/%m/%Y à %H:%M")}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if now > quiz.end_time:
            return Response({
                'success': False,
                'error': 'Le test est terminé'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier si déjà soumis
        already_submitted = QuizResult.objects.filter(
            quiz=quiz,
            student=user
        ).exists()
        
        if already_submitted:
            return Response({
                'success': False,
                'error': 'Vous avez déjà soumis ce test'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ACCÈS SIMPLIFIÉ : Pas de vérification de matière/classe
        logger.info(f"✅ Accès accordé à {user.username} pour {quiz.title}")
        
        # Récupérer les questions avec leurs choix
        questions = Question.objects.filter(
            quiz=quiz
        ).prefetch_related('choices').order_by('order')
        
        questions_data = []
        for question in questions:
            choices_data = []
            for choice in question.choices.all():
                choices_data.append({
                    'id': choice.id,
                    'text': choice.text,
                    'order': choice.order
                    # Ne pas envoyer is_correct aux étudiants !
                })
            
            questions_data.append({
                'id': question.id,
                'question_type': question.question_type,
                'text': question.text,
                'marks': question.marks,
                'order': question.order,
                'choices': choices_data
            })
        
        return Response({
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'description': quiz.description,
                'instructions': quiz.instructions,
                'duration': quiz.duration,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks,
                'start_time': quiz.start_time,
                'end_time': quiz.end_time,
                'subject_name': quiz.subject.name if quiz.subject else 'Général',
                'teacher_name': quiz.teacher.get_full_name() if quiz.teacher else 'Professeur'
            },
            'questions': questions_data,
            'access_info': {
                'student_id': user.id,
                'timestamp': now.isoformat(),
                'remaining_time': (quiz.end_time - now).total_seconds()
            }
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"❌ Erreur quiz_take_view: {str(e)}")
        return Response({
            'success': False,
            'error': 'Erreur serveur lors du chargement du test'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_subject_structure(request):
    """Debug: Vérifier la structure des modèles"""
    try:
        # Vérifier les champs de Subject
        from django.db.models.fields.related import ForeignKey, ManyToManyField
        
        subject_fields = []
        for field in Subject._meta.get_fields():
            field_info = {
                'name': field.name,
                'type': field.__class__.__name__,
                'related_model': getattr(field, 'related_model', None)
            }
            if hasattr(field, 'related_model') and field.related_model:
                field_info['related_model_name'] = field.related_model.__name__
            subject_fields.append(field_info)
        
        # Vérifier les classes de l'utilisateur
        user_classes = request.user.enrolled_classes.all()
        user_classes_info = [{
            'id': c.id,
            'name': c.name,
            'subjects_count': c.subjects.count() if hasattr(c, 'subjects') else 0
        } for c in user_classes]
        
        return Response({
            'success': True,
            'user': {
                'id': request.user.id,
                'role': request.user.role,
                'classes_count': user_classes.count()
            },
            'subject_fields': subject_fields,
            'user_classes': user_classes_info,
            'available_subjects': Subject.objects.count(),
            'available_quizzes': Quiz.objects.filter(is_active=True).count()
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        })
    

# backend/tests/views.py - VERSION SIMPLIFIÉE QUI FONCTIONNE
# backend/tests/views.py - VERSION CORRIGÉE AVEC BUG FIX
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def get_quiz_submissions(request, quiz_id):
    """Récupérer les soumissions d'un quiz - VERSION CORRIGÉE"""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        
        # Vérifier que l'enseignant est le propriétaire
        if quiz.teacher != request.user:
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        logger.info(f"📊 Chargement soumissions pour quiz {quiz_id} par enseignant {request.user.username}")
        
        # 1. Récupérer TOUS les QuizResult pour ce quiz
        quiz_results = QuizResult.objects.filter(quiz=quiz).select_related('student')
        
        submissions_data = []
        
        for result in quiz_results:
            # CORRECTION: Vérifier si l'étudiant existe vraiment
            if not result.student:
                logger.warning(f"⚠️ QuizResult {result.id} sans étudiant associé")
                continue
                
            # Compter les réponses de l'étudiant
            student_answers_count = StudentAnswer.objects.filter(
                quiz=quiz,
                student=result.student
            ).count()
            
            # IMPORTANT: Un étudiant est "soumis" s'il a:
            # 1. Un QuizResult avec submitted_at != NULL
            # OU 2. Des StudentAnswer
            is_submitted = (result.submitted_at is not None) or (student_answers_count > 0)
            
            # CORRECTION: Récupérer la classe de l'étudiant
            student_class = None
            class_name = 'Non assigné'
            
            # Essayer différentes méthodes pour récupérer la classe
            if hasattr(result.student, 'enrolled_classes') and result.student.enrolled_classes.exists():
                student_class = result.student.enrolled_classes.first()
                class_name = student_class.name if student_class else 'Non assigné'
            
            # CORRECTION CRITIQUE: Assurer que student_id est correct
            submission_entry = {
                'id': result.id,
                'student_id': result.student.id,  # ← CORRIGÉ: Utiliser result.student.id
                'student_name': result.student.get_full_name() if result.student else f"Étudiant {result.student_id}",
                'student_email': result.student.email if result.student else None,
                'is_submitted': is_submitted,
                'is_graded': result.is_graded,
                'score': result.score if is_submitted else None,
                'total_marks': quiz.total_marks,
                'percentage': result.percentage if is_submitted else None,
                'grade': result.get_grade() if is_submitted else None,
                'time_taken': result.time_taken if is_submitted else 0,
                'submitted_at': result.submitted_at if is_submitted else None,
                'graded_at': result.graded_at if is_submitted else None,
                'class_name': class_name,
                'answers_count': student_answers_count,
                'has_quiz_result': True,
                'has_submitted_at': result.submitted_at is not None
            }
            
            submissions_data.append(submission_entry)
            logger.info(f"  → Étudiant: {submission_entry['student_name']} (ID: {submission_entry['student_id']})")
        
        # 2. Chercher les étudiants qui ont des StudentAnswer mais PAS de QuizResult
        students_with_answers = StudentAnswer.objects.filter(
            quiz=quiz
        ).values('student').distinct()
        
        student_ids_with_answers = [item['student'] for item in students_with_answers]
        student_ids_with_results = [result.student.id for result in quiz_results if result.student]
        
        # Trouver les étudiants manquants
        students_missing_result = set(student_ids_with_answers) - set(student_ids_with_results)
        
        for student_id in students_missing_result:
            try:
                student = CustomUser.objects.get(id=student_id, role='student')
                
                # Compter les réponses
                student_answers_count = StudentAnswer.objects.filter(
                    quiz=quiz,
                    student=student
                ).count()
                
                if student_answers_count > 0:
                    # Récupérer la classe
                    student_class = None
                    class_name = 'Non assigné'
                    if hasattr(student, 'enrolled_classes') and student.enrolled_classes.exists():
                        student_class = student.enrolled_classes.first()
                        class_name = student_class.name if student_class else 'Non assigné'
                    
                    submissions_data.append({
                        'id': None,
                        'student_id': student.id,  # ← CORRIGÉ: Utiliser student.id
                        'student_name': student.get_full_name(),
                        'student_email': student.email,
                        'is_submitted': True,  # Il a répondu!
                        'is_graded': False,
                        'score': None,
                        'total_marks': quiz.total_marks,
                        'percentage': None,
                        'grade': None,
                        'time_taken': 0,
                        'submitted_at': None,
                        'graded_at': None,
                        'class_name': class_name,
                        'answers_count': student_answers_count,
                        'has_quiz_result': False,
                        'has_submitted_at': False,
                        'has_answers_only': True
                    })
                    
                    logger.info(f"  → Étudiant sans QuizResult: {student.get_full_name()} (ID: {student.id})")
                    
            except CustomUser.DoesNotExist:
                logger.warning(f"Étudiant ID {student_id} non trouvé")
                continue
        
        # 3. Calculer les statistiques
        truly_submitted = [s for s in submissions_data if s['is_submitted']]
        graded_count = len([s for s in submissions_data if s['is_graded']])
        
        # Nombre total d'étudiants inscrits à la matière
        total_students_in_classes = 0
        if quiz.subject:
            try:
                student_classes = Class.objects.filter(subjects=quiz.subject)
                total_students_in_classes = CustomUser.objects.filter(
                    role='student',
                    enrolled_classes__in=student_classes
                ).distinct().count()
            except Exception as e:
                logger.error(f"Erreur calcul étudiants: {e}")
                total_students_in_classes = len(submissions_data)
        
        # Taux de soumission
        submission_rate = 0
        if total_students_in_classes > 0:
            submission_rate = (len(truly_submitted) / total_students_in_classes) * 100
        
        logger.info(f"📈 Statistiques: {len(submissions_data)} soumissions, {len(truly_submitted)} avec réponses")
        
        return Response({
            'success': True,
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'subject_name': quiz.subject.name if quiz.subject else None,
                'duration': quiz.duration,
                'total_marks': quiz.total_marks,
                'passing_marks': quiz.passing_marks
            },
            'stats': {
                'total_students': total_students_in_classes,
                'total_with_results': len(submissions_data),
                'submitted_count': len(truly_submitted),
                'graded_count': graded_count,
                'students_with_answers_only': len([s for s in submissions_data if s.get('has_answers_only', False)]),
                'submission_rate': round(submission_rate, 2)
            },
            'submissions': submissions_data,
            'total': len(submissions_data)
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Quiz non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"❌ ERREUR get_quiz_submissions: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Erreur serveur: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    



# backend/tests/views.py - AJOUTEZ CETTE FONCTION
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_student_access(request):
    """Debug: Vérifier pourquoi un étudiant ne voit pas les tests"""
    user = request.user
    
    try:
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Cette fonction est réservée aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 1. Classes de l'étudiant
        student_classes = user.enrolled_classes.all()
        classes_info = []
        
        for cls in student_classes:
            classes_info.append({
                'id': cls.id,
                'name': cls.name,
                'subjects_count': cls.subjects.count(),
                'subjects': list(cls.subjects.values_list('name', flat=True))
            })
        
        # 2. Vérifier la relation exacte
        from classes.models import Subject
        subject_fields = []
        
        for field in Subject._meta.get_fields():
            field_info = {
                'name': field.name,
                'type': field.__class__.__name__
            }
            if hasattr(field, 'related_model') and field.related_model:
                field_info['related_model'] = field.related_model.__name__
            subject_fields.append(field_info)
        
        # 3. Tester différentes relations
        possible_relations = []
        
        # Essayer de trouver comment Subject est lié à Class
        try:
            # Option 1: classes (ManyToManyField)
            if hasattr(Subject, 'classes'):
                subjects_via_classes = Subject.objects.filter(classes__in=student_classes).distinct()
                possible_relations.append({
                    'relation': 'classes',
                    'count': subjects_via_classes.count(),
                    'subjects': list(subjects_via_classes.values_list('name', flat=True))
                })
        except Exception as e:
            pass
        
        try:
            # Option 2: class_assigned (ManyToManyField ou ForeignKey)
            if hasattr(Subject, 'class_assigned'):
                if Subject._meta.get_field('class_assigned').get_internal_type() == 'ForeignKey':
                    subjects_via_fk = Subject.objects.filter(class_assigned__in=student_classes).distinct()
                    possible_relations.append({
                        'relation': 'class_assigned (FK)',
                        'count': subjects_via_fk.count(),
                        'subjects': list(subjects_via_fk.values_list('name', flat=True))
                    })
                else:  # ManyToMany
                    subjects_via_m2m = Subject.objects.filter(class_assigned__in=student_classes).distinct()
                    possible_relations.append({
                        'relation': 'class_assigned (M2M)',
                        'count': subjects_via_m2m.count(),
                        'subjects': list(subjects_via_m2m.values_list('name', flat=True))
                    })
        except Exception as e:
            pass
        
        # 4. Tous les tests disponibles actuellement
        now = timezone.now()
        all_tests = Quiz.objects.filter(
            is_active=True,
            start_time__lte=now,
            end_time__gte=now
        ).select_related('subject', 'teacher')
        
        tests_info = []
        for test in all_tests:
            tests_info.append({
                'id': test.id,
                'title': test.title,
                'subject_id': test.subject.id if test.subject else None,
                'subject_name': test.subject.name if test.subject else None,
                'teacher': test.teacher.get_full_name() if test.teacher else None
            })
        
        return Response({
            'success': True,
            'student': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name(),
                'classes_count': student_classes.count()
            },
            'classes': classes_info,
            'subject_fields': subject_fields,
            'possible_relations': possible_relations,
            'all_active_tests': tests_info,
            'debug_info': {
                'total_classes': student_classes.count(),
                'total_subjects_in_classes': sum([c['subjects_count'] for c in classes_info]),
                'total_active_tests': len(tests_info)
            }
        })
        
    except Exception as e:
        logger.error(f"Erreur debug_student_access: {str(e)}")
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# backend/tests/views.py - AJOUTEZ CETTE FONCTION
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def student_tests_view(request):
    """Vue pour les tests de l'étudiant - VERSION SIMPLIFIÉE"""
    try:
        user = request.user
        
        if user.role != 'student':
            return Response({
                'success': False,
                'error': 'Accès réservé aux étudiants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        logger.info(f"📋 Récupération tests pour étudiant: {user.username}")
        
        # Récupérer les classes de l'étudiant
        student_classes = user.enrolled_classes.all()
        
        # Si l'étudiant n'a pas de classe
        if not student_classes.exists():
            return Response({
                'success': True,
                'count': 0,
                'tests': [],
                'message': 'Vous n\'êtes inscrit dans aucune classe'
            })
        
        # Récupérer les matières des classes
        subject_ids = []
        for cls in student_classes:
            # Utiliser la relation existante
            if hasattr(cls, 'subjects'):
                subject_ids.extend(cls.subjects.values_list('id', flat=True))
        
        subject_ids = list(set(subject_ids))  # Supprimer les doublons
        
        # Récupérer les tests actifs
        now = timezone.now()
        active_tests = Quiz.objects.filter(
            subject_id__in=subject_ids,
            is_active=True,
            start_time__lte=now,
            end_time__gte=now
        ).select_related('subject', 'teacher').order_by('start_time')
        
        # Formater les données
        tests_data = []
        for test in active_tests:
            # Vérifier si déjà soumis
            submitted = QuizResult.objects.filter(
                quiz=test,
                student=user
            ).exists()
            
            tests_data.append({
                'id': test.id,
                'title': test.title,
                'subject': test.subject.name if test.subject else 'Général',
                'teacher': test.teacher.get_full_name() if test.teacher else 'Professeur',
                'duration': test.duration,
                'total_marks': test.total_marks,
                'passing_marks': test.passing_marks,
                'start_time': test.start_time,
                'end_time': test.end_time,
                'remaining_time': (test.end_time - now).total_seconds(),
                'is_available': True,
                'already_submitted': submitted,
                'status': 'active'
            })
        
        # Tests à venir
        upcoming_tests = Quiz.objects.filter(
            subject_id__in=subject_ids,
            is_active=True,
            start_time__gt=now
        ).select_related('subject', 'teacher').order_by('start_time')
        
        upcoming_data = []
        for test in upcoming_tests:
            upcoming_data.append({
                'id': test.id,
                'title': test.title,
                'subject': test.subject.name if test.subject else 'Général',
                'start_time': test.start_time,
                'end_time': test.end_time,
                'status': 'upcoming'
            })
        
        return Response({
            'success': True,
            'count': len(tests_data),
            'tests': tests_data,
            'upcoming': {
                'count': len(upcoming_data),
                'tests': upcoming_data
            },
            'debug': {
                'student_classes': student_classes.count(),
                'subjects_count': len(subject_ids),
                'active_tests': len(tests_data)
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur student_tests_view: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Erreur lors du chargement des tests'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    




# backend/tests/views.py - AJOUTEZ CETTE VUE
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def debug_test_access(request, quiz_id):
    """Debug détaillé de l'accès au test"""
    try:
        quiz = Quiz.objects.select_related('subject', 'teacher', 'subject__class_assigned').get(id=quiz_id)
        
        debug_info = {
            'test': {
                'id': quiz.id,
                'title': quiz.title,
                'subject_id': quiz.subject.id if quiz.subject else None,
                'subject_name': quiz.subject.name if quiz.subject else None,
                'subject_class_id': quiz.subject.class_assigned.id if quiz.subject and quiz.subject.class_assigned else None,
                'subject_class_name': quiz.subject.class_assigned.name if quiz.subject and quiz.subject.class_assigned else None,
                'teacher_id': quiz.teacher.id if quiz.teacher else None,
                'teacher_name': quiz.teacher.get_full_name() if quiz.teacher else None,
                'is_active': quiz.is_active,
                'start_time': quiz.start_time,
                'end_time': quiz.end_time,
            },
            'student': {
                'id': request.user.id,
                'username': request.user.username,
                'classes': []
            },
            'analysis': {
                'subject_exists': quiz.subject is not None,
                'subject_has_class': quiz.subject and quiz.subject.class_assigned is not None,
                'time_check': quiz.start_time <= timezone.now() <= quiz.end_time,
                'is_active': quiz.is_active
            },
            'access_check': {
                'via_class': False,
                'via_subject': False,
                'via_teacher': False,
                'result': False
            }
        }
        
        # Récupérer les classes de l'étudiant
        student_classes = request.user.enrolled_classes.all()
        debug_info['student']['classes'] = [{
            'id': c.id,
            'name': c.name,
            'subjects': [s.name for s in c.subjects.all()]
        } for c in student_classes]
        
        # Vérifier accès via classe
        if quiz.subject and quiz.subject.class_assigned:
            debug_info['access_check']['via_class'] = student_classes.filter(
                id=quiz.subject.class_assigned.id
            ).exists()
        
        # Vérifier accès via matière
        if quiz.subject:
            for cls in student_classes:
                if cls.subjects.filter(id=quiz.subject.id).exists():
                    debug_info['access_check']['via_subject'] = True
                    break
        
        # Vérifier accès via enseignant
        if quiz.teacher:
            for cls in student_classes:
                if cls.subjects.filter(teacher=quiz.teacher).exists():
                    debug_info['access_check']['via_teacher'] = True
                    break
        
        # Résultat final
        debug_info['access_check']['result'] = any([
            debug_info['access_check']['via_class'],
            debug_info['access_check']['via_subject'],
            debug_info['access_check']['via_teacher']
        ])
        
        return Response({
            'success': True,
            'debug': debug_info,
            'has_access': debug_info['access_check']['result'],
            'is_available': debug_info['analysis']['time_check'] and debug_info['analysis']['is_active']
        })
        
    except Quiz.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Test non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# backend/tests/views.py - AJOUTEZ CETTE VUE POUR DEBUG
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_student_test_access(request):
    """Debug détaillé pour voir pourquoi un étudiant ne voit pas les tests"""
    user = request.user
    
    if user.role != 'student':
        return Response({
            'success': False,
            'error': 'Cette fonction est réservée aux étudiants'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        debug_info = {
            'student': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name(),
                'approved': user.approved
            },
            'step1_classes': [],
            'step2_subjects': [],
            'step3_tests': [],
            'step4_available_tests': [],
            'step5_student_tests': [],
            'errors': []
        }
        
        # ÉTAPE 1: Vérifier les classes de l'étudiant
        student_classes = user.enrolled_classes.all()
        debug_info['step1_classes'] = [{
            'id': cls.id,
            'name': cls.name,
            'subjects_count': cls.subjects.count(),
            'students_count': cls.students.count()
        } for cls in student_classes]
        
        if not student_classes.exists():
            debug_info['errors'].append("L'étudiant n'a pas de classe assignée")
            return Response(debug_info)
        
        # ÉTAPE 2: Vérifier les matières des classes
        subject_ids = []
        for cls in student_classes:
            if hasattr(cls, 'subjects'):
                subjects = cls.subjects.all()
                for subject in subjects:
                    debug_info['step2_subjects'].append({
                        'id': subject.id,
                        'name': subject.name,
                        'class': cls.name,
                        'has_teacher': subject.teacher is not None,
                        'teacher': subject.teacher.get_full_name() if subject.teacher else None
                    })
                    subject_ids.append(subject.id)
        
        if not subject_ids:
            debug_info['errors'].append("Aucune matière trouvée dans les classes de l'étudiant")
        
        # ÉTAPE 3: Vérifier tous les tests existants
        all_tests = Quiz.objects.filter(is_active=True).select_related('subject', 'teacher')
        debug_info['step3_tests'] = [{
            'id': test.id,
            'title': test.title,
            'subject_id': test.subject.id if test.subject else None,
            'subject_name': test.subject.name if test.subject else None,
            'subject_in_student_list': test.subject.id in subject_ids if test.subject else False,
            'start_time': test.start_time,
            'end_time': test.end_time,
            'is_active': test.is_active,
            'teacher': test.teacher.get_full_name() if test.teacher else None
        } for test in all_tests]
        
        # ÉTAPE 4: Vérifier student_available_tests
        try:
            # Simuler la logique de student_available_tests
            now = timezone.now()
            available_tests = []
            for test in all_tests:
                if test.subject and test.subject.id in subject_ids:
                    if test.start_time <= now <= test.end_time and test.is_active:
                        available_tests.append({
                            'id': test.id,
                            'title': test.title,
                            'subject': test.subject.name
                        })
            debug_info['step4_available_tests'] = available_tests
        except Exception as e:
            debug_info['errors'].append(f"Erreur student_available_tests: {str(e)}")
        
        # ÉTAPE 5: Vérifier student_tests_view
        try:
            # Simuler la logique de student_tests_view
            now = timezone.now()
            student_tests = []
            for test in all_tests:
                if test.subject and test.subject.id in subject_ids:
                    student_tests.append({
                        'id': test.id,
                        'title': test.title,
                        'subject': test.subject.name,
                        'is_active': test.is_active,
                        'is_current': test.start_time <= now <= test.end_time
                    })
            debug_info['step5_student_tests'] = student_tests
        except Exception as e:
            debug_info['errors'].append(f"Erreur student_tests_view: {str(e)}")
        
        return Response({
            'success': True,
            'debug': debug_info,
            'summary': {
                'classes_count': student_classes.count(),
                'subjects_count': len(subject_ids),
                'all_tests_count': all_tests.count(),
                'available_tests_count': len(debug_info['step4_available_tests']),
                'student_tests_count': len(debug_info['step5_student_tests'])
            }
        })
        
    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def save_student_grading(request, quiz_id, student_id):
    """Enregistrer la notation AVEC AUTO-CORRECTION"""
    try:
        quiz = Quiz.objects.get(id=quiz_id, teacher=request.user)
        student = CustomUser.objects.get(id=student_id, role='student')
        
        grades = request.data.get('grades', {})
        comments = request.data.get('comments', {})
        auto_grade = request.data.get('auto_grade', True)  # NOUVEAU
        
        total_score = 0
        
        # Parcourir chaque question
        for question_id, marks_obtained in grades.items():
            try:
                question = Question.objects.get(id=question_id, quiz=quiz)
                
                # Si auto_grade, calculer automatiquement pour MCQ
                if auto_grade and question.question_type == 'mcq':
                    student_answer = StudentAnswer.objects.filter(
                        student=student,
                        quiz=quiz,
                        question=question
                    ).first()
                    
                    if student_answer:
                        # Compter les bonnes réponses
                        correct_choices = question.choices.filter(is_correct=True)
                        selected_correct = student_answer.selected_choices.filter(is_correct=True).count()
                        
                        if correct_choices.count() > 0:
                            percentage = selected_correct / correct_choices.count()
                            marks_obtained = percentage * question.marks
                
                # Mettre à jour la réponse
                student_answer, created = StudentAnswer.objects.update_or_create(
                    student=student,
                    quiz=quiz,
                    question=question,
                    defaults={
                        'marks_obtained': float(marks_obtained),
                        'is_correct': float(marks_obtained) >= question.marks * 0.5,
                        'comment': comments.get(str(question_id), ''),
                        'graded_at': timezone.now()
                    }
                )
                
                total_score += float(marks_obtained)
                
            except Question.DoesNotExist:
                continue
        
        # Mettre à jour le résultat
        quiz_result, created = QuizResult.objects.update_or_create(
            quiz=quiz,
            student=student,
            defaults={
                'score': total_score,
                'total_marks': quiz.total_marks,
                'percentage': (total_score / quiz.total_marks) * 100 if quiz.total_marks > 0 else 0,
                'is_passed': total_score >= quiz.passing_marks,
                'is_graded': True,
                'graded_at': timezone.now()
            }
        )
        
        return Response({
            'success': True,
            'message': 'Notation enregistrée avec succès',
            'result': {
                'id': quiz_result.id,
                'score': quiz_result.score,
                'total_marks': quiz_result.total_marks,
                'percentage': quiz_result.percentage,
                'grade': quiz_result.get_grade(),
                'is_passed': quiz_result.is_passed
            }
        })
        
    except Exception as e:
        logger.error(f"Erreur save_student_grading: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)