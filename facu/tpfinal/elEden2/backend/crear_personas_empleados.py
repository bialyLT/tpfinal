"""
Script para crear registros de Persona y Empleado para usuarios del grupo Empleados
que aún no tienen estos registros asociados.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from django.contrib.auth.models import User, Group
from apps.users.models import Persona, Empleado, Genero, TipoDocumento, Localidad


def crear_personas_empleados():
    """Crear Persona y Empleado para usuarios del grupo Empleados que no los tienen"""
    
    # Obtener grupo de empleados
    try:
        empleados_group = Group.objects.get(name='Empleados')
    except Group.DoesNotExist:
        print("❌ No existe el grupo 'Empleados'")
        return
    
    # Obtener usuarios del grupo Empleados
    empleados_users = User.objects.filter(groups=empleados_group)
    print(f"📊 Encontrados {empleados_users.count()} usuarios en el grupo 'Empleados'")
    
    # Obtener valores por defecto
    genero_default = Genero.objects.filter(genero='Prefiero no decir').first() or Genero.objects.first()
    tipo_doc_default = TipoDocumento.objects.filter(tipo='DNI').first() or TipoDocumento.objects.first()
    localidad_default = Localidad.objects.first()
    
    if not genero_default or not tipo_doc_default or not localidad_default:
        print("❌ Error: No hay datos de referencia (Genero, TipoDocumento, Localidad)")
        return
    
    creados = 0
    ya_existentes = 0
    
    for user in empleados_users:
        # Verificar si ya tiene Persona
        try:
            persona = Persona.objects.get(email=user.email)
            # Verificar si ya tiene Empleado
            try:
                empleado = Empleado.objects.get(persona=persona)
                print(f"✅ {user.username} ya tiene Persona y Empleado")
                ya_existentes += 1
            except Empleado.DoesNotExist:
                # Crear solo Empleado
                Empleado.objects.create(
                    persona=persona,
                    cargo='',
                    activo=True
                )
                print(f"✨ Creado Empleado para {user.username} (Persona ya existía)")
                creados += 1
        except Persona.DoesNotExist:
            # Crear Persona y Empleado
            try:
                # Generar número de documento único si no existe
                nro_doc = f"EMP{user.id:06d}"  # Ej: EMP000001
                while Persona.objects.filter(nro_documento=nro_doc).exists():
                    nro_doc = f"EMP{user.id:06d}_{Persona.objects.count()}"
                
                persona = Persona.objects.create(
                    nombre=user.first_name or user.username,
                    apellido=user.last_name or '',
                    email=user.email,
                    telefono='0000000000',  # Placeholder - el empleado debe actualizarlo
                    nro_documento=nro_doc,
                    calle='No especificado',
                    numero='S/N',
                    piso='',
                    dpto='',
                    localidad=localidad_default,
                    genero=genero_default,
                    tipo_documento=tipo_doc_default
                )
                
                Empleado.objects.create(
                    persona=persona,
                    cargo='',
                    activo=True
                )
                
                print(f"✨ Creado Persona y Empleado para {user.username}")
                creados += 1
            except Exception as e:
                print(f"❌ Error al crear Persona/Empleado para {user.username}: {str(e)}")
    
    print("\n" + "="*60)
    print(f"✅ Proceso completado")
    print(f"   - Creados/Actualizados: {creados}")
    print(f"   - Ya existentes: {ya_existentes}")
    print(f"   - Total procesados: {empleados_users.count()}")
    print("="*60)
    print("\n⚠️  IMPORTANTE: Los empleados deben actualizar su información personal")
    print("   desde su perfil (teléfono, dirección, documento, etc.)")


if __name__ == '__main__':
    print("🚀 Iniciando creación de Personas para Empleados...")
    print("="*60 + "\n")
    crear_personas_empleados()
