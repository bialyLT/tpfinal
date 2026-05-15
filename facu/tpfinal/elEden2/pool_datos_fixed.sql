-- POOL DE DATOS (FIXED) - EL EDÉN
-- Versión no destructiva: usa ON CONFLICT DO NOTHING para evitar errores por datos ya existentes
-- Correcciones: nombres de columnas ("tipoProducto"), tabla de pagos (pago_reserva), UUIDs válidos

-- 1. TABLA: GENERO
INSERT INTO genero (id_genero, genero) VALUES
(1, 'Masculino'),
(2, 'Femenino'),
(3, 'Otro'),
(4, 'Prefiero no especificar')
ON CONFLICT (id_genero) DO NOTHING;

-- 2. TABLA: TIPO_DOCUMENTO
INSERT INTO tipo_documento (id_tipo_documento, tipo) VALUES
(1, 'DNI'),
(2, 'Pasaporte'),
(3, 'Cédula de Identidad'),
(4, 'RUT')
ON CONFLICT (id_tipo_documento) DO NOTHING;

-- 3. TABLA: LOCALIDAD
INSERT INTO localidad (id_localidad, cp, nombre_localidad, nombre_provincia, nombre_pais, latitud, longitud) VALUES
(1, '3400', 'Corrientes', 'Corrientes', 'Argentina', -27.4814, -58.8343),
(2, '3500', 'Goya', 'Corrientes', 'Argentina', -27.4839, -58.6751),
(3, '3600', 'Paso de la Cruz', 'Corrientes', 'Argentina', -27.3616, -58.7223),
(4, '3700', 'Esquina', 'Corrientes', 'Argentina', -30.2294, -58.6197),
(5, '3800', 'Ituzaingó', 'Corrientes', 'Argentina', -27.5833, -56.5167),
(6, '3900', 'Oberá', 'Corrientes', 'Argentina', -27.4840, -55.1240),
(7, '4000', 'Mercedes', 'Corrientes', 'Argentina', -29.1747, -58.0711),
(8, '3300', 'Posadas', 'Misiones', 'Argentina', -25.5951, -55.5049),
(9, '3370', 'Garupá', 'Misiones', 'Argentina', -25.5167, -55.5167),
(10, '3360', 'Candelaria', 'Misiones', 'Argentina', -25.3950, -55.5014),
(11, '3400', 'Eldorado', 'Misiones', 'Argentina', -26.4342, -54.6144),
(12, '3500', 'Puerto Iguazú', 'Misiones', 'Argentina', -25.5951, -54.5775),
(13, '3550', 'Oberá (Misiones)', 'Misiones', 'Argentina', -27.4840, -55.1240)
ON CONFLICT (id_localidad) DO NOTHING;

-- 4. TABLA: CATEGORIA
INSERT INTO categoria (id_categoria, nombre_categoria, descripcion, activo, fecha_baja) VALUES
(1, 'Plantas y Flores', 'Plantas vivas para jardines y espacios verdes', TRUE, NULL),
(2, 'Semillas', 'Semillas de diferentes variedades para siembra', TRUE, NULL),
(3, 'Fertilizantes y Abonos', 'Productos para nutrición de plantas', TRUE, NULL),
(4, 'Herramientas de Jardín', 'Herramientas para mantenimiento y cultivo', TRUE, NULL),
(5, 'Decoración de Jardín', 'Elementos decorativos para embellecer espacios', TRUE, NULL),
(6, 'Sistemas de Riego', 'Mangueras, aspersores y sistemas de riego', TRUE, NULL),
(7, 'Control de Plagas', 'Insecticidas, fungicidas y pesticidas', TRUE, NULL),
(8, 'Sustratos y Tierras', 'Tierras, compost y sustratos especializados', TRUE, NULL)
ON CONFLICT (id_categoria) DO NOTHING;

