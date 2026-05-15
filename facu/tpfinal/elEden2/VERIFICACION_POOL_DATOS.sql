# Verificación del Pool de Datos - El Edén

Este archivo contiene consultas SQL para verificar que el pool de datos fue insertado correctamente y respeta todas las restricciones y reglas de negocio.

## 1. VERIFICACIÓN DE INTEGRIDAD REFERENCIAL

### Verificar que todos los Productos tienen Categoría válida
```sql
SELECT p.id_producto, p.nombre, c.nombre_categoria
FROM producto p
LEFT JOIN categoria c ON p.categoria_id = c.id_categoria
WHERE p.activo = TRUE
  AND (c.id_categoria IS NULL OR c.activo = FALSE);
-- Debe devolver: 0 filas
```

### Verificar que todas las Personas tienen documentos válidos
```sql
SELECT p.id_persona, p.nombre, p.apellido, p.nro_documento
FROM persona p
WHERE p.tipo_documento_id NOT IN (SELECT id_tipo_documento FROM tipo_documento)
   OR p.genero_id NOT IN (SELECT id_genero FROM genero)
   OR p.localidad_id NOT IN (SELECT id_localidad FROM localidad);
-- Debe devolver: 0 filas
```

### Verificar que todos los Clientes tienen Persona válida
```sql
SELECT c.id_cliente
FROM cliente c
WHERE c.persona_id NOT IN (SELECT id_persona FROM persona);
-- Debe devolver: 0 filas
```

### Verificar que todos los Empleados tienen Persona válida
```sql
SELECT e.id_empleado
FROM empleado e
WHERE e.persona_id NOT IN (SELECT id_persona FROM persona);
-- Debe devolver: 0 filas
```

### Verificar que todas las Reservas tienen Cliente y Servicio válidos
```sql
SELECT r.id_reserva
FROM reserva r
WHERE r.cliente_id NOT IN (SELECT id_cliente FROM cliente)
   OR r.servicio_id NOT IN (SELECT id_servicio FROM servicio);
-- Debe devolver: 0 filas
```

---

## 2. VERIFICACIÓN DE RESTRICCIONES ÚNICAS

### Verificar emails únicos en Persona
```sql
SELECT email, COUNT(*) as cantidad
FROM persona
GROUP BY email
HAVING COUNT(*) > 1;
-- Debe devolver: 0 filas
```

### Verificar documentos únicos en Persona
```sql
SELECT nro_documento, COUNT(*) as cantidad
FROM persona
GROUP BY nro_documento
HAVING COUNT(*) > 1;
-- Debe devolver: 0 filas
```

### Verificar nombres únicos en Marca
```sql
SELECT nombre_marca, COUNT(*) as cantidad
FROM marca
WHERE activo = TRUE
GROUP BY nombre_marca
HAVING COUNT(*) > 1;
-- Debe devolver: 0 filas
```

### Verificar nombres únicos en Especie
```sql
SELECT nombre_especie, COUNT(*) as cantidad
FROM especie
WHERE activo = TRUE
GROUP BY nombre_especie
HAVING COUNT(*) > 1;
-- Debe devolver: 0 filas
```

### Verificar nombres únicos en Tarea
```sql
SELECT nombre, COUNT(*) as cantidad
FROM tarea
WHERE activo = TRUE
GROUP BY nombre
HAVING COUNT(*) > 1;
-- Debe devolver: 0 filas
```

### Verificar ProductoTarea UNIQUE
```sql
SELECT producto_id, tarea_id, COUNT(*) as cantidad
FROM producto_tarea
GROUP BY producto_id, tarea_id
HAVING COUNT(*) > 1;
-- Debe devolver: 0 filas
```

---

## 3. VERIFICACIÓN DE DATOS POR TABLA

