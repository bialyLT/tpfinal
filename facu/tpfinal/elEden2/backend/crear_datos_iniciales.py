"""
Script para crear datos iniciales en las tablas de referencia
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

from apps.users.models import Genero, TipoDocumento, Localidad

print("Creando datos iniciales...")

# Crear Géneros
generos_data = [
    {'genero': 'Masculino'},
    {'genero': 'Femenino'},
    {'genero': 'Otro'},
    {'genero': 'Prefiero no decir'}
]

for g in generos_data:
    genero, created = Genero.objects.get_or_create(**g)
    if created:
        print(f"✓ Género creado: {genero.genero}")
    else:
        print(f"- Género ya existe: {genero.genero}")

# Crear Tipos de Documento
tipos_doc_data = [
    {'tipo': 'DNI'},
    {'tipo': 'Pasaporte'},
    {'tipo': 'CUIT'},
    {'tipo': 'CUIL'}
]

for t in tipos_doc_data:
    tipo, created = TipoDocumento.objects.get_or_create(**t)
    if created:
        print(f"✓ Tipo de documento creado: {tipo.tipo}")
    else:
        print(f"- Tipo de documento ya existe: {tipo.tipo}")

# Crear Localidades (algunas de ejemplo)
localidades_data = [
    {'cp': '1000', 'nombre_localidad': 'Buenos Aires', 'nombre_provincia': 'Buenos Aires'},
    {'cp': '5000', 'nombre_localidad': 'Córdoba', 'nombre_provincia': 'Córdoba'},
    {'cp': '2000', 'nombre_localidad': 'Rosario', 'nombre_provincia': 'Santa Fe'},
    {'cp': '4000', 'nombre_localidad': 'San Miguel de Tucumán', 'nombre_provincia': 'Tucumán'},
    {'cp': '5500', 'nombre_localidad': 'Mendoza', 'nombre_provincia': 'Mendoza'},
    {'cp': '3400', 'nombre_localidad': 'Corrientes', 'nombre_provincia': 'Corrientes'},
    {'cp': '4400', 'nombre_localidad': 'Salta', 'nombre_provincia': 'Salta'},
    {'cp': '8000', 'nombre_localidad': 'Bahía Blanca', 'nombre_provincia': 'Buenos Aires'},
    {'cp': '0000', 'nombre_localidad': 'Sin especificar', 'nombre_provincia': 'Sin especificar'}
]

for l in localidades_data:
    localidad, created = Localidad.objects.get_or_create(**l)
    if created:
        print(f"✓ Localidad creada: {localidad.nombre_localidad}, {localidad.nombre_provincia}")
    else:
        print(f"- Localidad ya existe: {localidad.nombre_localidad}, {localidad.nombre_provincia}")

print("\n✅ Datos iniciales creados correctamente")
