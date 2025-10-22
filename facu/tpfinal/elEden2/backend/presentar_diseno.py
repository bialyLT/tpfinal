import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from apps.servicios.models import Diseno

print('\n=== PRESENTANDO DISEÑO ===\n')

# Buscar un diseño en borrador
diseno = Diseno.objects.filter(estado='borrador').first()

if diseno:
    print(f'📋 Diseño encontrado:')
    print(f'   ID: {diseno.id_diseno}')
    print(f'   Título: {diseno.titulo}')
    print(f'   Estado actual: {diseno.estado}')
    print(f'   Reserva ID: {diseno.reserva.id_reserva if diseno.reserva else "N/A"}')
    
    # Cambiar a presentado
    diseno.presentar()
    print(f'\n✅ Diseño cambiado a estado: {diseno.estado}')
    print(f'   Fecha de presentación: {diseno.fecha_presentacion}')
    
    if diseno.reserva:
        print(f'   Estado de la reserva: {diseno.reserva.estado}')
else:
    print('❌ No se encontraron diseños en borrador')
