# Admin - Especies (admin-especies.cy.js)

## Objetivo
- Verificar el CRUD de especies desde la UI.

## Precondiciones
- Usuario admin valido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

## Pasos automatizados
- Login por API y acceso a /especies.
- Crear especie.
- Editar especie.
- Eliminar especie.

## Datos
- Especie con nombre unico basado en timestamp.

## Variables
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (o E2E_EMAIL / E2E_PASSWORD)
- API_BASE_URL (opcional, default http://localhost:8000/api/v1)
