import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Verificar si existe la persona
cursor.execute("""
    SELECT p.email, p.nombre, p.apellido, c.id_cliente 
    FROM persona p 
    LEFT JOIN cliente c ON p.id_persona = c.persona_id 
    WHERE p.email = 'code@gmail.com'
""")
result = cursor.fetchone()

if result:
    print(f"Email: {result[0]}")
    print(f"Nombre: {result[1]}")
    print(f"Apellido: {result[2]}")
    print(f"ID Cliente: {result[3]}")
    if result[3] is None:
        print("\n⚠️ PROBLEMA: Esta persona existe pero NO tiene un registro en la tabla Cliente")
else:
    print("❌ No se encontró ninguna persona con este email")

# Ver todos los clientes
print("\n--- Clientes registrados ---")
cursor.execute("""
    SELECT c.id_cliente, p.email, p.nombre, p.apellido 
    FROM cliente c 
    INNER JOIN persona p ON c.persona_id = p.id_persona
""")
clientes = cursor.fetchall()
for cliente in clientes:
    print(f"ID: {cliente[0]}, Email: {cliente[1]}, Nombre: {cliente[2]} {cliente[3]}")

conn.close()
