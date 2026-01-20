# backend/tests/models.py (VERSION CORRIGÉE - SANS IMPORTATION CIRCULAIRE)
from django.db import models
from accounts.models import CustomUser
from classes.models import Subject

class Quiz(models.Model):
    TYPE_CHOICES = [
        ('quiz', 'Quiz'),
        ('exam', 'Examen'),
        ('assignment', 'Devoir'),
        ('test', 'Test'),
    ]
    
    title = models.CharField(max_length=200)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='quizzes')
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_quizzes')
    quiz_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='quiz')
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    duration = models.IntegerField(help_text="Durée en minutes")
    total_marks = models.IntegerField()
    passing_marks = models.IntegerField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Quizzes"
    
    def __str__(self):
        return self.title

class Question(models.Model):
    TYPE_CHOICES = [
        ('mcq', 'Choix multiple'),
        ('true_false', 'Vrai/Faux'),
        ('short_answer', 'Réponse courte'),
        ('essay', 'Dissertation'),
        ('fill_blank', 'Remplir les blancs'),
    ]
    
    quiz = models.ForeignKey('Quiz', on_delete=models.CASCADE, related_name='questions')  # Utilisez 'Quiz' comme string
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='mcq')
    text = models.TextField()
    image = models.ImageField(upload_to='questions/', null=True, blank=True)
    marks = models.IntegerField(default=1)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"Q{self.order}: {self.text[:50]}"

class Choice(models.Model):
    question = models.ForeignKey('Question', on_delete=models.CASCADE, related_name='choices')  # Utilisez 'Question' comme string
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.text[:50]} ({'✓' if self.is_correct else '✗'})"

# backend/tests/models.py - AJOUTEZ CES CHAMPS

class StudentAnswer(models.Model):
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='answers')
    quiz = models.ForeignKey('Quiz', on_delete=models.CASCADE, related_name='student_answers')
    question = models.ForeignKey('Question', on_delete=models.CASCADE, related_name='student_answers')
    answer_text = models.TextField(blank=True)
    selected_choices = models.ManyToManyField('Choice', blank=True)
    submitted_at = models.DateTimeField(auto_now=True)
    is_correct = models.BooleanField(default=False)
    marks_obtained = models.FloatField(default=0)
    
    # AJOUTEZ CES CHAMPS
    comment = models.TextField(blank=True, null=True, help_text="Commentaire de l'enseignant")
    graded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('student', 'question')
        ordering = ['submitted_at']
    
    def __str__(self):
        return f"{self.student.username} - Q{self.question.order}"


class QuizResult(models.Model):
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='quiz_results')
    quiz = models.ForeignKey('Quiz', on_delete=models.CASCADE, related_name='results')
    score = models.FloatField()
    total_marks = models.IntegerField()
    percentage = models.FloatField()
    started_at = models.DateTimeField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    time_taken = models.IntegerField(help_text="Temps pris en secondes")
    is_passed = models.BooleanField(default=False)
    
    # AJOUTEZ CES CHAMPS
    is_graded = models.BooleanField(default=False)
    graded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('student', 'quiz')
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.quiz.title}: {self.score}/{self.total_marks}"
    
    def get_grade(self):
        if self.percentage >= 90:
            return 'A+'
        elif self.percentage >= 80:
            return 'A'
        elif self.percentage >= 70:
            return 'B'
        elif self.percentage >= 60:
            return 'C'
        elif self.percentage >= 50:
            return 'D'
        else:
            return 'F'
