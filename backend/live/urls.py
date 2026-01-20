# backend/live/urls.py - VERSION CORRIGÉE (SANS SubjectChatView)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LiveSessionViewSet, ScreenShareViewSet, JoinSessionView

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'sessions', LiveSessionViewSet, basename='livesession')
router.register(r'screen-shares', ScreenShareViewSet, basename='screenshare')

urlpatterns = [
    # Routes du router (ViewSets)
    path('', include(router.urls)),
    
    # Routes personnalisées
    path('join/', JoinSessionView.as_view(), name='join-session'),
]

# Routes générées automatiquement par le router:
# GET    /api/live/sessions/                    - List
# POST   /api/live/sessions/                    - Create
# GET    /api/live/sessions/{id}/               - Retrieve
# PATCH  /api/live/sessions/{id}/               - Partial Update
# DELETE /api/live/sessions/{id}/               - Delete
#
# GET    /api/live/sessions/active/             - @action active
# GET    /api/live/sessions/upcoming/           - @action upcoming
# POST   /api/live/sessions/{id}/start/         - @action start
# POST   /api/live/sessions/{id}/end/           - @action end
# POST   /api/live/sessions/{id}/join/          - @action join
# POST   /api/live/sessions/{id}/leave/         - @action leave
# GET    /api/live/sessions/{id}/participants/  - @action participants