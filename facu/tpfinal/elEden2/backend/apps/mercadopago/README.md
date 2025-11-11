# App MercadoPago

Esta aplicación maneja toda la integración con MercadoPago para el sistema El Edén.

## Estructura

```
apps/mercadopago/
├── __init__.py
├── apps.py
├── views.py          # Vistas de MercadoPago (preferencias, pagos, confirmaciones)
├── urls.py           # URLs de la API de MercadoPago
├── models.py         # Modelos (vacío por ahora, la info se guarda en Reserva)
├── admin.py          # Admin (vacío por ahora)
├── tests.py          # Tests unitarios
└── README.md         # Este archivo
```

## Endpoints

### Pago para Reservas Existentes

- `POST /api/v1/mercadopago/reservas/{id}/crear-pago-sena/` - Crear preferencia para pago de seña
- `POST /api/v1/mercadopago/reservas/{id}/crear-pago-final/` - Crear preferencia para pago final
- `GET /api/v1/mercadopago/reservas/{id}/verificar-pago/` - Verificar estado de pago

### Nuevo Flujo: Pago Primero, Reserva Después

- `POST /api/v1/mercadopago/crear-preferencia-prereserva/` - Crear preferencia ANTES de crear reserva
- `POST /api/v1/mercadopago/crear-reserva-con-pago/` - Crear reserva DESPUÉS de validar pago

## Migración desde apps.servicios

Esta app fue creada moviendo todas las vistas de MercadoPago desde `apps/servicios/views.py` para mejorar la separación de responsabilidades.

### Cambios en el Frontend

Las URLs del frontend se actualizaron de:
```javascript
// ANTES
'/servicios/crear-preferencia-prereserva/'
'/servicios/crear-reserva-con-pago/'

// DESPUÉS
'/mercadopago/crear-preferencia-prereserva/'
'/mercadopago/crear-reserva-con-pago/'
```

### Cambios en el Backend

- ✅ Vistas movidas a `apps/mercadopago/views.py`
- ✅ URLs movidas a `apps/mercadopago/urls.py`
- ✅ App agregada a `INSTALLED_APPS` en `settings.py`
- ✅ URLs incluidas en `elEden_api/urls.py`
- ✅ Referencias eliminadas de `apps/servicios/`

## Dependencias

- `mercadopago` - SDK oficial de MercadoPago
- `apps.servicios` - Para acceder a modelos de Reserva, Servicio, etc.
- `apps.users` - Para acceder a Cliente y Persona
- `apps.emails` - Para enviar confirmaciones de pago

## Configuración

Las credenciales de MercadoPago se configuran en `.env`:

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx
```

El monto de seña se configura en el admin de Django a través del modelo `ConfiguracionPago`.

## Flujos de Pago

### Flujo 1: Reserva Existente (Antiguo)

1. Cliente crea solicitud de servicio → Se crea `Reserva` con estado `pendiente`
2. Cliente hace clic en "Pagar seña" → Llama a `crear-pago-sena`
3. MercadoPago redirige de vuelta → Confirma pago
4. Estado de reserva cambia a `confirmada`

⚠️ **Problema**: Si el cliente abandona el pago, queda una "reserva fantasma"

### Flujo 2: Pago Primero, Reserva Después (Nuevo)

1. Cliente llena formulario de servicio → Datos se guardan en `sessionStorage`
2. Se crea preferencia de pago → `crear-preferencia-prereserva`
3. Cliente paga en MercadoPago
4. MercadoPago redirige a `/reservas/confirmar-prereserva`
5. Frontend llama a `crear-reserva-con-pago` con `payment_id`
6. Backend valida el pago con MercadoPago API
7. **Solo si el pago es válido**: Se crea la reserva con estado `confirmada`
8. Se envía email de confirmación

✅ **Ventaja**: No se crean reservas fantasma, solo se crea si el pago fue exitoso

## Testing

Para ejecutar los tests:

```bash
python manage.py test apps.mercadopago
```

## Documentación Adicional

- [MercadoPago SDK Python](https://github.com/mercadopago/sdk-python)
- [Documentación oficial MercadoPago](https://www.mercadopago.com.ar/developers/es)