-- 5. TABLA: MARCA
INSERT INTO marca (id_marca, nombre_marca, descripcion, activo, fecha_baja) VALUES
(1, 'Bayer', 'Productos químicos y agroquímicos de calidad premium', TRUE, NULL),
(2, 'BASF', 'Soluciones para agricultura y jardinería', TRUE, NULL),
(3, 'Syngenta', 'Fungicidas, insecticidas y herbicidas', TRUE, NULL),
(4, 'Fertilandia', 'Fertilizantes locales de origen argentino', TRUE, NULL),
(5, 'Compo', 'Abonos y sustratos especializados', TRUE, NULL),
(6, 'Milstein', 'Herramientas de jardinería profesionales', TRUE, NULL),
(7, 'Bahco', 'Herramientas de precisión para jardín', TRUE, NULL),
(8, 'Fiskars', 'Herramientas innovadoras para jardinería', TRUE, NULL),
(9, 'Floratil', 'Plantas ornamentales de calidad', TRUE, NULL),
(10, 'Vivero Santa Rita', 'Vivero local con plantas adaptadas al clima', TRUE, NULL)
ON CONFLICT (id_marca) DO NOTHING;

-- 6. TABLA: ESPECIE
-- Usar ON CONFLICT por nombre único (evita errores si ya existe la misma especie con distinto id)
INSERT INTO especie (id_especie, nombre_especie, descripcion, activo, fecha_baja) VALUES
(1, 'Rosa', 'Flores clásicas de variados colores', TRUE, NULL),
(2, 'Jazmín', 'Planta trepadora aromática', TRUE, NULL),
(3, 'Lavanda', 'Planta aromática con flores violetas', TRUE, NULL),
(4, 'Hortensia', 'Arbusto con flores abundantes', TRUE, NULL),
(5, 'Begonia', 'Planta ornamental de interior y exterior', TRUE, NULL),
(6, 'Palmera', 'Planta tropical de follaje', TRUE, NULL),
(7, 'Bambú', 'Planta de crecimiento rápido para cercos verdes', TRUE, NULL),
(8, 'Geranio', 'Flor tradicional, fácil de cultivar', TRUE, NULL),
(9, 'Margarita', 'Flor silvestre y cultivada', TRUE, NULL),
(10, 'Lirio', 'Flor elegante de variados colores', TRUE, NULL),
(11, 'Petunia', 'Flor colorida de floración prolongada', TRUE, NULL),
(12, 'Pino', 'Árbol conífera de crecimiento lento', TRUE, NULL),
(13, 'Arce', 'Árbol caducifolio con follaje colorido en otoño', TRUE, NULL),
(14, 'Magnolia', 'Árbol ornamental con flores grandes', TRUE, NULL),
(15, 'Enredadera de Clemátide', 'Planta trepadora con flores violetas', TRUE, NULL)
ON CONFLICT DO NOTHING;

-- 7. TABLA: TAREA
INSERT INTO tarea (id_tarea, nombre, duracion_base, cantidad_personal_minimo, activo, fecha_baja) VALUES
(1, 'Excavación y Nivelación', 480, 2, TRUE, NULL),
(2, 'Preparación del Suelo', 360, 1, TRUE, NULL),
(3, 'Siembra de Plantas', 240, 1, TRUE, NULL),
(4, 'Instalación de Riego', 360, 2, TRUE, NULL),
(5, 'Colocación de Grama', 300, 2, TRUE, NULL),
(6, 'Construcción de Canteros', 240, 2, TRUE, NULL),
(7, 'Instalación de Caminos', 480, 2, TRUE, NULL),
(8, 'Poda y Mantenimiento', 180, 1, TRUE, NULL),
(9, 'Tratamiento de Plagas', 120, 1, TRUE, NULL),
(10, 'Colocación de Mulch/Corteza', 180, 1, TRUE, NULL),
(11, 'Construcción de Pérgolas', 600, 2, TRUE, NULL),
(12, 'Instalación de Luminarias', 240, 1, TRUE, NULL),
(13, 'Limpieza General', 120, 1, TRUE, NULL),
(14, 'Plantación de Árboles', 240, 2, TRUE, NULL),
(15, 'Creación de Estanques', 480, 3, TRUE, NULL)
ON CONFLICT (id_tarea) DO NOTHING;

