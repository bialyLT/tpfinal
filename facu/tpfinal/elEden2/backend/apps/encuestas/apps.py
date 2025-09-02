from django.apps import AppConfig


class EncuestasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.encuestas'
    verbose_name = 'Encuestas'
    
    def ready(self):
        import apps.encuestas.signals
