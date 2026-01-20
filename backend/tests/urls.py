# backend/tests/urls.py - CORRECTION DES IMPORTATIONS

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MyQuizzesView, QuizViewSet, QuestionViewSet, ChoiceViewSet, 
    StudentAnswerViewSet, bypass_check_access, bypass_quiz_take, bypass_submit_test, 
    debug_quiz_submissions, debug_student_access, debug_student_test_access, 
    debug_subject_structure, debug_test_access, get_quiz_submissions, 
    get_student_responses, quiz_take_view, save_student_grading, 
    student_all_tests, student_results_view, student_tests_view,
    teacher_quizzes_view, quiz_details_view, test_create_quiz_simple,
    test_create_choice_simple, test_create_question_simple, test_connection,
    
    # NOUVELLES VUES CORRIGÉES
    save_test_progress, get_submission_details, grade_submission,
    save_grading_draft, submit_final_grade, get_questions_with_answers,
    student_available_tests, student_my_submission, quiz_statistics,
    quiz_submissions_view, check_test_access, start_test, submit_test, 
    test_simple_submissions, debug_student_responses, test_student_responses  # AJOUTÉ ICI
)

router = DefaultRouter()
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'choices', ChoiceViewSet, basename='choice')
router.register(r'answers', StudentAnswerViewSet, basename='studentanswer')

urlpatterns = [
    path('', include(router.urls)),
    path('quizzes/<int:quiz_id>/debug-access/', debug_test_access, name='debug-test-access'),
    path('quizzes/<int:quiz_id>/debug-submissions/', debug_quiz_submissions, name='debug-quiz-submissions'),
    path('quizzes/<int:quiz_id>/test-submissions/', test_simple_submissions, name='test-submissions'),
    path('quizzes/<int:quiz_id>/submit-bypass/', bypass_submit_test, name='quiz-submit-bypass'),
    path('quizzes/<int:quiz_id>/take-bypass/', bypass_quiz_take, name='quiz-take-bypass'),  
    
    # Routes existantes
    path('my-quizzes/', MyQuizzesView.as_view(), name='my-quizzes'),
    path('student/tests/', student_tests_view, name='student-tests'),
    path('student/results/', student_results_view, name='student-results'),
    path('teacher/my-quizzes/', teacher_quizzes_view, name='teacher-quizzes'),
    path('quizzes/<int:quiz_id>/details/', quiz_details_view, name='quiz-details'),
    
    # Routes de debug/test
    path('simple/create-quiz/', test_create_quiz_simple, name='simple-create-quiz'),
    path('simple/create-question/', test_create_question_simple, name='simple-create-question'),
    path('simple/create-choice/', test_create_choice_simple, name='simple-create-choice'),
    path('test/', test_connection, name='test-connection'),
    
    # ============ NOUVELLES ROUTES POUR LA CORRECTION ============
    path('quizzes/<int:quiz_id>/submissions-all/', get_quiz_submissions, name='quiz-submissions-all'),
    path('quizzes/<int:quiz_id>/students/<int:student_id>/responses/', 
         get_student_responses, name='get-student-responses'),
    path('quizzes/<int:quiz_id>/students/<int:student_id>/grade/', save_student_grading, name='save-student-grading'),
    
    # Pour les étudiants
    path('student/available-tests/', student_available_tests, name='student-available-tests'),
    path('quizzes/<int:quiz_id>/my-submission/', student_my_submission, name='student-my-submission'),
    path('quizzes/<int:quiz_id>/check-access/', check_test_access, name='check-test-access'),
    path('quizzes/<int:quiz_id>/start/', start_test, name='start-test'),
    path('quizzes/<int:quiz_id>/submit/', submit_test, name='submit-test'),
    path('quizzes/<int:quiz_id>/save-progress/', save_test_progress, name='save-progress'),
    
    # Pour la correction (enseignants)
    path('quizzes/<int:quiz_id>/submissions/', quiz_submissions_view, name='quiz-submissions'),
    path('quizzes/<int:quiz_id>/statistics/', quiz_statistics, name='quiz-statistics'),
    
    # Pour les soumissions individuelles
    path('submissions/<int:submission_id>/', get_submission_details, name='submission-details'),
    path('submissions/<int:submission_id>/grade/', grade_submission, name='grade-submission'),
    path('submissions/<int:submission_id>/save-draft/', save_grading_draft, name='save-grading-draft'),
    path('submissions/<int:submission_id>/final-grade/', submit_final_grade, name='final-grade'),
    path('quizzes/<int:quiz_id>/bypass-access/', bypass_check_access, name='bypass-check-access'),
    
    # Questions avec réponses
    path('quizzes/<int:quiz_id>/students/<int:student_id>/responses/', get_student_responses, name='get-student-responses'),
    path('quizzes/<int:quiz_id>/questions-with-answers/<int:submission_id>/', 
         get_questions_with_answers, name='questions-with-answers'),
    
    path('student/all-tests/', student_all_tests, name='student-all-tests'),
    
    # Ajoutez après student_available_tests
    path('quizzes/<int:quiz_id>/take/', quiz_take_view, name='quiz-take'),
    path('debug/subject-structure/', debug_subject_structure, name='debug-subject-structure'),
    path('debug/student-access/', debug_student_access, name='debug-student-access'),
    path('debug/student-test-access/', debug_student_test_access, name='debug-student-test-access'),
    path('debug/student-responses/', debug_student_responses, name='debug-student-responses'),  # AJOUTÉ ICI
    path('quizzes/<int:quiz_id>/students/<int:student_id>/test-responses/', 
     test_student_responses, name='test-student-responses'),
]