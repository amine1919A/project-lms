# backend/schedule/urls.py - CORRECTION
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeeklyScheduleViewSet, TimeSlotViewSet, TeacherScheduleViewSet

router = DefaultRouter()
router.register(r'schedules', WeeklyScheduleViewSet, basename='weeklyschedule')
router.register(r'time-slots', TimeSlotViewSet, basename='timeslot')
router.register(r'teacher-schedules', TeacherScheduleViewSet, basename='teacherschedule')

urlpatterns = [
    # Routes du router
    path('', include(router.urls)),
    
    # Routes personnalisées admin
    path('generate-smart/', 
         WeeklyScheduleViewSet.as_view({'post': 'generate_smart_schedule'}), 
         name='generate-smart'),
    
    # Routes étudiants/enseignants - CORRECTION ICI
    path('my-schedule/', 
         WeeklyScheduleViewSet.as_view({'get': 'my_schedule'}), 
         name='my-schedule'),
    
    # CHANGER 'student_schedule' EN 'student_my_schedule'
    path('student/my-schedule/', 
         WeeklyScheduleViewSet.as_view({'get': 'student_my_schedule'}), 
         name='student-my-schedule'),
    
    path('teacher/my-schedule/', 
         TeacherScheduleViewSet.as_view({'get': 'my_schedule'}), 
         name='teacher-schedule'),
     
      path('student/my-teachers/',  # NOUVEAU
         WeeklyScheduleViewSet.as_view({'get': 'student_my_teachers'}), 
         name='student-my-teachers'),
         
]