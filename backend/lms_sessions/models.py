# lms_sessions/models.py
from django.db import models
from accounts.models import CustomUser

class Session(models.Model):
    subject = models.ForeignKey('classes.Subject', on_delete=models.CASCADE, related_name='sessions')
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'teacher'})
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_live = models.BooleanField(default=False)
    recorded_file = models.FileField(upload_to='recorded_sessions/', null=True, blank=True)

    def __str__(self):
        return f"{self.subject.name} - {self.teacher.username} ({'Live' if self.is_live else 'Terminé'})"

class Test(models.Model):
    subject = models.ForeignKey('classes.Subject', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='tests/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class TestScore(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='scores')
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    score = models.FloatField()  # /20
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('test', 'student')
        ordering = ['-score']

    def __str__(self):
        return f"{self.student.username} → {self.score}/20"