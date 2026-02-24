# N.º referencia
CP-02

# Título
Acceso a Inventario de Productos.

# Descripción
Validar que un usuario con rol empleado o administrador puede acceder a la página de inventario de productos.

# Pre-condición
- Usuario con rol empleado o admin.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Inventario, Productos.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión desde UI con credenciales válidas.
2 | Navegar por el sidebar a Inventario > Productos.
3 | Verificar que se renderiza la página de Inventario de Productos.

# Supuestos
Las credenciales de prueba son válidas.

# Datos de prueba
- Caso 1: Usuario empleado/admin con E2E_EMAIL y E2E_PASSWORD.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: El usuario accede correctamente a Inventario de Productos.
