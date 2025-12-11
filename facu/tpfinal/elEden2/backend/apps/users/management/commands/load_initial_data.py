from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import Genero, Localidad, TipoDocumento


class Command(BaseCommand):
    help = "Carga datos de referencia iniciales en la base de datos"

    @transaction.atomic
    def handle(self, *args, **_options):
        self.stdout.write("🚀 Iniciando carga de datos de referencia...\n")

        # Cargar Géneros
        generos = ["Masculino", "Femenino", "Otro", "Prefiero no decir"]
        generos_creados = 0

        for genero_nombre in generos:
            genero, created = Genero.objects.get_or_create(genero=genero_nombre)
            if created:
                generos_creados += 1
                self.stdout.write(f"   ✅ Género creado: {genero_nombre}")
            else:
                self.stdout.write(f"   ℹ️  Género ya existe: {genero_nombre}")

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Géneros: {generos_creados} nuevos, {Genero.objects.count()} total\n")
        )

        # Cargar Tipos de Documento
        tipos_documento = ["DNI", "CUIL", "CUIT", "Pasaporte", "Cédula"]
        tipos_creados = 0

        for tipo_nombre in tipos_documento:
            tipo, created = TipoDocumento.objects.get_or_create(tipo=tipo_nombre)
            if created:
                tipos_creados += 1
                self.stdout.write(f"   ✅ Tipo de documento creado: {tipo_nombre}")
            else:
                self.stdout.write(f"   ℹ️  Tipo de documento ya existe: {tipo_nombre}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Tipos de Documento: {tipos_creados} nuevos, {TipoDocumento.objects.count()} total\n"
            )
        )

        # Cargar Localidades (provincias y localidades principales de Argentina)
        localidades_data = [
            # Buenos Aires
            {
                "cp": "1900",
                "nombre_localidad": "La Plata",
                "nombre_provincia": "Buenos Aires",
            },
            {
                "cp": "7600",
                "nombre_localidad": "Mar del Plata",
                "nombre_provincia": "Buenos Aires",
            },
            {
                "cp": "8000",
                "nombre_localidad": "Bahía Blanca",
                "nombre_provincia": "Buenos Aires",
            },
            {
                "cp": "1000",
                "nombre_localidad": "CABA",
                "nombre_provincia": "Capital Federal",
            },
            # Córdoba
            {
                "cp": "5000",
                "nombre_localidad": "Córdoba",
                "nombre_provincia": "Córdoba",
            },
            {
                "cp": "5800",
                "nombre_localidad": "Río Cuarto",
                "nombre_provincia": "Córdoba",
            },
            # Santa Fe
            {
                "cp": "3000",
                "nombre_localidad": "Santa Fe",
                "nombre_provincia": "Santa Fe",
            },
            {
                "cp": "2000",
                "nombre_localidad": "Rosario",
                "nombre_provincia": "Santa Fe",
            },
            # Mendoza
            {
                "cp": "5500",
                "nombre_localidad": "Mendoza",
                "nombre_provincia": "Mendoza",
            },
            # Tucumán
            {
                "cp": "4000",
                "nombre_localidad": "San Miguel de Tucumán",
                "nombre_provincia": "Tucumán",
            },
            # Salta
            {"cp": "4400", "nombre_localidad": "Salta", "nombre_provincia": "Salta"},
            # Entre Ríos
            {
                "cp": "3100",
                "nombre_localidad": "Paraná",
                "nombre_provincia": "Entre Ríos",
            },
            # Misiones
            {
                "cp": "3300",
                "nombre_localidad": "Posadas",
                "nombre_provincia": "Misiones",
            },
            # Chaco
            {
                "cp": "3500",
                "nombre_localidad": "Resistencia",
                "nombre_provincia": "Chaco",
            },
            # Corrientes
            {
                "cp": "3400",
                "nombre_localidad": "Corrientes",
                "nombre_provincia": "Corrientes",
            },
            # Santiago del Estero
            {
                "cp": "4200",
                "nombre_localidad": "Santiago del Estero",
                "nombre_provincia": "Santiago del Estero",
            },
            # Jujuy
            {
                "cp": "4600",
                "nombre_localidad": "San Salvador de Jujuy",
                "nombre_provincia": "Jujuy",
            },
            # Catamarca
            {
                "cp": "4700",
                "nombre_localidad": "San Fernando del Valle de Catamarca",
                "nombre_provincia": "Catamarca",
            },
            # La Rioja
            {
                "cp": "5300",
                "nombre_localidad": "La Rioja",
                "nombre_provincia": "La Rioja",
            },
            # San Juan
            {
                "cp": "5400",
                "nombre_localidad": "San Juan",
                "nombre_provincia": "San Juan",
            },
            # San Luis
            {
                "cp": "5700",
                "nombre_localidad": "San Luis",
                "nombre_provincia": "San Luis",
            },
            # Neuquén
            {
                "cp": "8300",
                "nombre_localidad": "Neuquén",
                "nombre_provincia": "Neuquén",
            },
            # Río Negro
            {
                "cp": "8500",
                "nombre_localidad": "Viedma",
                "nombre_provincia": "Río Negro",
            },
            {
                "cp": "8400",
                "nombre_localidad": "San Carlos de Bariloche",
                "nombre_provincia": "Río Negro",
            },
            # Chubut
            {"cp": "9100", "nombre_localidad": "Trelew", "nombre_provincia": "Chubut"},
            {
                "cp": "9000",
                "nombre_localidad": "Comodoro Rivadavia",
                "nombre_provincia": "Chubut",
            },
            # Santa Cruz
            {
                "cp": "9400",
                "nombre_localidad": "Río Gallegos",
                "nombre_provincia": "Santa Cruz",
            },
            # Tierra del Fuego
            {
                "cp": "9410",
                "nombre_localidad": "Ushuaia",
                "nombre_provincia": "Tierra del Fuego",
            },
            # Formosa
            {
                "cp": "3600",
                "nombre_localidad": "Formosa",
                "nombre_provincia": "Formosa",
            },
            # La Pampa
            {
                "cp": "6300",
                "nombre_localidad": "Santa Rosa",
                "nombre_provincia": "La Pampa",
            },
        ]

        localidades_creadas = 0

        for loc_data in localidades_data:
            localidad, created = Localidad.objects.get_or_create(
                cp=loc_data["cp"],
                defaults={
                    "nombre_localidad": loc_data["nombre_localidad"],
                    "nombre_provincia": loc_data["nombre_provincia"],
                },
            )
            if created:
                localidades_creadas += 1
                self.stdout.write(
                    f'   ✅ Localidad creada: {loc_data["nombre_localidad"]}, {loc_data["nombre_provincia"]}'
                )
            else:
                self.stdout.write(
                    f'   ℹ️  Localidad ya existe: {loc_data["nombre_localidad"]}, {loc_data["nombre_provincia"]}'
                )

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Localidades: {localidades_creadas} nuevas, {Localidad.objects.count()} total\n")
        )

        self.stdout.write(self.style.SUCCESS("\n🎉 Carga de datos de referencia completada exitosamente!\n"))
