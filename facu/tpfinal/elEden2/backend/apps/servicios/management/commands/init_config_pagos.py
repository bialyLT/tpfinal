"""
Comando para inicializar la configuración de pagos
Ejecutar: python manage.py init_config_pagos
"""
from django.core.management.base import BaseCommand
from apps.servicios.models import ConfiguracionPago
from decimal import Decimal


class Command(BaseCommand):
    help = 'Inicializa la configuración de pagos con valores por defecto'

    def handle(self, *args, **options):
        config, created = ConfiguracionPago.objects.get_or_create(
            id=1,
            defaults={
                'monto_sena': Decimal('5000.00'),
                'porcentaje_sena': Decimal('0.00')
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS('✅ Configuración de pagos creada exitosamente')
            )
            if config.porcentaje_sena > 0:
                self.stdout.write(f'   - Tipo: Porcentaje')
                self.stdout.write(f'   - Seña: {config.porcentaje_sena}% del total')
            else:
                self.stdout.write(f'   - Tipo: Monto fijo')
                self.stdout.write(f'   - Seña: ${config.monto_sena}')
        else:
            self.stdout.write(
                self.style.WARNING('⚠️  La configuración de pagos ya existe')
            )
            if config.porcentaje_sena > 0:
                self.stdout.write(f'   - Tipo: Porcentaje')
                self.stdout.write(f'   - Seña: {config.porcentaje_sena}% del total')
            else:
                self.stdout.write(f'   - Tipo: Monto fijo')
                self.stdout.write(f'   - Seña: ${config.monto_sena}')