### Contar registros por tabla
```sql
SELECT 'Género' as tabla, COUNT(*) as cantidad FROM genero
UNION ALL SELECT 'Tipo Documento', COUNT(*) FROM tipo_documento
UNION ALL SELECT 'Localidad', COUNT(*) FROM localidad
UNION ALL SELECT 'Categoría', COUNT(*) FROM categoria
UNION ALL SELECT 'Marca', COUNT(*) FROM marca
UNION ALL SELECT 'Especie', COUNT(*) FROM especie
UNION ALL SELECT 'Tarea', COUNT(*) FROM tarea
UNION ALL SELECT 'Producto', COUNT(*) FROM producto
UNION ALL SELECT 'Producto-Tarea', COUNT(*) FROM producto_tarea
UNION ALL SELECT 'Stock', COUNT(*) FROM stock
UNION ALL SELECT 'Persona', COUNT(*) FROM persona
UNION ALL SELECT 'Cliente', COUNT(*) FROM cliente
UNION ALL SELECT 'Empleado', COUNT(*) FROM empleado
UNION ALL SELECT 'Servicio', COUNT(*) FROM servicio
UNION ALL SELECT 'Objetivo Diseño', COUNT(*) FROM objetivo_diseno
UNION ALL SELECT 'Opción Nivel Interv.', COUNT(*) FROM opcion_nivel_intervencion
UNION ALL SELECT 'Opción Presupuesto', COUNT(*) FROM opcion_presupuesto_aproximado
UNION ALL SELECT 'Configuración Pago', COUNT(*) FROM configuracion_pago
UNION ALL SELECT 'Reserva', COUNT(*) FROM reserva
UNION ALL SELECT 'Pago', COUNT(*) FROM pago
ORDER BY tabla;

/* Resultado esperado:
Categoría | 8
Configuración Pago | 1
Empleado | 5
Especie | 15
Género | 4
Localidad | 13
Marca | 10
Objetivo Diseño | 8
Opción Nivel Interv. | 2
Opción Presupuesto | 5
Pago | 8
Persona | 15
Producto | 30
Producto-Tarea | 24
Reserva | 8
Servicio | 8
Stock | 30
Tarea | 15
Tipo Documento | 4
*/
```

---

## 4. VERIFICACIÓN DE DATOS ACTIVOS

### Productos activos por categoría
```sql
SELECT c.nombre_categoria, COUNT(p.id_producto) as cantidad
FROM categoria c
LEFT JOIN producto p ON c.id_categoria = p.categoria_id AND p.activo = TRUE
GROUP BY c.nombre_categoria
ORDER BY cantidad DESC;
```

### Marcas activas
```sql
SELECT COUNT(*) as marcas_activas
FROM marca
WHERE activo = TRUE;
-- Debe devolver: 10
```

### Especies activas
```sql
SELECT COUNT(*) as especies_activas
FROM especie
WHERE activo = TRUE;
-- Debe devolver: 15
```

### Tareas activas
```sql
SELECT COUNT(*) as tareas_activas
FROM tarea
WHERE activo = TRUE;
-- Debe devolver: 15
```

---

## 5. VERIFICACIÓN DE RELACIONES M2M

### Verificar relaciones Producto-Tarea
```sql
SELECT p.nombre as producto, 
       t.nombre as tarea,
       COUNT(*) as cantidad
FROM producto_tarea pt
JOIN producto p ON pt.producto_id = p.id_producto
JOIN tarea t ON pt.tarea_id = t.id_tarea
GROUP BY p.id_producto, t.id_tarea, p.nombre, t.nombre
ORDER BY p.nombre;
```

### Productos sin tareas asociadas
```sql
SELECT p.id_producto, p.nombre
FROM producto p
WHERE NOT EXISTS (
    SELECT 1 FROM producto_tarea WHERE producto_id = p.id_producto
)
AND p.activo = TRUE;
```

---

## 6. VERIFICACIÓN DE STOCK

### Stock bajo (por debajo del mínimo)
```sql
SELECT p.nombre, s.cantidad, s.cantidad_minima,
       (s.cantidad_minima - s.cantidad) as deficit
FROM stock s
JOIN producto p ON s.producto_id = p.id_producto
WHERE s.cantidad < s.cantidad_minima
ORDER BY deficit DESC;
-- Debería estar vacío o con pocos productos en este pool
```

### Productos sin stock
```sql
SELECT p.id_producto, p.nombre
FROM producto p
WHERE NOT EXISTS (
    SELECT 1 FROM stock WHERE producto_id = p.id_producto
);
-- Debe devolver: 0 filas
```

---

## 7. VERIFICACIÓN DE CLIENTES

### Clientes activos por localidad
```sql
SELECT l.nombre_localidad, COUNT(c.id_cliente) as cantidad_clientes
FROM localidad l
LEFT JOIN persona p ON l.id_localidad = p.localidad_id
LEFT JOIN cliente c ON p.id_persona = c.persona_id AND c.activo = TRUE
GROUP BY l.nombre_localidad, l.id_localidad
ORDER BY cantidad_clientes DESC;
```

### Clientes y sus reservas
```sql
SELECT c.id_cliente, 
       CONCAT(p.apellido, ', ', p.nombre) as cliente,
       COUNT(r.id_reserva) as cantidad_reservas
FROM cliente c
JOIN persona p ON c.persona_id = p.id_persona
LEFT JOIN reserva r ON c.id_cliente = r.cliente_id
GROUP BY c.id_cliente, p.apellido, p.nombre
ORDER BY cantidad_reservas DESC;
```

---

## 8. VERIFICACIÓN DE EMPLEADOS

### Empleados activos
```sql
SELECT e.id_empleado, 
       CONCAT(p.apellido, ', ', p.nombre) as empleado,
       e.cargo,
       e.puntuacion_promedio,
       e.activo
FROM empleado e
JOIN persona p ON e.persona_id = p.id_persona
WHERE e.activo = TRUE
ORDER BY e.puntuacion_promedio DESC;
```

