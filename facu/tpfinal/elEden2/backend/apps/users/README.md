# App Users - Documentación

## Descripción
La aplicación `users` maneja toda la gestión de usuarios, personas, roles y pagos del sistema El Eden.

## Modelos

### Persona
- **Propósito**: Almacena información personal básica
- **Campos principales**: nombres, apellidos, documento, contacto, dirección
- **Relaciones**: Una persona puede tener múltiples usuarios

### Usuario (CustomUser)
- **Propósito**: Extiende el modelo User de Django con funcionalidades adicionales
- **Campos principales**: estado, roles, configuraciones, productos favoritos
- **Relaciones**: 
  - Pertenece a una Persona
  - Tiene múltiples Roles
  - Puede tener múltiples Pagos
  - Tiene una ConfiguracionUsuario

### Rol
- **Propósito**: Extiende los Groups de Django con información adicional
- **Campos principales**: descripción, nivel_acceso, permisos_especiales
- **Relaciones**: Basado en Groups de Django, relacionado con Usuarios

### MetodoPago
- **Propósito**: Define los métodos de pago disponibles
- **Campos principales**: nombre, tipo, comisiones
- **Relaciones**: Relacionado con Pagos

### Pago
- **Propósito**: Registra transacciones de pago
- **Campos principales**: monto, estado, fechas de procesamiento
- **Relaciones**: 
  - Pertenece a un Usuario
  - Usa un MetodoPago
  - Puede tener múltiples Productos a través de DetallePago

### DetallePago
- **Propósito**: Tabla intermedia para productos en un pago
- **Campos principales**: cantidad, precio_unitario, descuentos

### HistorialAcceso
- **Propósito**: Registra accesos de usuarios al sistema
- **Campos principales**: ip_address, user_agent, accion, exitoso

### ConfiguracionUsuario
- **Propósito**: Configuraciones personalizadas por usuario
- **Campos principales**: tema, idioma, notificaciones, preferencias

## Endpoints API

### Personas
- `GET /api/v1/personas/` - Lista todas las personas
- `POST /api/v1/personas/` - Crear nueva persona
- `GET /api/v1/personas/{id}/` - Detalle de persona
- `PUT/PATCH /api/v1/personas/{id}/` - Actualizar persona
- `DELETE /api/v1/personas/{id}/` - Eliminar persona
- `GET /api/v1/personas/buscar_por_documento/?numero=12345678` - Buscar por documento

### Usuarios
- `GET /api/v1/usuarios/` - Lista todos los usuarios
- `POST /api/v1/usuarios/` - Crear nuevo usuario
- `GET /api/v1/usuarios/{id}/` - Detalle de usuario
- `PUT/PATCH /api/v1/usuarios/{id}/` - Actualizar usuario
- `DELETE /api/v1/usuarios/{id}/` - Eliminar usuario
- `GET /api/v1/usuarios/usuarios_activos/` - Solo usuarios activos
- `GET /api/v1/usuarios/administradores/` - Solo administradores
- `POST /api/v1/usuarios/{id}/cambiar_estado/` - Cambiar estado
- `POST /api/v1/usuarios/{id}/resetear_password/` - Forzar cambio de contraseña

### Roles
- `GET /api/v1/roles/` - Lista todos los roles
- `POST /api/v1/roles/` - Crear nuevo rol
- `GET /api/v1/roles/{id}/` - Detalle de rol
- `PUT/PATCH /api/v1/roles/{id}/` - Actualizar rol
- `DELETE /api/v1/roles/{id}/` - Eliminar rol

### Métodos de Pago
- `GET /api/v1/metodos-pago/` - Lista métodos de pago
- `POST /api/v1/metodos-pago/` - Crear método de pago
- `GET /api/v1/metodos-pago/activos/` - Solo métodos activos

### Pagos
- `GET /api/v1/pagos/` - Lista todos los pagos
- `POST /api/v1/pagos/` - Crear nuevo pago
- `GET /api/v1/pagos/{id}/` - Detalle de pago
- `PUT/PATCH /api/v1/pagos/{id}/` - Actualizar pago
- `GET /api/v1/pagos/por_usuario/?usuario_id=1` - Pagos por usuario
- `GET /api/v1/pagos/estadisticas/` - Estadísticas de pagos
- `POST /api/v1/pagos/{id}/completar/` - Completar pago
- `POST /api/v1/pagos/{id}/cancelar/` - Cancelar pago

### Historial de Acceso
- `GET /api/v1/historial-acceso/` - Lista historial de accesos
- `GET /api/v1/historial-acceso/por_usuario/?usuario_id=1` - Por usuario
- `GET /api/v1/historial-acceso/intentos_fallidos/` - Solo intentos fallidos

### Configuraciones
- `GET /api/v1/configuraciones/` - Lista configuraciones
- `PUT/PATCH /api/v1/configuraciones/{id}/` - Actualizar configuración

## Niveles de Acceso

1. **Consulta (1)**: Solo lectura de productos e inventario
2. **Cajero (3)**: Procesamiento de pagos + consulta
3. **Vendedor (5)**: Gestión de productos + pagos + consulta
4. **Gerente (8)**: Gestión de usuarios + todas las anteriores
5. **Administrador (10)**: Acceso completo al sistema

## Comandos de Gestión

```bash
# Crear roles por defecto
python manage.py crear_roles
```

## Estados de Usuario

- **activo**: Usuario puede acceder normalmente
- **inactivo**: Usuario temporalmente deshabilitado
- **suspendido**: Usuario suspendido por razones disciplinarias
- **bloqueado**: Usuario bloqueado por intentos fallidos de login

## Estados de Pago

- **pendiente**: Pago iniciado pero no procesado
- **procesando**: Pago en proceso de verificación
- **completado**: Pago exitoso
- **fallido**: Pago falló
- **cancelado**: Pago cancelado
- **reembolsado**: Pago reembolsado
