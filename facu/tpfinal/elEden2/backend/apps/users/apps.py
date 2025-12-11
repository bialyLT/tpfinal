from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Empleados"

    def ready(self):
        from . import signals  # noqa: F401 - register signals on app load