### Empleados con bajas puntuaciones
```sql
SELECT e.id_empleado,
       CONCAT(p.apellido, ', ', p.nombre) as empleado,
       e.puntuacion_promedio,
       e.evaluaciones_bajas_consecutivas
FROM empleado e
JOIN persona p ON e.persona_id = p.id_persona
WHERE e.activo = TRUE
  AND e.puntuacion_promedio < 7;
-- Debería estar vacío o con pocos empleados
```

---

## 9. VERIFICACIÓN DE RESERVAS

### Reservas por estado
```sql
SELECT estado, COUNT(*) as cantidad
FROM reserva
GROUP BY estado
ORDER BY cantidad DESC;
```

### Reservas por servicio
```sql
SELECT s.nombre as servicio, COUNT(r.id_reserva) as cantidad_reservas
FROM servicio s
LEFT JOIN reserva r ON s.id_servicio = r.servicio_id
GROUP BY s.id_servicio, s.nombre
ORDER BY cantidad_reservas DESC;
```

### Reservas con fecha de realización nula pero estado completado (inconsistencia)
```sql
SELECT id_reserva, estado, fecha_realizacion, fecha_finalizacion
FROM reserva
WHERE estado = 'completada'
  AND (fecha_realizacion IS NULL OR fecha_finalizacion IS NULL);
-- Debe devolver: 0 filas
```

---

## 10. VERIFICACIÓN DE PAGOS

### Pagos por estado de seña
```sql
SELECT estado_pago_sena, COUNT(*) as cantidad
FROM pago
GROUP BY estado_pago_sena
ORDER BY cantidad DESC;
```

### Pagos inconsistentes (monto_total = 0)
```sql
SELECT id_pago, monto_total, estado_pago_final
FROM pago
WHERE monto_total <= 0;
-- Debe devolver: 0 filas
```

### Ingresos esperados por tipo de servicio
```sql
SELECT s.nombre as servicio,
       COUNT(r.id_reserva) as reservas,
       SUM(p.monto_total) as ingreso_total,
       AVG(p.monto_total) as promedio_servicio
FROM servicio s
LEFT JOIN reserva r ON s.id_servicio = r.servicio_id
LEFT JOIN pago p ON r.id_reserva = p.reserva_id
GROUP BY s.id_servicio, s.nombre
ORDER BY ingreso_total DESC NULLS LAST;
```

---

## 11. VERIFICACIÓN DE OBJETIVOS DE DISEÑO

### Objetivo de diseño por reserva
```sql
SELECT od.nombre as objetivo,
       COUNT(r.id_reserva) as cantidad_reservas
FROM objetivo_diseno od
LEFT JOIN reserva r ON od.id_objetivo_diseno = r.objetivo_diseno_id
WHERE od.activo = TRUE
GROUP BY od.id_objetivo_diseno, od.nombre
ORDER BY cantidad_reservas DESC;
```

---

## 12. VERIFICACIÓN DE PRESUPUESTOS

### Distribución de presupuestos en reservas
```sql
SELECT presupuesto_aproximado,
       COUNT(*) as cantidad,
       AVG(CAST(SUBSTRING(presupuesto_aproximado, 1, 6) AS FLOAT)) as presupuesto_promedio
FROM reserva
WHERE presupuesto_aproximado IS NOT NULL
GROUP BY presupuesto_aproximado
ORDER BY cantidad DESC;
```

---

## 13. VERIFICACIÓN DE LOCALIDADES

### Localidades en zona operacional
```sql
SELECT nombre_provincia, 
       nombre_localidad,
       cp,
       COUNT(p.id_persona) as personas_registradas
FROM localidad l
LEFT JOIN persona p ON l.id_localidad = p.localidad_id
WHERE nombre_provincia IN ('Corrientes', 'Misiones')
GROUP BY l.id_localidad, nombre_provincia, nombre_localidad, cp
ORDER BY nombre_provincia, nombre_localidad;
```

---

## 14. LISTA DE VERIFICACIÓN FINAL

- [ ] Integridad referencial: 0 errores
- [ ] Restricciones únicas: 0 duplicados
- [ ] Todos los productos tienen categoría
- [ ] Todos los clientes tienen persona
- [ ] Todas las reservas tienen cliente y servicio
- [ ] Stock coincide con cantidad de productos
- [ ] Pagos coinciden con reservas
- [ ] Empleados tienen puntuaciones válidas (0-10)
- [ ] Localidades son válidas (Corrientes/Misiones)
- [ ] Géneros y tipos de documento válidos

---

## Nota

Ejecuta estos queries regularmente para asegurar la calidad del pool de datos y detectar inconsistencias tempranamente.
