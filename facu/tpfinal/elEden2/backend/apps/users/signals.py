"""Señales para mantener sincronizados User.is_active y Empleado.activo.

La asignación a servicios usa el modelo Empleado (campo activo), mientras que
las vistas y la autenticación usan User.is_active. Si ambos se desincronizan,
un empleado puede aparecer como disponible para asignar pero oculto en la
gestión, o viceversa.

Estas señales propagan el cambio en ambas direcciones, con salvaguarda contra
bucles: solo se guarda el modelo destino cuando su valor efectivamente difiere.
"""

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Empleado


def _sync_empleado_from_user(user):
    """Alinear Empleado.activo con User.is_active del usuario dado."""
    persona = getattr(user, "persona", None)
    if not persona:
        return
    empleado = getattr(persona, "empleado", None)
    if not empleado or empleado.activo == user.is_active:
        return

    if user.is_active:
        empleado.restaurar()
    else:
        empleado.delete()  # soft-delete: activo=False + fecha_baja_automatica


def _sync_user_from_empleado(empleado):
    """Alinear User.is_active con Empleado.activo del empleado dado."""
    persona = getattr(empleado, "persona", None)
    user = getattr(persona, "user", None)
    if not user or user.is_active == empleado.activo:
        return

    user.is_active = empleado.activo
    user.save(update_fields=["is_active"])


@receiver(post_save, sender=User)
def sync_empleado_on_user_save(sender, instance, **kwargs):
    _sync_empleado_from_user(instance)


@receiver(post_save, sender=Empleado)
def sync_user_on_empleado_save(sender, instance, **kwargs):
    _sync_user_from_empleado(instance)