-- 8. TABLA: PRODUCTO (nota: campo db_column="tipoProducto")
-- Nota: el modelo `Producto` tiene campos `fecha_creacion` y `fecha_actualizacion` NOT NULL
INSERT INTO producto (id_producto, nombre, descripcion, precio, imagen, "tipoProducto", categoria_id, marca_id, especie_id, activo, fecha_baja, fecha_creacion, fecha_actualizacion) VALUES
(1, 'Fertilizante NPK 10-10-10', 'Fertilizante balanceado para plantas en general', 450.00, NULL, TRUE, 3, 4, NULL, TRUE, NULL, NOW(), NOW()),
(2, 'Herbicida Glifosato 480 SL', 'Herbicida sistémico para malezas', 280.00, NULL, TRUE, 7, 2, NULL, TRUE, NULL, NOW(), NOW()),
(3, 'Fungicida Azufre en Polvo', 'Control de hongos en plantas', 320.00, NULL, TRUE, 7, 1, NULL, TRUE, NULL, NOW(), NOW()),
(4, 'Compost Premium 40L', 'Compost de excelente calidad para macetas', 180.00, NULL, TRUE, 8, 5, NULL, TRUE, NULL, NOW(), NOW()),
(5, 'Tierra Fértil 50L', 'Tierra negra para siembra y trasplante', 150.00, NULL, TRUE, 8, 5, NULL, TRUE, NULL, NOW(), NOW()),
(6, 'Pala de Jardín Acero', 'Pala de acero inoxidable para labores de jardín', 250.00, NULL, TRUE, 4, 6, NULL, TRUE, NULL, NOW(), NOW()),
(7, 'Manguera de Riego 30m', 'Manguera resistente para riego', 320.00, NULL, TRUE, 6, 2, NULL, TRUE, NULL, NOW(), NOW()),
(8, 'Aspersor Automático', 'Aspersor con regulador de presión', 480.00, NULL, TRUE, 6, 5, NULL, TRUE, NULL, NOW(), NOW()),
(9, 'Semillas de Lechuga Variadas', 'Mix de semillas de lechuga', 50.00, NULL, TRUE, 2, 4, NULL, TRUE, NULL, NOW(), NOW()),
(10, 'Semillas de Tomate Híbrido', 'Tomate resistente a plagas', 120.00, NULL, TRUE, 2, 3, NULL, TRUE, NULL, NOW(), NOW()),
(11, 'Mulch de Corteza 20L', 'Mulch para cobertura del suelo', 90.00, NULL, TRUE, 8, 5, NULL, TRUE, NULL, NOW(), NOW()),
(12, 'Insecticida Piretrina 2.5%', 'Insecticida natural de amplio espectro', 290.00, NULL, TRUE, 7, 1, NULL, TRUE, NULL, NOW(), NOW()),
(13, 'Maceta Cerámica 30cm', 'Maceta decorativa de cerámica', 180.00, NULL, TRUE, 5, 10, NULL, TRUE, NULL, NOW(), NOW()),
(14, 'Luminaria Solar LED', 'Luminaria para iluminación de jardín', 420.00, NULL, TRUE, 5, 8, NULL, TRUE, NULL, NOW(), NOW()),
(15, 'Rastrillo de Hojas Profesional', 'Rastrillo resistente para limpieza', 220.00, NULL, TRUE, 4, 7, NULL, TRUE, NULL, NOW(), NOW()),
(16, 'Rosa Roja', 'Rosa roja de tallo largo', 35.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Rosa' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(17, 'Jazmín Blanco', 'Jazmín aromático para enredaderas', 45.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Jazmín' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(18, 'Lavanda Morada', 'Lavanda aromática de floración abundante', 30.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Lavanda' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(19, 'Hortensia Azul', 'Hortensia con flores azules', 55.00, NULL, FALSE, 1, 9, (SELECT id_especie FROM especie WHERE nombre_especie = 'Hortensia' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(20, 'Begonia Roja', 'Begonia con flores rojas intensas', 25.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Begonia' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(21, 'Palmera Areca', 'Palmera tropical para espacios amplios', 120.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Palmera' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(22, 'Bambú Verde', 'Bambú para cercos y privacidad', 80.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Bambú' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(23, 'Geranio Rojo', 'Geranio con flores rojas brillantes', 20.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Geranio' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(24, 'Margarita Blanca', 'Margarita silvestre blanca', 15.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Margarita' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(25, 'Lirio Amarillo', 'Lirio de flores amarillas', 50.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Lirio' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(26, 'Petunia Violeta', 'Petunia con flores violetas', 22.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Petunia' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(27, 'Pino Gruezudo', 'Pino de crecimiento lento', 350.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Pino' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(28, 'Arce Japonés', 'Arce ornamental de follaje rojo', 400.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Arce' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(29, 'Magnolia Blanca', 'Magnolia con flores grandes y blancas', 450.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Magnolia' LIMIT 1), TRUE, NULL, NOW(), NOW()),
(30, 'Clemátide Violeta', 'Clemátide trepadora violeta', 65.00, NULL, FALSE, 1, 10, (SELECT id_especie FROM especie WHERE nombre_especie = 'Enredadera de Clemátide' LIMIT 1), TRUE, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 9. TABLA: PRODUCTO_TAREA
INSERT INTO producto_tarea (id_producto_tarea, producto_id, tarea_id) VALUES
(1, 2, 2),(2, 3, 8),(3, 4, 2),(4, 5, 2),(5, 6, 1),(6, 7, 4),(7, 8, 4),(8, 9, 3),(9, 10, 3),(10, 11, 10),(11, 12, 9),(12, 14, 12),(13, 15, 13),(14, 16, 3),(15, 17, 3),(16, 18, 3),(17, 19, 3),(18, 20, 3),(19, 22, 6),(20, 23, 3),(21, 24, 3),(22, 27, 14),(23, 28, 14),(24, 29, 14)
ON CONFLICT DO NOTHING;

-- 10. TABLA: STOCK
-- El modelo `Stock` solo contiene `id_stock`, `producto_id` y `cantidad`.
INSERT INTO stock (id_stock, producto_id, cantidad) VALUES
(1, 1, 50),(2, 2, 30),(3, 3, 25),(4, 4, 100),(5, 5, 150),(6, 6, 20),(7, 7, 15),(8, 8, 10),(9, 9, 200),(10, 10, 100),(11, 11, 80),(12, 12, 40),(13, 13, 35),(14, 14, 25),(15, 15, 30),(16, 16, 60),(17, 17, 45),(18, 18, 80),(19, 19, 35),(20, 20, 70),(21, 21, 12),(22, 22, 25),(23, 23, 90),(24, 24, 120),(25, 25, 55),(26, 26, 100),(27, 27, 8),(28, 28, 6),(29, 29, 5),(30, 30, 40)
ON CONFLICT DO NOTHING;

-- 11. TABLA: PERSONA
INSERT INTO persona (id_persona, user_id, nombre, apellido, email, telefono, calle, numero, piso, dpto, nro_documento, genero_id, tipo_documento_id, localidad_id, fecha_creacion, fecha_actualizacion) VALUES
(1, NULL, 'Juan', 'García', 'juan.garcia@email.com', '3794123456', 'Calle Principal', '100', NULL, NULL, '12345678', 1, 1, 1, NOW(), NOW()),
(2, NULL, 'María', 'López', 'maria.lopez@email.com', '3794654321', 'Avenida Libertad', '250', '2', 'A', '87654321', 2, 1, 1, NOW(), NOW()),
(3, NULL, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '3758234567', 'Calle San Martín', '500', NULL, NULL, '23456789', 1, 1, 2, NOW(), NOW()),
(4, NULL, 'Ana', 'Martínez', 'ana.martinez@email.com', '3754567890', 'Av. Corrientes', '1200', '3', 'B', '34567890', 2, 1, 8, NOW(), NOW()),
(5, NULL, 'Roberto', 'Hernández', 'roberto.h@email.com', '3755678901', 'Calle Florida', '800', NULL, NULL, '45678901', 1, 1, 9, NOW(), NOW()),
(6, NULL, 'Laura', 'Gómez', 'laura.gomez@email.com', '3756789012', 'Pasaje Verde', '150', '1', 'A', '56789012', 2, 1, 10, NOW(), NOW()),
(7, NULL, 'Fernando', 'Pérez', 'fernando.perez@email.com', '3757890123', 'Avenida Roca', '600', NULL, NULL, '67890123', 1, 1, 3, NOW(), NOW()),
(8, NULL, 'Gabriela', 'Diaz', 'gabriela.diaz@email.com', '3758901234', 'Calle Entre Ríos', '350', '2', NULL, '78901234', 2, 1, 11, NOW(), NOW()),
(9, NULL, 'Miguel', 'Núñez', 'miguel.nunez@email.com', '3759012345', 'Avenida Colón', '900', NULL, NULL, '89012345', 1, 1, 4, NOW(), NOW()),
(10, NULL, 'Sofía', 'Torres', 'sofia.torres@email.com', '3750123456', 'Calle Mitre', '450', '4', 'C', '90123456', 2, 1, 12, NOW(), NOW()),
(11, NULL, 'Diego', 'Vargas', 'diego.vargas@eleden.com', '3794111111', 'Calle Jardín', '200', NULL, NULL, '11111111', 1, 1, 1, NOW(), NOW()),
(12, NULL, 'Patricia', 'Ruiz', 'patricia.ruiz@eleden.com', '3794222222', 'Avenida Verde', '500', '1', 'A', '22222222', 2, 1, 1, NOW(), NOW()),
(13, NULL, 'Andrés', 'Cabrera', 'andres.cabrera@eleden.com', '3794333333', 'Pasaje Flores', '100', NULL, NULL, '33333333', 1, 1, 2, NOW(), NOW()),
(14, NULL, 'Valeria', 'Castro', 'valeria.castro@eleden.com', '3758444444', 'Calle Rosada', '750', '2', 'B', '44444444', 2, 1, 8, NOW(), NOW()),
(15, NULL, 'Javier', 'Rojas', 'javier.rojas@eleden.com', '3755555555', 'Avenida Principal', '1000', NULL, NULL, '55555555', 1, 1, 9, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 12. TABLA: CLIENTE
-- Evitar error por unique(persona_id) ya existente
INSERT INTO cliente (id_cliente, persona_id, fecha_registro, activo, observaciones) VALUES
(1, 1, NOW(), TRUE, 'Cliente activo, primer jardín en proyecto'),
(2, 2, NOW(), TRUE, 'Solicita diseño minimalista'),
(3, 3, NOW(), TRUE, NULL),
(4, 4, NOW(), TRUE, 'Requiere riego automatizado'),
(5, 5, NOW(), TRUE, NULL),
(6, 6, NOW(), TRUE, 'Interesada en plantas aromáticas'),
(7, 7, NOW(), TRUE, NULL),
(8, 8, NOW(), TRUE, 'Necesita cerco verde con bambú'),
(9, 9, NOW(), TRUE, NULL),
(10, 10, NOW(), TRUE, 'Cliente VIP - Múltiples servicios')
ON CONFLICT DO NOTHING;

-- 13. TABLA: EMPLEADO
-- Evitar error por unique(persona_id) ya existente en empleado
INSERT INTO empleado (id_empleado, persona_id, fecha_contratacion, activo, cargo, observaciones, puntuacion_acumulada, puntuacion_cantidad, puntuacion_promedio, fecha_ultima_puntuacion, evaluaciones_bajas_consecutivas, fecha_baja_automatica, motivo_baja_automatica)
VALUES
(1, 11, NOW() - INTERVAL '365 days', TRUE, 'Diseñador Paisajista', 'Especialista en diseños modernos', 95.50, 12, 7.96, NOW(), 0, NULL, NULL),
(2, 12, NOW() - INTERVAL '240 days', TRUE, 'Jardinera', 'Experta en plantas ornamentales', 88.75, 10, 8.88, NOW(), 0, NULL, NULL),
(3, 13, NOW() - INTERVAL '180 days', TRUE, 'Operario', 'Especialista en excavación y nivelación', 75.25, 8, 9.41, NOW(), 0, NULL, NULL),
(4, 14, NOW() - INTERVAL '120 days', TRUE, 'Diseñadora', 'Enfoque en espacios sostenibles', 92.00, 11, 8.36, NOW(), 0, NULL, NULL),
(5, 15, NOW() - INTERVAL '60 days', TRUE, 'Técnico de Riego', 'Experto en sistemas automatizados', 85.50, 9, 9.50, NOW(), 0, NULL, NULL)
ON CONFLICT DO NOTHING;

-- 14. TABLA: SERVICIO
INSERT INTO servicio (id_servicio, nombre, descripcion, activo, reprogramable_por_clima) VALUES
(1, 'Diseño de Jardín', 'Diseño profesional de espacios verdes desde cero', TRUE, FALSE),
(2, 'Remodelación de Jardín', 'Transformación y mejora de jardines existentes', TRUE, FALSE),
(3, 'Instalación de Riego', 'Sistema de riego automatizado o manual', TRUE, TRUE),
(4, 'Mantenimiento Regular', 'Cuidado periódico del jardín (poda, limpieza)', TRUE, TRUE),
(5, 'Control de Plagas', 'Tratamiento integrado de plagas y enfermedades', TRUE, TRUE),
(6, 'Paisajismo Sostenible', 'Diseño ecológico y sustentable', TRUE, FALSE),
(7, 'Instalación de Grama', 'Colocación de césped natural o artificial', TRUE, TRUE),
(8, 'Construcción de Estructuras', 'Pérgolas, caminos, estanques', TRUE, FALSE)
ON CONFLICT (id_servicio) DO NOTHING;

-- 15. TABLA: OBJETIVO_DISENO
INSERT INTO objetivo_diseno (id_objetivo_diseno, codigo, nombre, activo, fecha_baja) VALUES
(1, 'RELAJACION', 'Espacio de relajación y meditación', TRUE, NULL),
(2, 'ENTRETENIMIENTO', 'Espacio para entretenimiento familiar', TRUE, NULL),
(3, 'PRODUCCION', 'Huerta o jardín productivo', TRUE, NULL),
(4, 'DECORACION', 'Enfoque ornamental y decorativo', TRUE, NULL),
(5, 'SOSTENIBILIDAD', 'Jardín ecológico y sostenible', TRUE, NULL),
(6, 'PRIVACIDAD', 'Crear espacios privados y cerrados', TRUE, NULL),
(7, 'MINIMALISMO', 'Diseño moderno y minimalista', TRUE, NULL),
(8, 'TRADICIONAL', 'Estilo clásico y tradicional', TRUE, NULL)
ON CONFLICT (id_objetivo_diseno) DO NOTHING;

-- 16. TABLA: OPCION_NIVEL_INTERVENCION
INSERT INTO opcion_nivel_intervencion (id_opcion_nivel, codigo, nombre, valor, activo, fecha_baja, orden) VALUES
(1, 'DESDE_CERO', 'Desde Cero - Terreno Virgen', TRUE, TRUE, NULL, 1),
(2, 'REMODELACION', 'Remodelación - Terreno Existente', FALSE, TRUE, NULL, 2)
ON CONFLICT (id_opcion_nivel) DO NOTHING;

-- 17. TABLA: OPCION_PRESUPUESTO_APROXIMADO
INSERT INTO opcion_presupuesto_aproximado (id_opcion_presupuesto, codigo, nombre, activo, fecha_baja, orden) VALUES
(1, 'MINIMO', 'Mínimo: $10.000 - $25.000', TRUE, NULL, 1),
(2, 'BAJO', 'Bajo: $25.000 - $50.000', TRUE, NULL, 2),
(3, 'MEDIO', 'Medio: $50.000 - $100.000', TRUE, NULL, 3),
(4, 'ALTO', 'Alto: $100.000 - $250.000', TRUE, NULL, 4),
(5, 'PREMIUM', 'Premium: +$250.000', TRUE, NULL, 5)
ON CONFLICT (id_opcion_presupuesto) DO NOTHING;

-- 18. TABLA: CONFIGURACION_PAGO
INSERT INTO configuracion_pago (id, monto_sena) VALUES
(1, 5000.00)
ON CONFLICT (id) DO NOTHING;

-- 19. TABLA: RESERVA (reemplazadas UUIDs por UUIDs válidos)
INSERT INTO reserva (
    id_reserva, fecha_solicitud, fecha_cita, fecha_realizacion, fecha_inicio,
    fecha_finalizacion, estado, observaciones, direccion, localidad_servicio_id,
    superficie_aproximada, nivel_intervencion, presupuesto_aproximado,
    objetivo_diseno_id, servicio_id, cliente_id, alerta_clima_payload, requiere_reprogramacion, encuesta_token
) VALUES
(1, NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days', 'completada', 'Diseño moderno con plantas ornamentales', 'Calle Principal 100', 1, 200.00, TRUE, 'MEDIO', 7, 1, 1, '{}', FALSE, 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7a8'),
(2, NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', 'completada', 'Remodelación con énfasis en riego automático', 'Avenida Libertad 250', 1, 150.00, FALSE, 'ALTO', 5, 3, 2, '{}', FALSE, 'b2c3d4e5-f6a7-4890-b123-c4d5e6f7a8b9'),
(3, NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', NULL, NULL, NULL, 'confirmada', 'Solicitud de instalación de sistema de riego', 'Calle San Martín 500', 2, 100.00, NULL, 'BAJO', NULL, 3, 3, '{}', FALSE, 'c3d4e5f6-a7b8-4901-c234-d5e6f7a8b9c0'),
(4, NOW() - INTERVAL '10 days', NOW() + INTERVAL '5 days', NULL, NULL, NULL, 'pendiente', 'Diseño ecológico para terraza', 'Av. Corrientes 1200', 8, 50.00, TRUE, 'MINIMO', 5, 6, 4, '{}', FALSE, 'd4e5f6a7-b8c9-4012-d345-e6f7a8b9c0d1'),
(5, NOW() - INTERVAL '5 days', NOW() + INTERVAL '15 days', NULL, NULL, NULL, 'pendiente', 'Huerta orgánica en terreno de 200m2', 'Calle Florida 800', 9, 200.00, TRUE, 'MEDIO', 3, 2, 5, '{}', FALSE, 'e5f6a7b8-c9d0-4123-e456-f7a8b9c0d1e2'),
(6, NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NULL, NULL, NULL, 'pendiente', 'Proyecto completo de remodelación', 'Pasaje Verde 150', 10, 300.00, FALSE, 'PREMIUM', 1, 1, 6, '{}', FALSE, 'f6a7b8c9-d0e1-4234-a567-b8c9d0e1f2a3'),
(7, NOW(), NOW() + INTERVAL '45 days', NULL, NULL, NULL, 'pendiente', 'Cerco verde con bambú para privacidad', 'Calle Entre Ríos 350', 11, 80.00, TRUE, 'BAJO', 6, 8, 8, '{}', FALSE, 'a7b8c9d0-e1f2-4345-a678-b9c0d1e2f3a4'),
(8, NOW() - INTERVAL '1 days', NOW() + INTERVAL '60 days', NULL, NULL, NULL, 'pendiente', 'Diseño minimalista con fuente de agua', 'Avenida Colón 900', 4, 120.00, TRUE, 'ALTO', 7, 1, 9, '{}', FALSE, 'b8c9d0e1-f2a3-4456-b789-c0d1e2f3a4b5')
ON CONFLICT DO NOTHING;

-- 20. TABLA: PAGO (table name: pago_reserva)
INSERT INTO pago_reserva (
    id_pago, reserva_id, monto_sena, estado_pago_sena,
    payment_id_sena, fecha_pago_sena, monto_total,
    estado_pago_final, payment_id_final, fecha_pago_final, estado_pago
) VALUES
(1, 1, 5000.00, 'sena_pagada', 'MP-123456789', NOW() - INTERVAL '25 days', 50000.00, 'pagado', 'MP-123456790', NOW() - INTERVAL '17 days', 'pagado'),
(2, 2, 5000.00, 'sena_pagada', 'MP-123456791', NOW() - INTERVAL '15 days', 75000.00, 'pagado', 'MP-123456792', NOW() - INTERVAL '7 days', 'pagado'),
(3, 3, 5000.00, 'sena_pagada', 'MP-123456793', NOW() - INTERVAL '5 days', 35000.00, 'pendiente', NULL, NULL, 'pendiente'),
(4, 4, 5000.00, 'pendiente_pago_sena', NULL, NULL, 15000.00, 'pendiente', NULL, NULL, 'pendiente'),
(5, 5, 5000.00, 'pendiente_pago_sena', NULL, NULL, 60000.00, 'pendiente', NULL, NULL, 'pendiente'),
(6, 6, 5000.00, 'pendiente_pago_sena', NULL, NULL, 350000.00, 'pendiente', NULL, NULL, 'pendiente'),
(7, 7, 5000.00, 'pendiente_pago_sena', NULL, NULL, 28000.00, 'pendiente', NULL, NULL, 'pendiente'),
(8, 8, 5000.00, 'pendiente_pago_sena', NULL, NULL, 120000.00, 'pendiente', NULL, NULL, 'pendiente')
ON CONFLICT DO NOTHING;

-- FIN
