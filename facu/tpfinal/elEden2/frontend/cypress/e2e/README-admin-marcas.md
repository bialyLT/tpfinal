# N.º referencia
CP-06

# Título
Admin: CRUD de marcas.

# Descripción
Validar la creación, edición y eliminación de marcas desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de marcas.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /marcas.
2 | Crear una marca con nombre único.
3 | Editar la marca creada.
4 | Eliminar la marca creada.

# Supuestos
El backend valida nombres únicos para marcas.

# Datos de prueba
- Caso 1: Marca con nombre único basado en timestamp.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: La marca se crea, edita y elimina correctamente.
