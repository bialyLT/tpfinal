# N.º referencia
CP-01

# Título
Smoke: Home y redirección en rutas protegidas.

# Descripción
Validar que el home carga correctamente y que las rutas protegidas redirigen a login cuando el usuario no está autenticado.

# Pre-condición
- Frontend disponible.
- BaseUrl de Cypress configurada.

# Referencias
- CU: Acceso al sistema, Navegación general.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Navegar a "/".
2 | Verificar que el home renderiza contenido visible.
3 | Navegar a "/productos" sin iniciar sesión.
4 | Verificar redirección a "/login".

# Supuestos
El sistema responde sin errores en navegación básica.

# Datos de prueba
- Caso 1: Sin sesión iniciada.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: El home se visualiza correctamente y la ruta protegida redirige a login.
