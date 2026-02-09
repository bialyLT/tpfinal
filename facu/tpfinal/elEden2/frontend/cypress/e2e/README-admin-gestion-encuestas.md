# Admin - Gestion Encuestas (admin-gestion-encuestas.cy.js)

## Objetivo
- Verificar alta y baja de encuestas desde la UI.

## Precondiciones
- Usuario admin valido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

## Pasos automatizados
- Login por API y acceso a /gestion-encuestas.
- Crear encuesta (inactiva) con una pregunta.
- Eliminar encuesta creada.

## Datos
- Encuesta con titulo unico.

## Variables
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (o E2E_EMAIL / E2E_PASSWORD)
- API_BASE_URL (opcional, default http://localhost:8000/api/v1)
