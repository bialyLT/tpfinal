from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group, User
from .models import PerfilUsuario, ConfiguracionUsuario, Rol


@receiver(post_save, sender=User)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    """Crear perfil y configuración cuando se crea un usuario"""
    if created:
        # Crear persona por defecto si no existe
        from .models import Persona
        persona, _ = Persona.objects.get_or_create(
            numero_documento=f"temp_{instance.id}",
            defaults={
                'nombres': instance.first_name or 'Sin nombre',
                'apellidos': instance.last_name or 'Sin apellido',
                'tipo_documento': 'dni'
            }
        )
        
        # Crear perfil
        perfil = PerfilUsuario.objects.create(
            user=instance,
            persona=persona
        )
        
        # Crear configuración
        ConfiguracionUsuario.objects.create(user=instance)


@receiver(post_save, sender=Group)
def crear_rol_para_grupo(sender, instance, created, **kwargs):
    """Crear rol extendido cuando se crea un grupo"""
    if created:
        Rol.objects.get_or_create(
            grupo=instance,
            defaults={
                'descripcion': f'Rol para el grupo {instance.name}',
                'nivel_acceso': 1
            }
        )
