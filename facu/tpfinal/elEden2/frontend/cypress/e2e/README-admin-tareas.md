# N.º referencia
CP-03

# Título
Admin: CRUD de tareas.

# Descripción
Validar la creación, edición y eliminación de tareas desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de tareas.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /tareas.
2 | Crear una tarea con nombre, duración y personal mínimo.
3 | Editar la tarea creada.
4 | Eliminar la tarea creada.

# Supuestos
El backend permite alta, edición y baja de tareas.

# Datos de prueba
- Caso 1: Tarea con nombre único basado en timestamp.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: La tarea se crea, edita y elimina correctamente sin errores.
