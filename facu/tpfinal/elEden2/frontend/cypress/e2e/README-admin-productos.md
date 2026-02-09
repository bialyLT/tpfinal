# Admin - Productos (admin-productos.cy.js)

## Objetivo
- Verificar el CRUD de productos desde la UI.

## Precondiciones
- Usuario admin valido.
- Backend disponible.
- BaseUrl de Cypress apuntando al frontend.

## Pasos automatizados
- Login por API.
- Crear categoria, marca y tarea por API.
- Crear producto desde la UI.
- Editar producto.
- Eliminar producto.
- Limpiar datos auxiliares (API).

## Datos
- Categoria, marca, tarea y producto con nombres unicos.

## Variables
- E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (o E2E_EMAIL / E2E_PASSWORD)
- API_BASE_URL (opcional, default http://localhost:8000/api/v1)
