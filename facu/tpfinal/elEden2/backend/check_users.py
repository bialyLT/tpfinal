#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from django.contrib.auth.models import User
from apps.users.models import Persona, Cliente

print("\n=== VERIFICACIÓN DE USUARIOS ===\n")

users = User.objects.all()
for user in users:
    print(f"Usuario: {user.username} ({user.email})")
    
    # Verificar Persona
    try:
        persona = Persona.objects.get(email=user.email)
        print(f"  ✅ Tiene Persona (ID: {persona.id_persona})")
        
        # Verificar Cliente
        try:
            cliente = Cliente.objects.get(persona=persona)
            print(f"  ✅ Tiene Cliente (ID: {cliente.id_cliente})")
        except Cliente.DoesNotExist:
            print(f"  ❌ NO tiene Cliente")
            
    except Persona.DoesNotExist:
        print(f"  ❌ NO tiene Persona")
    
    print()
