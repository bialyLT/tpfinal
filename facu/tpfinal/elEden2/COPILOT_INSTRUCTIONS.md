# 🌿 Instrucciones del Sistema - El Edén (Jardinería)

## Flujo Principal: Aprobación de Diseños por Clientes

### Contexto del Sistema
El sistema gestiona servicios de jardinería con un flujo completo desde la solicitud hasta la ejecución:

1. **Cliente** solicita un servicio (crea una Reserva)
2. **Empleado/Diseñador** crea un Diseño para esa reserva
3. **Cliente** revisa y aprueba/rechaza el diseño ⭐ **FUNCIONALIDAD CRÍTICA**
4. Si se acepta: Stock se descuenta automáticamente y servicio pasa a "En Curso"
5. Si se rechaza: Reserva vuelve a "Pendiente" para nuevo diseño

---

## Estados de Reserva

```
pendiente → confirmada → en_curso → completada
            ↓            ↑
         cancelada    (si cliente acepta diseño)
```

### Estados explicados:
- **pendiente**: Recién solicitada, esperando diseño
- **confirmada**: Diseño presentado al cliente
- **en_curso**: Cliente aceptó diseño, servicio ejecutándose
- **completada**: Servicio finalizado
- **cancelada**: Cliente o sistema canceló

---

## Estados de Diseño

```
borrador → presentado → aceptado/rechazado
                ↓
            revision
```

### Estados explicados:
- **borrador**: Empleado creando diseño
- **presentado**: Enviado a cliente, esperando decisión ⭐ **CRÍTICO**
- **aceptado**: Cliente aprobó (stock descontado)
- **rechazado**: Cliente no aprobó (vuelve a pendiente)
- **revision**: Cliente pidió cambios

---

## Funcionalidad de Aprobación de Diseños

### Backend (`apps/servicios/views.py`)

#### Endpoint: `aceptar_cliente`
```python
POST /api/v1/servicios/disenos/{id}/aceptar_cliente/
```

**Flujo:**
1. Verifica que diseño esté en estado "presentado"
2. Valida stock disponible para TODOS los productos
3. Si hay stock suficiente:
   - Descuenta cantidad de cada producto del Stock
   - Cambia diseño a "aceptado"
   - Cambia reserva a "en_curso" ⭐
4. Si falta stock: devuelve error con detalles

#### Endpoint: `rechazar_cliente`
```python
POST /api/v1/servicios/disenos/{id}/rechazar_cliente/
Body: { "feedback": "Razón del rechazo..." }
```

**Flujo:**
1. Verifica que diseño esté en estado "presentado"
2. Cambia diseño a "rechazado"
3. Guarda feedback en `observaciones_cliente` (temporal)
4. Cambia reserva a "pendiente" ⭐
5. Empleado puede crear nuevo diseño

### Frontend

#### Página: `MisDisenosPage.jsx` (Solo Clientes)
**Ruta:** `/mis-disenos`

**Características:**
- Lista todos los diseños del cliente
- Destaca diseños "presentados" (pendientes de aprobación)
- Stats: Pendientes, Aceptados, Rechazados
- Cards visuales con información clave

#### Modal de Detalle con Decisión
- Muestra diseño completo (descripción, presupuesto, productos, imágenes)
- Botones de acción:
  - **Aceptar**: Descuenta stock → En Curso
  - **Rechazar**: Abre modal de feedback

#### Modal de Feedback
- Textarea obligatorio para feedback
- Feedback NO se guarda en DB aún (futuro: campo dedicado)
- Por ahora va a `observaciones_cliente`

---

## Permisos y Acceso

### Clientes
- ✅ Ver sus propias reservas
- ✅ Ver diseños de sus reservas
- ✅ Aceptar/Rechazar diseños presentados
- ❌ No ven diseños de otros clientes
- ❌ No pueden crear diseños

### Empleados/Diseñadores
- ✅ Ver todas las reservas
- ✅ Ver solo sus diseños creados
- ✅ Crear diseños para reservas
- ✅ Presentar diseños a clientes
- ❌ No pueden aceptar/rechazar (es decisión del cliente)

### Administradores
- ✅ Ver TODO (reservas, diseños, empleados)
- ✅ Gestión completa del sistema
- ✅ Columna extra: quién hizo cada diseño

---

## Modelos de Datos

### Reserva
```python
estado = CharField(choices=[
    'pendiente',   # Inicial
    'confirmada',  # Diseño presentado
    'en_curso',    # Cliente aceptó ⭐
    'completada',  # Servicio terminado
    'cancelada'    # Cancelado
])
```

### Diseno
```python
estado = CharField(choices=[
    'borrador',    # Creando
    'presentado',  # Esperando cliente ⭐
    'aceptado',    # Cliente aprobó
    'rechazado',   # Cliente rechazó
    'revision'     # Cambios solicitados
])

# Relaciones
reserva = FK(Reserva, nullable)  # A qué reserva pertenece
disenador = FK(Empleado)         # Quién lo creó
```

