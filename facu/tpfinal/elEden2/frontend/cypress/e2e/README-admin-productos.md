# N.º referencia
CP-05

# Título
Admin: CRUD de productos.

# Descripción
Validar la creación, edición y eliminación de productos desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de productos.

# Dependencias
- Categoría, marca y tarea deben existir.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin.
2 | Crear categoría, marca y tarea por API.
3 | Crear producto desde la UI.
4 | Editar el producto creado.
5 | Eliminar el producto creado.
6 | Limpiar datos auxiliares por API.

# Supuestos
Las entidades auxiliares se crean correctamente por API.

# Datos de prueba
- Caso 1: Categoría, marca, tarea y producto con nombres únicos.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: El producto se crea, edita y elimina correctamente; los datos auxiliares se limpian.
