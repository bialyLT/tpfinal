# 🚀 Inicio Rápido - El Edén (Docker)

## 📋 Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y ejecutándose
- Puerto 8000, 5173, 5432, 8025 y 1025 disponibles

## ⚡ Inicio Rápido (3 pasos)

### 1️⃣ Configurar Variables de Entorno

Copia el archivo de ejemplo y edítalo con tus credenciales:

```powershell
# En la raíz del proyecto
copy .env.example .env

# Edita el archivo .env con tus credenciales reales
code .env
```

**Variables importantes a configurar en `.env`:**
- `POSTGRES_PASSWORD`: Cambia "tu_contraseña_segura_aqui" por una contraseña segura
- `DATABASE_URL`: Actualiza con la misma contraseña que pusiste arriba
- `MERCADOPAGO_PUBLIC_KEY`: Tu public key de MercadoPago
- `NGROK_AUTHTOKEN`: (Opcional) Tu token de ngrok si quieres usar túneles

**También configura el backend:**
```powershell
cd backend
copy .env.example .env
# Edita backend/.env con tus credenciales de MercadoPago, Google OAuth, etc.
cd ..
```

### 2️⃣ Iniciar Todos los Servicios

```powershell
# Construir e iniciar todos los contenedores
docker-compose up --build
```

Espera unos minutos mientras se construyen las imágenes y se inician los servicios.

### 3️⃣ Acceder a la Aplicación

Una vez que todos los servicios estén corriendo:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin
- **Mailpit (emails)**: http://localhost:8025
- **PostgreSQL**: localhost:5432

**Credenciales por defecto:**
- Admin: `admin@eleden.com` / `admin123`

## 🔧 Comandos Útiles

### Ver logs de todos los servicios
```powershell
docker-compose logs -f
```

### Ver logs de un servicio específico
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f mailpit
```

### Detener todos los servicios
```powershell
docker-compose down
```

### Detener y eliminar volúmenes (¡CUIDADO! Borra la BD)
```powershell
docker-compose down -v
```

### Reiniciar un servicio específico
```powershell
docker-compose restart backend
docker-compose restart frontend
```

### Acceder a la terminal de un contenedor
```powershell
# Backend (Django shell)
docker-compose exec backend python manage.py shell

# Backend (bash)
docker-compose exec backend bash

# PostgreSQL
docker-compose exec postgres psql -U postgres -d eleden
```

### Ejecutar migraciones manualmente
```powershell
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Crear un nuevo superusuario
```powershell
docker-compose exec backend python manage.py createsuperuser
```

### Recolectar archivos estáticos
```powershell
docker-compose exec backend python manage.py collectstatic --noinput
```

## 🔄 Flujo de Desarrollo

### Desarrollo Normal
```powershell
# 1. Iniciar servicios
docker-compose up

# 2. Hacer cambios en el código
# Los cambios se reflejan automáticamente gracias a los volúmenes

# 3. Ver logs
docker-compose logs -f backend frontend

# 4. Detener cuando termines
docker-compose down
```

### Actualizar Dependencias

**Backend (Python):**
```powershell
# 1. Agrega la dependencia a requirements.txt
# 2. Reconstruye el contenedor
docker-compose up --build backend
```

**Frontend (Node):**
```powershell
# 1. Agrega la dependencia a package.json
# 2. Reconstruye el contenedor
docker-compose up --build frontend
```

### Resetear Base de Datos
```powershell
# ⚠️ CUIDADO: Esto borra TODOS los datos
docker-compose down -v
docker-compose up --build
```

## 🌐 Ngrok (Opcional - Para MercadoPago en producción)

Si necesitas exponer tu aplicación con ngrok para probar MercadoPago:

1. **Instala ngrok**: https://ngrok.com/download

2. **Exponer Frontend:**
   ```powershell
   ngrok http 5173 --host-header="localhost:5173"
   ```
   Copia la URL (ej: `https://abc123.ngrok-free.app`)

3. **Actualizar .env del backend:**
   ```env
   FRONTEND_URL=https://abc123.ngrok-free.app
   ALLOWED_HOSTS=localhost,127.0.0.1,abc123.ngrok-free.app
   ```

4. **Actualizar .env del frontend:**
   ```env
   VITE_API_URL=https://def456.ngrok-free.app
   ```

5. **Reiniciar servicios:**
   ```powershell
   docker-compose restart backend frontend
   ```

## 📊 Estructura de Servicios

```
┌─────────────────────────────────────────────────────┐
│                    Docker Network                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Frontend │→ │ Backend  │→ │PostgreSQL│           │
│  │  :5173   │  │  :8000   │  │  :5432   │           │
│  └──────────┘  └────┬─────┘  └──────────┘           │
│                     ↓                                │
│              ┌──────────┐                            │
│              │ Mailpit  │                            │
│              │  :8025   │                            │
│              └──────────┘                            │
└─────────────────────────────────────────────────────┘
```

## ❓ Solución de Problemas

### Error: "port is already allocated"
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :8000
# Detener todos los contenedores
docker-compose down
# O cambiar el puerto en docker-compose.yml
```

### Error: "Cannot connect to Docker daemon"
- Asegúrate de que Docker Desktop esté ejecutándose

### Los cambios en el código no se reflejan
```powershell
# Reconstruir las imágenes
docker-compose up --build
```

### Error de migraciones de base de datos
```powershell
# Recrear la base de datos
docker-compose down -v
docker-compose up --build
```

### Backend no puede conectarse a PostgreSQL
```powershell
# Verificar que PostgreSQL esté corriendo
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar la conexión
docker-compose exec postgres psql -U postgres -d eleden -c "\dt"
```

### Frontend no puede conectarse al Backend
- Verifica que VITE_API_URL en frontend/.env sea correcta
- Verifica que el backend esté corriendo: `docker-compose logs backend`

## 🎯 Características Incluidas

✅ **Backend (Django):**
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Google OAuth2
- MercadoPago Integration
- Email Service (Mailpit)
- Migraciones automáticas
- Superusuario creado automáticamente

✅ **Frontend (React + Vite):**
- React Router
- Tailwind CSS
- Axios
- Hot Module Replacement (HMR)

✅ **Base de Datos:**
- PostgreSQL 15
- Persistencia de datos con volúmenes
- Backup automático del esquema

✅ **Mailpit:**
- Servidor SMTP de desarrollo
- Interfaz web para ver emails
- No requiere configuración

## 📝 Notas Importantes

1. **Datos Persistentes**: Los datos de PostgreSQL se guardan en un volumen Docker y persisten entre reinicios
2. **Hot Reload**: Los cambios en el código se reflejan automáticamente sin reconstruir
3. **Logs**: Usa `docker-compose logs -f` para ver logs en tiempo real
4. **Performance**: La primera vez tarda más porque descarga imágenes base
5. **Producción**: Esta configuración es para desarrollo, no para producción

## 🆘 Ayuda Adicional

Si necesitas ayuda:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica el estado: `docker-compose ps`
3. Consulta la documentación de Docker: https://docs.docker.com

## 🎉 ¡Listo!

Tu aplicación debería estar corriendo en:
- http://localhost:5173 (Frontend)
- http://localhost:8000 (Backend)
- http://localhost:8025 (Mailpit)

**¡Feliz desarrollo!** 🚀
