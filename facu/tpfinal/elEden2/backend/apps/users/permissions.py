from rest_framework import permissions
from django.contrib.auth.models import AnonymousUser


class EsCliente(permissions.BasePermission):
    """
    Permiso que verifica que el usuario sea un cliente
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        try:
            perfil = request.user.perfil
            return perfil.tipo_usuario == 'cliente'
        except:
            return False


class EsEmpleadoOAdministrador(permissions.BasePermission):
    """
    Permiso que permite acceso solo a empleados, diseñadores o administradores
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        try:
            perfil = request.user.perfil
            return perfil.tipo_usuario in ['empleado', 'diseñador', 'administrador']
        except:
            return request.user.is_staff or request.user.is_superuser


class SoloSusRecursos(permissions.BasePermission):
    """
    Permiso que permite que los clientes solo vean sus propios recursos
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Si es empleado/administrador, puede ver todo
        try:
            perfil = request.user.perfil
            if perfil.tipo_usuario in ['empleado', 'diseñador', 'administrador']:
                return True
        except:
            if request.user.is_staff or request.user.is_superuser:
                return True
        
        # Si es cliente, solo puede ver sus propios recursos
        if hasattr(obj, 'cliente'):
            return obj.cliente == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        
        return False


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
        
        try:
            perfil = request.user.perfil
            return perfil.tipo_usuario == 'administrador'
        except:
            return request.user.is_staff or request.user.is_superuser


class EsPropietarioOAdministrador(permissions.BasePermission):
    """
    Permiso que permite que solo el propietario o un administrador 
    pueda editar el objeto
    """
    
    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier usuario autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Verificar si es administrador
        try:
            perfil = request.user.perfil
            es_admin = perfil.tipo_usuario == 'administrador'
        except:
            es_admin = request.user.is_staff or request.user.is_superuser
        
        # Permisos de escritura solo para el propietario o administrador
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user or es_admin
        elif hasattr(obj, 'user'):
            return obj.user == request.user or es_admin
        elif hasattr(obj, 'cliente'):
            return obj.cliente == request.user or es_admin
        
        return es_admin


class PuedeGestionarUsuarios(permissions.BasePermission):
    """
    Permiso para gestionar usuarios (nivel gerente o superior)
    """
    
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False
        
        try:
            perfil = request.user.perfil
            return perfil.tipo_usuario in ['administrador']
        except:
            return request.user.is_staff or request.user.is_superuser


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
