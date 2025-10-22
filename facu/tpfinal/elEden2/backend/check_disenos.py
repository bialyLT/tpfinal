import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from apps.servicios.models import Diseno, Reserva

print('\n=== DISEÑOS EN LA BASE DE DATOS ===\n')
disenos = Diseno.objects.all()
if not disenos:
    print('❌ No hay diseños en la base de datos')
else:
    for d in disenos:
        print(f'📋 Diseño ID: {d.id_diseno}')
        print(f'   Título: {d.titulo}')
        print(f'   Estado: {d.estado}')
        print(f'   Reserva (FK directo): {d.reserva_id}')
        if d.reserva:
            print(f'   Reserva.id_reserva: {d.reserva.id_reserva}')
            print(f'   Cliente: {d.reserva.cliente.persona.email if d.reserva.cliente else "N/A"}')
        else:
            print(f'   ⚠️  No tiene reserva asociada')
        print()

print('\n=== RESERVAS EN LA BASE DE DATOS ===\n')
reservas = Reserva.objects.all()
if not reservas:
    print('❌ No hay reservas en la base de datos')
else:
    for r in reservas:
        print(f'📌 Reserva ID: {r.id_reserva}')
        print(f'   Cliente: {r.cliente.persona.email if r.cliente else "N/A"}')
        print(f'   Servicio: {r.servicio.nombre if r.servicio else "N/A"}')
        print(f'   Estado: {r.estado}')
        # Verificar si tiene diseño
        diseno = Diseno.objects.filter(reserva=r).first()
        if diseno:
            print(f'   ✅ Tiene diseño: {diseno.titulo} (Estado: {diseno.estado})')
        else:
            print(f'   ❌ No tiene diseño')
        print()
