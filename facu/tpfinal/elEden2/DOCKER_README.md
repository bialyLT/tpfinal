# Guía de Uso de Docker para El Edén

Esta guía explica cómo ejecutar todo el proyecto usando Docker y Docker Compose.

## 📋 Requisitos Previos

1. **Docker Desktop** instalado y ejecutándose
   - Windows/Mac: [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: Instalar Docker y Docker Compose

2. **Ngrok Auth Token** (opcional, para acceso público)
   - Crear cuenta en [ngrok.com](https://ngrok.com/)
   - Obtener authtoken de [dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Copia el archivo `.env.docker` y edítalo con tus credenciales:

```bash
# En la raíz del proyecto
cp .env.docker .env
```

Edita `.env` y configura:
- `NGROK_AUTHTOKEN`: Tu token de ngrok
- `MERCADOPAGO_PUBLIC_KEY`: Tu clave pública de MercadoPago

### 2. Configurar Backend

Edita `backend/.env.docker` con tus credenciales:
- Google OAuth2 credentials
- MercadoPago access token

### 3. Iniciar Todos los Servicios

```bash
# Construir e iniciar todos los contenedores
docker-compose up --build

# O en modo detached (background)
docker-compose up -d --build
```

Esto iniciará:
- ✅ PostgreSQL (puerto 5432)
- ✅ Mailpit (SMTP: 1025, Web: 8025)
- ✅ Backend Django (puerto 8000)
- ✅ Frontend React (puerto 5173)
- ✅ Ngrok Frontend (Web UI: 4040)
- ✅ Ngrok Backend (Web UI: 4041)

### 4. Acceder a los Servicios

| Servicio | URL Local | Descripción |
|----------|-----------|-------------|
| Frontend | http://localhost:5173 | Aplicación React |
| Backend | http://localhost:8000 | API Django |
| Admin Django | http://localhost:8000/admin | Panel de administración |
| Mailpit Web UI | http://localhost:8025 | Ver emails enviados |
| PostgreSQL | localhost:5432 | Base de datos |
| Ngrok Frontend UI | http://localhost:4040 | URLs públicas frontend |
| Ngrok Backend UI | http://localhost:4041 | URLs públicas backend |

## 📝 Comandos Útiles

### Gestión de Contenedores

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ borra la base de datos)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart backend
```

### Comandos de Django (Backend)

```bash
# Ejecutar comandos en el contenedor backend
docker-compose exec backend python manage.py <comando>

# Crear migraciones
docker-compose exec backend python manage.py makemigrations

# Ejecutar migraciones
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Shell de Django
docker-compose exec backend python manage.py shell

# Acceder al bash del contenedor
docker-compose exec backend bash
```

### Comandos de Base de Datos

```bash
# Conectarse a PostgreSQL
docker-compose exec postgres psql -U postgres -d eleden

# Backup de la base de datos
docker-compose exec postgres pg_dump -U postgres eleden > backup.sql

# Restaurar base de datos
docker-compose exec -T postgres psql -U postgres eleden < backup.sql

# Ver logs de PostgreSQL
docker-compose logs -f postgres
```

### Comandos de Frontend

```bash
# Instalar nuevas dependencias
docker-compose exec frontend npm install <paquete>

# Rebuild del contenedor frontend
docker-compose up -d --build frontend

# Ver logs del frontend
docker-compose logs -f frontend
```

## 🔧 Configuración de Ngrok

### Obtener URLs Públicas

1. **Frontend**: Abre http://localhost:4040
   - Copia la URL HTTPS (ej: `https://abc123.ngrok-free.app`)
   - Actualiza `FRONTEND_URL` en `backend/.env.docker`

2. **Backend**: Abre http://localhost:4041
   - Copia la URL HTTPS (ej: `https://xyz789.ngrok-free.app`)
   - Actualiza `BACKEND_URL` en `backend/.env.docker`
   - Agrégala a `ALLOWED_HOSTS`

3. **Reinicia el backend**:
   ```bash
   docker-compose restart backend
   ```

### Sin Ngrok Auth Token

Si no tienes un auth token de ngrok, los servicios ngrok fallarán pero el resto funcionará normalmente en localhost.

Para desactivar ngrok, comenta las secciones en `docker-compose.yml`:

```yaml
# ngrok-frontend:
#   ...
# ngrok-backend:
#   ...
```

## 🗄️ Gestión de Datos

### Importar Datos desde SQLite

Si tienes datos en SQLite que quieres migrar:

1. **Exportar datos de SQLite** (fuera de Docker):
   ```bash
   cd backend
   python manage.py dumpdata --natural-foreign --natural-primary \
     -e contenttypes -e auth.Permission --indent 4 > datadump.json
   ```

2. **Importar a PostgreSQL en Docker**:
   ```bash
   docker-compose exec backend python manage.py loaddata datadump.json
   ```

### Resetear Base de Datos

```bash
# Detener servicios y eliminar volúmenes
docker-compose down -v

# Iniciar de nuevo (creará base de datos vacía)
docker-compose up -d

# Ejecutar migraciones
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser
```

## 🐛 Solución de Problemas

### Puerto en Uso

Si un puerto está ocupado, puedes cambiarlo en `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Cambiar 8000 por 8001 en tu máquina
```

### Error de Conexión a PostgreSQL

```bash
# Ver logs de postgres
docker-compose logs postgres

# Verificar que el contenedor esté corriendo
docker-compose ps

# Reiniciar postgres
docker-compose restart postgres
```

### Error de Permisos en Windows

Si tienes problemas con permisos de archivos:

1. Ve a Docker Desktop → Settings → Resources → File Sharing
2. Agrega la carpeta del proyecto
3. Aplica y reinicia Docker

### Frontend no Carga Cambios

```bash
# Reconstruir el contenedor
docker-compose up -d --build frontend

# O eliminar node_modules y reinstalar
docker-compose exec frontend rm -rf node_modules
docker-compose exec frontend npm install
```

### Ver Logs Detallados

```bash
# Todos los servicios
docker-compose logs -f

# Solo errores
docker-compose logs -f | grep -i error

# Últimas 100 líneas
docker-compose logs --tail=100
```

## 🔒 Seguridad

⚠️ **Importante para Producción**:

1. Cambia `SECRET_KEY` en `backend/.env.docker`
2. Establece `DEBUG=False`
3. Configura `ALLOWED_HOSTS` correctamente
4. Usa variables de entorno seguras
5. No uses la configuración de Mailpit en producción

## 📊 Monitoreo

### Ver Estado de Contenedores

```bash
# Estado de todos los servicios
docker-compose ps

# Uso de recursos
docker stats

# Información de contenedores
docker-compose top
```

### Healthchecks

Los servicios backend y postgres tienen healthchecks configurados:

```bash
# Ver health status
docker inspect --format='{{.State.Health.Status}}' eleden_backend
docker inspect --format='{{.State.Health.Status}}' eleden_postgres
```

## 🚀 Comandos de Producción

Para producción, considera usar:

```bash
# Usar imagen optimizada de producción
docker-compose -f docker-compose.prod.yml up -d

# Limitar recursos
docker-compose up -d --scale backend=2

# Ver uso de recursos
docker-compose top
```

## 📚 Recursos Adicionales

- [Documentación de Docker Compose](https://docs.docker.com/compose/)
- [Docker para Django](https://docs.docker.com/samples/django/)
- [PostgreSQL en Docker](https://hub.docker.com/_/postgres)
- [Ngrok Documentation](https://ngrok.com/docs)

## ⚡ Tips de Desarrollo

1. **Hot Reload**: Los cambios en código se reflejan automáticamente
2. **Logs en Tiempo Real**: Usa `docker-compose logs -f`
3. **Shell Rápido**: `docker-compose exec backend bash`
4. **Limpieza**: `docker system prune -a` para limpiar imágenes sin usar
