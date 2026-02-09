# Admin - Compras (admin-compras.cy.js)

## Objetivo
- Verificar alta y baja de compras desde la UI.

## Precondiciones
- Usuario admin valido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

## Pasos automatizados
- Login por API.
- Crear categoria, marca, tarea y proveedor por API.
- Crear producto desde la UI.
- Crear compra desde la UI.
- Eliminar compra.
- Limpiar datos auxiliares (API).

## Datos
- Proveedor y producto con nombres unicos.

## Variables
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (o E2E_EMAIL / E2E_PASSWORD)
- API_BASE_URL (opcional, default http://localhost:8000/api/v1)
