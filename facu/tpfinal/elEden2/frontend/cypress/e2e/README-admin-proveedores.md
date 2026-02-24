# N.º referencia
CP-04

# Título
Admin: CRUD de proveedores.

# Descripción
Validar la creación, edición y eliminación de proveedores desde la interfaz administrativa.

# Pre-condición
- Usuario admin válido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

# Referencias
- CU: Gestión de proveedores.

# Dependencias
Ninguna.

# Pasos de prueba
N° | Acción
1 | Iniciar sesión por API con credenciales admin y acceder a /proveedores.
2 | Crear un proveedor con razón social y email únicos.
3 | Editar el proveedor creado.
4 | Eliminar el proveedor creado.

# Supuestos
El backend valida emails únicos para proveedores.

# Datos de prueba
- Caso 1: Proveedor con razón social única y email único.

# Tipo de prueba
Automatizada.

# Resultado esperado de prueba
- Caso 1: El proveedor se crea, edita y elimina correctamente.
