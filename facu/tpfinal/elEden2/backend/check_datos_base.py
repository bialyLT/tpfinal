import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Verificar Géneros
print("=== GÉNEROS ===")
cursor.execute("SELECT * FROM genero")
generos = cursor.fetchall()
if generos:
    for g in generos:
        print(f"ID: {g[0]}, Género: {g[1]}")
else:
    print("⚠️ No hay géneros registrados")

# Verificar Tipos de Documento
print("\n=== TIPOS DE DOCUMENTO ===")
cursor.execute("SELECT * FROM tipo_documento")
tipos_doc = cursor.fetchall()
if tipos_doc:
    for t in tipos_doc:
        print(f"ID: {t[0]}, Tipo: {t[1]}")
else:
    print("⚠️ No hay tipos de documento registrados")

# Verificar Localidades
print("\n=== LOCALIDADES (primeras 5) ===")
cursor.execute("SELECT * FROM localidad LIMIT 5")
localidades = cursor.fetchall()
if localidades:
    for l in localidades:
        print(f"ID: {l[0]}, CP: {l[1]}, Localidad: {l[2]}, Provincia: {l[3]}")
else:
    print("⚠️ No hay localidades registradas")

conn.close()
