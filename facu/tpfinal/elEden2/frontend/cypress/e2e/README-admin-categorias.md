# N.º referencia
CP-11

# Título
Admin: CRUD de categorías.

# Descripción
Validar la creación, edición y eliminación de categorías desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de categorías.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /categorias.
2 | Crear una categoría con nombre único.
3 | Editar la categoría creada.
4 | Eliminar la categoría creada.

# Supuestos
El backend valida nombres únicos para categorías.

# Datos de prueba
- Caso 1: Categoría con nombre único basado en timestamp.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: La categoría se crea, edita y elimina correctamente.
