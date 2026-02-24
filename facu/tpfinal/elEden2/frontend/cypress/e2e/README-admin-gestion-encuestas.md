# N.º referencia
CP-07

# Título
Admin: Gestión de encuestas.

# Descripción
Validar el alta y baja de encuestas desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de encuestas.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /gestion-encuestas.
2 | Crear encuesta inactiva con una pregunta.
3 | Eliminar la encuesta creada.

# Supuestos
Solo puede existir una encuesta activa a la vez.

# Datos de prueba
- Caso 1: Encuesta con título único y una pregunta.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: La encuesta se crea y se elimina correctamente.
