# schedule/apps.py
from django.apps import AppConfig

class ScheduleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'schedule'
    verbose_name = "Gestion des Emplois du Temps"

    def ready(self):
        # Import des signaux seulement quand l'app est prête
        import schedule.signals  # <-- Cette ligne va maintenant fonctionner