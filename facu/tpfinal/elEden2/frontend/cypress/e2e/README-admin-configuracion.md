# Admin - Configuracion (admin-configuracion.cy.js)

## Objetivo
- Verificar actualizacion de configuracion y CRUD de objetivos.

## Precondiciones
- Usuario admin valido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

## Pasos automatizados
- Login por API y acceso a /configuracion.
- Actualizar monto de sena.
- Crear objetivo en catalogo.
- Eliminar objetivo creado.

## Datos
- Objetivo con codigo y nombre unicos.

## Variables
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (o E2E_EMAIL / E2E_PASSWORD)
- API_BASE_URL (opcional, default http://localhost:8000/api/v1)
