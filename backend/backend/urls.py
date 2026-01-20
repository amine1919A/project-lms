from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API routes
    path('api/accounts/', include('accounts.urls')),
    path('api/classes/', include('classes.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/lms/', include('lms_sessions.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/schedule/', include('schedule.urls')),
    path('api/live/', include('live.urls')),
    path('api/tests/', include('tests.urls')),
    path('api/chat/', include('chat.urls')),
    
    # NOUVELLES ROUTES
    path('api/grades/', include('grades.urls')),
    path('api/attendance/', include('attendance.urls')),
]