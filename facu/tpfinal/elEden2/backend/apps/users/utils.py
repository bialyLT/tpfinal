from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from .models import Rol


def crear_roles_por_defecto():
    """Crear roles por defecto del sistema"""
    roles_defecto = [
        {
            'nombre': 'Administrador',
            'descripcion': 'Acceso completo al sistema',
            'nivel_acceso': 10
        },
        {
            'nombre': 'Gerente',
            'descripcion': 'Acceso de gestión y supervisión',
            'nivel_acceso': 8
        },
        {
            'nombre': 'Vendedor',
            'descripcion': 'Acceso a ventas y consulta de productos',
            'nivel_acceso': 5
        },
        {
            'nombre': 'Cajero',
            'descripcion': 'Acceso a procesamiento de pagos',
            'nivel_acceso': 3
        },
        {
            'nombre': 'Consulta',
            'descripcion': 'Solo lectura de productos e inventario',
            'nivel_acceso': 1
        },
    ]
    
    for rol_data in roles_defecto:
        grupo, created = Group.objects.get_or_create(name=rol_data['nombre'])
        if created:
            Rol.objects.create(
                grupo=grupo,
                descripcion=rol_data['descripcion'],
                nivel_acceso=rol_data['nivel_acceso']
            )
            print(f"Rol '{rol_data['nombre']}' creado exitosamente")
        else:
            print(f"Rol '{rol_data['nombre']}' ya existe")


def obtener_permisos_por_rol(nivel_acceso):
    """Obtiene permisos sugeridos según el nivel de acceso"""
    permisos_base = {
        1: ['view_producto', 'view_stock'],  # Consulta
        3: ['view_producto', 'view_stock', 'add_pago', 'change_pago'],  # Cajero
        5: ['view_producto', 'view_stock', 'add_producto', 'change_producto', 
            'add_pago', 'change_pago', 'view_usuario'],  # Vendedor
        8: ['view_producto', 'view_stock', 'add_producto', 'change_producto', 
            'delete_producto', 'add_pago', 'change_pago', 'delete_pago',
            'view_usuario', 'add_usuario', 'change_usuario'],  # Gerente
        10: ['all_permissions']  # Administrador
    }
    
    return permisos_base.get(nivel_acceso, [])


def validar_numero_documento(numero, tipo):
    """Validar formato de número de documento según tipo"""
    import re
    
    if tipo == 'dni':
        # DNI argentino: 7-8 dígitos
        return re.match(r'^\d{7,8}$', numero) is not None
    elif tipo in ['cuit', 'cuil']:
        # CUIT/CUIL: formato XX-XXXXXXXX-X
        numero_limpio = numero.replace('-', '')
        return re.match(r'^\d{11}$', numero_limpio) is not None
    elif tipo == 'pasaporte':
        # Pasaporte: formato flexible
        return len(numero) >= 6 and len(numero) <= 15
    
    return True  # Para otros tipos, aceptar cualquier formato
