from rest_framework import permissions
from django.contrib.auth.models import AnonymousUser


class EsAdministradorOSoloLectura(permissions.BasePermission):
    """
    Permiso personalizado que permite acceso completo a administradores
    y solo lectura a otros usuarios autenticados
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return request.user.es_administrador


class EsPropietarioOAdministrador(permissions.BasePermission):
    """
    Permiso que permite que solo el propietario o un administrador 
    pueda editar el objeto
    """
    
    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier usuario autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Permisos de escritura solo para el propietario o administrador
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user or request.user.es_administrador
        elif hasattr(obj, 'user'):
            return obj.user == request.user or request.user.es_administrador
        
        return request.user.es_administrador


class PuedeGestionarUsuarios(permissions.BasePermission):
    """
    Permiso para gestionar usuarios (nivel gerente o superior)
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        return (request.user.es_administrador or 
                request.user.roles.filter(nivel_acceso__gte=8).exists())


class PuedeVerPagos(permissions.BasePermission):
    """
    Permiso para ver pagos según el rol del usuario
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        # Los administradores y gerentes pueden ver todos los pagos
        if (request.user.es_administrador or 
            request.user.roles.filter(nivel_acceso__gte=8).exists()):
            return True
        
        # Los cajeros pueden ver pagos
        if request.user.roles.filter(nivel_acceso__gte=3).exists():
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Los usuarios pueden ver solo sus propios pagos
        if obj.usuario == request.user:
            return True
        
        # Los administradores y gerentes pueden ver todos
        return (request.user.es_administrador or 
                request.user.roles.filter(nivel_acceso__gte=8).exists())


class PuedeModificarStock(permissions.BasePermission):
    """
    Permiso para modificar stock (vendedores o superior)
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return request.user.roles.filter(nivel_acceso__gte=5).exists()
