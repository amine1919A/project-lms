# backend/lms_sessions/apps.py
from django.apps import AppConfig

class LmsSessionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lms_sessions'  # DOIT correspondre au nom du dossier
    label = 'lms_sessions'  # label unique
