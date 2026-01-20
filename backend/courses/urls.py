from rest_framework import routers
from .views import CourseViewSet
from django.urls import path, include

router = routers.DefaultRouter()
router.register(r"courses", CourseViewSet, basename="courses")

urlpatterns = [path("", include(router.urls))]
