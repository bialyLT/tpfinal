#!/usr/bin/env python
"""
Script para asignar tipo_usuario 'administrador' a un superusuario existente.
Ejecutar con: python set_admin_user.py
"""

import os
import sys
import django

# Agregar el directorio del proyecto al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from django.contrib.auth.models import User
from apps.users.models import PerfilUsuario, Persona

def set_admin_user():
    # Solicitar el username del superusuario
    username = input("Ingresa el username del superusuario: ").strip()
    
    try:
        # Obtener el usuario
        user = User.objects.get(username=username, is_superuser=True)
        print(f"Usuario encontrado: {user.username}")
        
        # Verificar si ya tiene perfil
        if hasattr(user, 'perfil'):
            perfil = user.perfil
            print(f"Perfil existente encontrado. Tipo actual: {perfil.tipo_usuario}")
        else:
            # Si no tiene perfil, necesitamos crear uno
            print("El usuario no tiene perfil. Necesitamos crear uno.")
            
            # Solicitar datos básicos para crear Persona y PerfilUsuario
            nombres = input("Nombres: ").strip()
            apellidos = input("Apellidos: ").strip()
            tipo_documento = input("Tipo documento (dni/cuit/cuil/pasaporte/cedula): ").strip()
            numero_documento = input("Número documento: ").strip()
            
            # Crear Persona
            persona = Persona.objects.create(
                nombres=nombres,
                apellidos=apellidos,
                tipo_documento=tipo_documento,
                numero_documento=numero_documento
            )
            print(f"Persona creada: {persona.nombre_completo}")
            
            # Crear PerfilUsuario
            perfil = PerfilUsuario.objects.create(
                user=user,
                persona=persona,
                tipo_usuario='administrador'
            )
            print("Perfil de usuario creado con tipo 'administrador'")
            return
        
        # Actualizar el tipo_usuario si es necesario
        if perfil.tipo_usuario != 'administrador':
            perfil.tipo_usuario = 'administrador'
            perfil.save()
            print(f"Tipo de usuario actualizado a 'administrador'")
        else:
            print("El usuario ya es administrador")
            
    except User.DoesNotExist:
        print(f"Error: No se encontró un superusuario con username '{username}'")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == '__main__':
    set_admin_user()
