# lms_sessions/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, TestViewSet, TestScoreViewSet

router = DefaultRouter()
router.register(r'sessions', SessionViewSet)
router.register(r'tests', TestViewSet)
router.register(r'scores', TestScoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
]