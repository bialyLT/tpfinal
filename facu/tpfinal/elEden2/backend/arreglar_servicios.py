"""
Script para limpiar servicios incorrectos y crear el catálogo correcto
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from apps.servicios.models import Servicio

print("🧹 Limpiando servicios antiguos...")
from apps.servicios.models import Reserva, Diseno

servicios_viejos = Servicio.objects.filter(activo=False)
count = servicios_viejos.count()

if count > 0:
    print(f"⚠️  Encontrados {count} servicios inactivos")
    print("   Simplemente los vamos a activar y renombrar correctamente...")
    
    # Simplemente activar los servicios y darles nombres correctos
    for i, servicio_viejo in enumerate(servicios_viejos):
        if i == 0:
            # Convertir el primero en "Diseño de jardines"
            servicio_viejo.nombre = 'Diseño de jardines'
            servicio_viejo.descripcion = 'Diseño personalizado de espacios verdes. Incluye relevamiento del terreno, propuesta de diseño con plantas y elementos decorativos, y presupuesto detallado.'
            servicio_viejo.tipo = 'diseno'
            servicio_viejo.duracion_estimada = 2
            servicio_viejo.precio = 5000.00
            servicio_viejo.activo = True
            servicio_viejo.save()
            print(f"✅ Actualizado servicio {servicio_viejo.id_servicio} -> {servicio_viejo.nombre}")
        elif i == 1:
            # Convertir el segundo en "Mantenimiento"
            servicio_viejo.nombre = 'Mantenimiento de jardines'
            servicio_viejo.descripcion = 'Servicio de mantenimiento periódico de jardines. Incluye corte de césped, poda de plantas, control de plagas, fertilización y limpieza general.'
            servicio_viejo.tipo = 'mantenimiento'
            servicio_viejo.duracion_estimada = 4
            servicio_viejo.precio = 3000.00
            servicio_viejo.activo = True
            servicio_viejo.save()
            print(f"✅ Actualizado servicio {servicio_viejo.id_servicio} -> {servicio_viejo.nombre}")
        else:
            # Los demás simplemente eliminarlos si no tienen nada asociado
            reservas_count = Reserva.objects.filter(servicio=servicio_viejo).count()
            disenos_count = Diseno.objects.filter(servicio=servicio_viejo).count()
            
            if reservas_count == 0 and disenos_count == 0:
                print(f"❌ Eliminando servicio {servicio_viejo.id_servicio} (sin referencias)")
                servicio_viejo.delete()
            else:
                print(f"⚠️  Manteniendo servicio {servicio_viejo.id_servicio} (tiene {reservas_count} reservas y {disenos_count} diseños)")
                servicio_viejo.activo = False
                servicio_viejo.save()

print("\n📋 Verificando catálogo de servicios...")

# Ya fueron actualizados arriba
print("✅ Catálogo ya configurado")

print("\n" + "="*60)
print("📊 Servicios actuales en el catálogo:")
print("="*60)
servicios = Servicio.objects.filter(activo=True)
for s in servicios:
    print(f"\n🌿 {s.nombre}")
    print(f"   Tipo: {s.get_tipo_display()}")
    print(f"   Precio: ${s.precio}")
    print(f"   Duración: {s.duracion_estimada} horas")
    print(f"   Descripción: {s.descripcion}")

print("\n✅ Catálogo de servicios configurado correctamente")
