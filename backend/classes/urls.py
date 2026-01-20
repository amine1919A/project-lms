# backend/classes/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassViewSet, SubjectViewSet, SpecialtyViewSet

router = DefaultRouter()
router.register(r'classes', ClassViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'specialties', SpecialtyViewSet)

urlpatterns = [
    # Routes du router
    path('', include(router.urls)),
    
    # Routes personnalisées supplémentaires
    path('my-classmates/', 
         ClassViewSet.as_view({'get': 'my_classmates'}),
         name='my-classmates'),
    
    path('student-classes/', 
         ClassViewSet.as_view({'get': 'student_classes'}),
         name='student-classes'),
]