### DisenoProducto
```python
# M2M entre Diseno y Producto
cantidad = IntegerField()
precio_unitario = DecimalField()
```

### Stock (en app productos)
```python
# Se descuenta al aceptar diseño
producto = FK(Producto)
cantidad = IntegerField()  # ⭐ SE MODIFICA AQUÍ
cantidad_minima = IntegerField()
```

---

## Flujo Completo Ejemplo

1. **Cliente "Juan"** solicita servicio "Diseño de jardines"
   - Crea Reserva #5, estado: `pendiente`

2. **Empleado "María"** crea diseño para Reserva #5
   - Diseño #10, estado: `borrador`
   - Agrega productos: 20 plantas, 5 macetas
   - Sube imágenes de referencia

3. **María** presenta diseño
   - Diseño #10 → `presentado`
   - Reserva #5 → `confirmada`
   - Juan recibe notificación (futuro)

4. **Juan** revisa en `/mis-disenos`
   - Ve diseño destacado como "Pendiente"
   - Abre detalle, revisa productos e imágenes
   - **OPCIÓN A: Acepta**
     - Sistema valida stock (20 plantas ✅, 5 macetas ✅)
     - Descuenta: plantas (50→30), macetas (15→10)
     - Diseño #10 → `aceptado`
     - Reserva #5 → `en_curso` ⭐
   - **OPCIÓN B: Rechaza**
     - Escribe feedback: "Prefiero plantas más pequeñas"
     - Diseño #10 → `rechazado`
     - Reserva #5 → `pendiente` ⭐
     - María puede crear nuevo diseño

---

## Consideraciones Técnicas

### Transacciones Atómicas
- `aceptar_cliente` usa `@transaction.atomic`
- Si falla descuento de stock, rollback completo
- Garantiza consistencia de datos

### Validación de Stock
- Se valida ANTES de descontar
- Si falta stock: error HTTP 400 con detalles
- Cliente ve mensaje claro de qué falta

### Futuras Mejoras
- [ ] Campo `feedback` dedicado en modelo Diseno
- [ ] Historial de cambios (auditoría)
- [ ] Notificaciones push/email
- [ ] Chat entre cliente y diseñador
- [ ] Versiones de diseño (revisiones)

---

## Rutas Importantes

### Backend
```
POST /api/v1/servicios/disenos/{id}/aceptar_cliente/
POST /api/v1/servicios/disenos/{id}/rechazar_cliente/
GET  /api/v1/servicios/disenos/  (filtrado por usuario)
GET  /api/v1/servicios/disenos/{id}/
```

### Frontend
```
/mis-disenos           - Cliente: ver y decidir sobre diseños
/disenos               - Empleado/Admin: gestión de diseños
/mis-servicios         - Cliente: ver reservas
/servicios             - Empleado/Admin: gestión de reservas
```

---

## Componentes Clave

### Backend
- `DisenoViewSet.aceptar_cliente()` - Aprobación con descuento
- `DisenoViewSet.rechazar_cliente()` - Rechazo con feedback
- `DisenoViewSet.get_queryset()` - Filtrado por rol
- `Diseno.aceptar()` - Lógica de modelo
- `Diseno.rechazar()` - Lógica de modelo

### Frontend
- `MisDisenosPage.jsx` - Vista principal cliente
- `DisenoDetalleModal` - Modal con botones acción
- `FeedbackModal` - Modal de rechazo
- `DisenoCard` - Card visual de diseño

---

## Testing Checklist

- [ ] Cliente ve solo sus diseños
- [ ] Empleado ve solo sus diseños creados
- [ ] Admin ve todos los diseños
- [ ] Aceptar diseño descuenta stock correcto
- [ ] Rechazar diseño vuelve reserva a pendiente
- [ ] Validación de stock funciona correctamente
- [ ] Feedback se guarda temporalmente
- [ ] Estados cambian correctamente
- [ ] Transacciones atómicas funcionan
- [ ] UI es clara y amigable

---

## Notas de Implementación

### Feedback del Cliente
**IMPORTANTE:** El feedback actualmente se guarda en `observaciones_cliente` del modelo `Diseno`. En el futuro, crear:
- Campo dedicado `feedback_rechazo`
- Tabla de historial `DisenoFeedback`
- Múltiples rondas de revisión

### Stock
- Se descuenta SOLO al aceptar diseño
- No se reserva durante "presentado"
- Si falta stock al aceptar: error y no se acepta
- Considerar agregar sistema de reserva de stock futuro

---

**Última actualización:** 2025-10-21
**Versión del sistema:** 1.0
**Desarrolladores:** Copilot + Usuario
