# Admin - Proveedores (admin-proveedores.cy.js)

## Objetivo
- Verificar el CRUD de proveedores desde la UI.

## Precondiciones
- Usuario admin valido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

## Pasos automatizados
- Login por API y acceso a /proveedores.
- Crear proveedor.
- Editar proveedor.
- Eliminar proveedor.

## Datos
- Proveedor con razon social unica y email unico.

## Variables
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (o E2E_EMAIL / E2E_PASSWORD)
- API_BASE_URL (opcional, default http://localhost:8000/api/v1)
