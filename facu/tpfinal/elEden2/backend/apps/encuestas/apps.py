from django.apps import AppConfig


class EncuestasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.encuestas"
    verbose_name = "Encuestas"

    def ready(self):
        from . import signals  # noqa: F401 - register signals on app load
