# backend/tests/serializers.py - VERSION COMPLÈTE CORRIGÉE
from rest_framework import serializers
from .models import Quiz, Question, Choice, StudentAnswer, QuizResult
from classes.models import Subject
from accounts.models import CustomUser
from django.utils import timezone

# ============================================
# SERIALIZERS POUR LA CRÉATION - CORRIGÉS
# ============================================

class QuizCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de quiz"""
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(),
        required=True
    )
    
    class Meta:
        model = Quiz
        fields = [
            'title', 'subject', 'quiz_type', 'description', 'instructions',
            'duration', 'total_marks', 'passing_marks', 'start_time', 'end_time'
        ]
        extra_kwargs = {
            'title': {'required': True, 'allow_blank': False},
            'subject': {'required': True},
            'quiz_type': {'required': False, 'default': 'quiz'},
            'duration': {'required': True, 'min_value': 1},
            'total_marks': {'required': True, 'min_value': 1},
            'passing_marks': {'required': True, 'min_value': 0},
            'start_time': {'required': True},
            'end_time': {'required': True},
            'description': {'required': False, 'allow_blank': True},
            'instructions': {'required': False, 'allow_blank': True},
        }
    
    def validate(self, data):
        """Validation globale des données"""
        # Vérifier la note de passage
        if data.get('passing_marks', 0) > data.get('total_marks', 0):
            raise serializers.ValidationError({
                'passing_marks': 'La note de passage ne peut pas être supérieure au total des points'
            })
        
        # Vérifier la durée
        if data.get('duration', 0) <= 0:
            raise serializers.ValidationError({
                'duration': 'La durée doit être positive'
            })
        
        # Vérifier les dates
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'La date de fin doit être après la date de début'
            })
        
        # Vérifier que la date de début n'est pas dans le passé
        if start_time and start_time < timezone.now():
            raise serializers.ValidationError({
                'start_time': 'La date de début ne peut pas être dans le passé'
            })
        
        return data
    
    def create(self, validated_data):
        """Créer un quiz avec l'enseignant connecté"""
        request = self.context.get('request')
        
        if request and hasattr(request, 'user'):
            # Vérifier que l'utilisateur est un enseignant
            if request.user.role != 'teacher':
                raise serializers.ValidationError({
                    'user': 'Seuls les enseignants peuvent créer des tests'
                })
            
            validated_data['teacher'] = request.user
            validated_data['is_active'] = True
            
            return super().create(validated_data)
        else:
            raise serializers.ValidationError({
                'request': 'Contexte de requête manquant'
            })


class QuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de questions"""
    
    class Meta:
        model = Question
        fields = ['quiz', 'question_type', 'text', 'marks', 'order', 'image']
        extra_kwargs = {
            'quiz': {'required': True},
            'question_type': {'required': True},
            'text': {'required': True, 'allow_blank': False},
            'marks': {'required': True, 'min_value': 1},
            'order': {'required': False, 'default': 0},
            'image': {'required': False, 'allow_null': True},
        }
    
    def validate_quiz(self, value):
        """Vérifier que l'utilisateur a accès à ce quiz"""
        request = self.context.get('request')
        
        if request and hasattr(request, 'user'):
            if request.user.role != 'teacher':
                raise serializers.ValidationError("Seuls les enseignants peuvent ajouter des questions.")
            
            if request.user != value.teacher:
                raise serializers.ValidationError("Vous ne pouvez pas ajouter de questions à ce quiz.")
        
        return value
    
    def validate(self, data):
        """Validation globale"""
        # Vérifier les types de questions valides
        valid_question_types = ['mcq', 'true_false', 'short_answer', 'essay', 'fill_blank']
        if data.get('question_type') not in valid_question_types:
            raise serializers.ValidationError({
                "question_type": f"Type de question invalide. Choisissez parmi: {', '.join(valid_question_types)}"
            })
        
        # Vérifier que les points sont positifs
        if data.get('marks', 0) <= 0:
            raise serializers.ValidationError({
                "marks": "Les points doivent être positifs"
            })
        
        return data


# backend/tests/serializers.py - VERIFIEZ ChoiceCreateSerializer

class ChoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de choix"""
    
    class Meta:
        model = Choice
        fields = ['question', 'text', 'is_correct', 'order']
        extra_kwargs = {
            'question': {'required': True},
            'text': {'required': True, 'allow_blank': False},
            'is_correct': {'required': False, 'default': False},
            'order': {'required': False, 'default': 0},
        }
    
    def validate(self, data):
        """Validation des choix"""
        # Vérifier que le texte n'est pas vide
        if not data.get('text', '').strip():
            raise serializers.ValidationError({
                'text': 'Le texte du choix ne peut pas être vide'
            })
        
        # Vérifier que la question existe
        question = data.get('question')
        if not Question.objects.filter(id=question.id).exists():
            raise serializers.ValidationError({
                'question': 'La question spécifiée n\'existe pas'
            })
        
        return data
    
    def create(self, validated_data):
        """Créer un choix"""
        request = self.context.get('request')
        question = validated_data['question']
        
        # Vérifier les permissions
        if request and request.user != question.quiz.teacher:
            raise serializers.ValidationError({
                'question': 'Vous ne pouvez pas ajouter de choix à cette question'
            })
        
        return super().create(validated_data)

# ============================================
# SERIALIZERS POUR LA LECTURE
# ============================================

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'quiz', 'question_type', 'text', 'image', 
                 'marks', 'order', 'choices']


class QuizSerializer(serializers.ModelSerializer):
    questions_count = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    is_available = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'subject', 'subject_name', 'teacher', 'teacher_name',
                 'quiz_type', 'description', 'instructions', 'duration', 'total_marks',
                 'passing_marks', 'start_time', 'end_time', 'is_active', 'questions_count',
                 'is_available', 'time_remaining', 'created_at']
        read_only_fields = ['teacher', 'is_active', 'created_at']
    
    def get_questions_count(self, obj):
        return obj.questions.count()
    
    def get_is_available(self, obj):
        now = timezone.now()
        return obj.start_time <= now <= obj.end_time and obj.is_active
    
    def get_time_remaining(self, obj):
        now = timezone.now()
        if now < obj.start_time:
            return "Pas encore commencé"
        elif now > obj.end_time:
            return "Terminé"
        else:
            remaining = (obj.end_time - now).total_seconds()
            hours = int(remaining // 3600)
            minutes = int((remaining % 3600) // 60)
            seconds = int(remaining % 60)
            return f"{hours}h {minutes}m {seconds}s"


class StudentAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    
    class Meta:
        model = StudentAnswer
        fields = ['id', 'student', 'student_name', 'quiz', 'quiz_title', 'question', 
                 'question_text', 'answer_text', 'selected_choices', 'is_correct', 
                 'marks_obtained', 'submitted_at']


class QuizResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    subject_name = serializers.CharField(source='quiz.subject.name', read_only=True)
    grade = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizResult
        fields = ['id', 'student', 'student_name', 'quiz', 'quiz_title', 'subject_name',
                 'score', 'total_marks', 'percentage', 'grade', 'started_at',
                 'submitted_at', 'time_taken', 'is_passed']
        read_only_fields = ['submitted_at']
    
    def get_grade(self, obj):
        return obj.get_grade()


class TakeQuizSerializer(serializers.Serializer):
    """Serializer pour soumettre un quiz"""
    quiz_id = serializers.IntegerField(required=True)
    answers = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    started_at = serializers.DateTimeField(required=True)
    time_taken = serializers.IntegerField(required=True, min_value=0)