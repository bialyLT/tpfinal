# N.º referencia
CP-10

# Título
Admin: Alta y baja de compras.

# Descripción
Validar la creación y eliminación de compras desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de compras.

# Dependencias
- Categoría, marca, tarea, proveedor y producto deben existir.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin.
2 | Crear categoría, marca, tarea y proveedor por API.
3 | Crear producto desde la UI.
4 | Crear compra desde la UI.
5 | Eliminar la compra creada.
6 | Limpiar datos auxiliares por API.

# Supuestos
La compra actualiza stock y totales correctamente.

# Datos de prueba
- Caso 1: Proveedor y producto con nombres únicos.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: La compra se crea y se elimina correctamente; los datos auxiliares se limpian.
