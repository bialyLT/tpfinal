# N.º referencia
CP-08

# Título
Admin: CRUD de especies.

# Descripción
Validar la creación, edición y eliminación de especies desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de especies.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /especies.
2 | Crear una especie con nombre único.
3 | Editar la especie creada.
4 | Eliminar la especie creada.

# Supuestos
El backend valida nombres únicos para especies.

# Datos de prueba
- Caso 1: Especie con nombre único basado en timestamp.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: La especie se crea, edita y elimina correctamente.
