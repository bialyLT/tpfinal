# App de Emails - El Edén

## Descripción
Esta app maneja toda la lógica de envío de correos electrónicos en el sistema.

## Estructura

```
apps/emails/
├── __init__.py          # Exporta EmailService
├── apps.py              # Configuración de la app
├── services.py          # Servicio principal de emails
├── utils.py             # Utilidades auxiliares
├── admin.py
├── models.py
├── tests.py
└── views.py
```

## Servicios Disponibles

### EmailService

Servicio centralizado para el envío de todos los emails del sistema.

#### Métodos:

##### 1. `send_welcome_email(user_email, user_name, username, password=None)`
Envía un email de bienvenida al nuevo cliente registrado.

**Parámetros:**
- `user_email` (str): Email del destinatario
- `user_name` (str): Nombre completo del usuario
- `username` (str): Nombre de usuario
- `password` (str, optional): Contraseña temporal si fue generada automáticamente

**Retorna:** `bool` - True si el email fue enviado exitosamente

**Ejemplo:**
```python
from apps.emails import EmailService

EmailService.send_welcome_email(
    user_email='cliente@example.com',
    user_name='Juan Pérez',
    username='juanperez'
)
```

##### 2. `send_employee_welcome_email(user_email, user_name, username, password)`
Envía un email de bienvenida al nuevo empleado con sus credenciales de acceso.

**Parámetros:**
- `user_email` (str): Email del empleado
- `user_name` (str): Nombre completo del empleado
- `username` (str): Email/usuario para login
- `password` (str): Contraseña generada

**Retorna:** `bool` - True si el email fue enviado exitosamente

**Ejemplo:**
```python
from apps.emails import EmailService

EmailService.send_employee_welcome_email(
    user_email='empleado@example.com',
    user_name='María García',
    username='empleado@example.com',
    password='TempPass123!'
)
```

**Características del email:**
- Incluye credenciales completas (usuario y contraseña)
- Link directo al login (http://localhost:5173/login)
- Mensaje de bienvenida al equipo
- Advertencias de seguridad
- Lista de funcionalidades disponibles para empleados

##### 3. `send_password_reset_email(user_email, user_name, reset_token)`
Envía un email para resetear la contraseña.

**Parámetros:**
- `user_email` (str): Email del destinatario
- `user_name` (str): Nombre completo del usuario
- `reset_token` (str): Token para resetear la contraseña

**Retorna:** `bool` - True si el email fue enviado exitosamente

##### 4. `send_service_confirmation_email(user_email, user_name, service_name, service_date)`
Envía un email de confirmación de servicio.

**Parámetros:**
- `user_email` (str): Email del destinatario
- `user_name` (str): Nombre del cliente
- `service_name` (str): Nombre del servicio
- `service_date` (str): Fecha del servicio

## Uso en el Código

### En la creación de empleados (apps/users/views.py):

```python
from apps.emails import EmailService

# Dentro de EmpleadoViewSet.create()
password_plain = request.data.get('password')
user = serializer.save()

user_name = f"{user.first_name} {user.last_name}".strip()
EmailService.send_employee_welcome_email(
    user_email=user.email,
    user_name=user_name,
    username=user.email,
    password=password_plain
)
```

```python
from apps.emails import EmailService

# Dentro de RegisterView.post()
user_name = f"{user.first_name} {user.last_name}".strip() or user.username
EmailService.send_welcome_email(
    user_email=user.email,
    user_name=user_name,
    username=user.username
)
```

## Configuración

Los emails se configuran en `settings.py`:

### Desarrollo (con Mailpit):
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
```

### Desarrollo (modo consola):
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

### Producción:
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
```

### En el registro de clientes (core/views.py):

```python
from apps.emails import EmailService

# Dentro de RegisterView.post()
user_name = f"{user.first_name} {user.last_name}".strip() or user.username
EmailService.send_welcome_email(
    user_email=user.email,
    user_name=user_name,
    username=user.username
)
```

## Testing con Mailpit

1. Ejecutar Mailpit:
```bash
cd C:\Users\Usuario\Downloads\mailpit-windows-amd64
.\mailpit.exe
```

2. Ver emails en: http://localhost:8025

3. **Probar email de cliente:** Registrar un nuevo cliente desde el frontend

4. **Probar email de empleado:** Crear un nuevo empleado desde el panel de administración (Gestión de Usuarios)

5. Verificar que ambos emails llegaron a Mailpit con sus respectivos contenidos

## Logging

Los emails registran eventos en el logger de Django:
- `INFO`: Email enviado exitosamente
- `ERROR`: Error al enviar email

Ver logs en la consola de Django en modo desarrollo.

## Próximas Mejoras

- [ ] Templates HTML para emails más atractivos
- [ ] Email de confirmación de servicios
- [ ] Email de recordatorio de citas
- [ ] Email de encuestas de satisfacción
- [ ] Email de notificaciones de estado de servicio
