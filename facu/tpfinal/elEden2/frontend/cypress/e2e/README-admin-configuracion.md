# N.º referencia
CP-09

# Título
Admin: Configuración y objetivos.

# Descripción
Validar la actualización de configuración de pagos y el CRUD de objetivos desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Configuración del sistema, Objetivos de diseño.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /configuracion.
2 | Actualizar el monto de seña.
3 | Crear un objetivo en el catálogo con código y nombre únicos.
4 | Eliminar el objetivo creado.

# Supuestos
El usuario admin tiene permisos para actualizar configuración.

# Datos de prueba
- Caso 1: Objetivo con código y nombre únicos.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: Se actualiza el monto de seña y el objetivo se crea/elimina correctamente.
