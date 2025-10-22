import os
import django
import sqlite3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'elEden_api.settings')
django.setup()

# Conectar directamente a la base de datos SQLite
db_path = 'db.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print('\n=== LIMPIANDO DATOS HUÉRFANOS ===\n')

# 1. Verificar imágenes de diseño huérfanas
print('1. Verificando imágenes de diseño huérfanas...')
cursor.execute("""
    SELECT id_imagen_diseno, diseno_id 
    FROM imagen_diseno 
    WHERE diseno_id NOT IN (SELECT id_diseno FROM diseno)
""")
imagenes_huerfanas = cursor.fetchall()

if imagenes_huerfanas:
    print(f'   ⚠️  Encontradas {len(imagenes_huerfanas)} imágenes huérfanas:')
    for img in imagenes_huerfanas:
        print(f'      - Imagen ID: {img[0]}, Diseño ID (inexistente): {img[1]}')
    
    # Eliminar imágenes huérfanas
    cursor.execute("""
        DELETE FROM imagen_diseno 
        WHERE diseno_id NOT IN (SELECT id_diseno FROM diseno)
    """)
    print(f'   ✅ Eliminadas {cursor.rowcount} imágenes huérfanas')
else:
    print('   ✅ No hay imágenes huérfanas')

# 2. Verificar productos de diseño huérfanos
print('\n2. Verificando productos de diseño huérfanos...')
cursor.execute("""
    SELECT id_diseno_producto, diseno_id 
    FROM diseno_producto 
    WHERE diseno_id NOT IN (SELECT id_diseno FROM diseno)
""")
productos_huerfanos = cursor.fetchall()

if productos_huerfanos:
    print(f'   ⚠️  Encontrados {len(productos_huerfanos)} productos huérfanos:')
    for prod in productos_huerfanos:
        print(f'      - Producto ID: {prod[0]}, Diseño ID (inexistente): {prod[1]}')
    
    # Eliminar productos huérfanos
    cursor.execute("""
        DELETE FROM diseno_producto 
        WHERE diseno_id NOT IN (SELECT id_diseno FROM diseno)
    """)
    print(f'   ✅ Eliminados {cursor.rowcount} productos huérfanos')
else:
    print('   ✅ No hay productos huérfanos')

# Confirmar cambios
conn.commit()
print('\n✅ Limpieza completada. Ahora puedes ejecutar las migraciones.\n')

conn.close()
