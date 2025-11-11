# 🌿 El Edén - Sistema de Gestión de Vivero

Sistema completo de gestión para viveros con Django REST Framework + React + PostgreSQL.

## 🚀 Inicio Rápido con Docker (Recomendado)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado y corriendo

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd elEden2
   ```

2. **Configurar variables de entorno**
   ```bash
   # Copiar archivo de ejemplo
   copy .env.docker .env
   
   # Editar .env y configurar:
   # - NGROK_AUTHTOKEN (opcional)
   # - MERCADOPAGO_PUBLIC_KEY
   ```

3. **Iniciar con Docker**
   
   **Opción A - Script automático (Windows):**
   ```bash
   docker-start.bat
   ```
   
   **Opción B - Comandos manuales:**
   ```bash
   docker-compose up --build -d
   ```

4. **Crear superusuario**
   ```bash
   docker-create-superuser.bat
   # O manualmente:
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Acceder a la aplicación**
   - 🌐 Frontend: http://localhost:5173
   - 🔧 Backend API: http://localhost:8000
   - 👨‍💼 Admin Django: http://localhost:8000/admin
   - 📧 Mailpit (emails): http://localhost:8025

### Detener servicios
```bash
docker-stop.bat
# O manualmente:
docker-compose down
```

📚 **Documentación completa**: Ver [DOCKER_README.md](DOCKER_README.md)

---

## 🛠️ Instalación Manual (Sin Docker)

### Requisitos
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (o SQLite para desarrollo)

### Backend

1. **Crear entorno virtual**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

2. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar variables de entorno**
   ```bash
   copy .env.example .env
   # Editar .env con tus credenciales
   ```

4. **Migrar base de datos**
   ```bash
   python manage.py migrate
   ```

5. **Crear superusuario**
   ```bash
   python manage.py createsuperuser
   ```

6. **Iniciar servidor**
   ```bash
   python manage.py runserver
   ```

### Frontend

1. **Instalar dependencias**
   ```bash
   cd frontend
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   copy .env.example .env
   # Editar .env
   ```

3. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

### PostgreSQL (Opcional)

Ver [POSTGRESQL_MIGRATION.md](backend/POSTGRESQL_MIGRATION.md) para instrucciones detalladas.

---

## 📖 Estructura del Proyecto

```
elEden2/
├── backend/               # Django REST Framework
│   ├── apps/             # Aplicaciones Django
│   │   ├── productos/    # Gestión de productos
│   │   ├── servicios/    # Servicios y reservas
│   │   ├── users/        # Usuarios y autenticación
│   │   ├── ventas/       # Gestión de ventas
│   │   ├── encuestas/    # Sistema de encuestas
│   │   ├── emails/       # Servicio de emails
│   │   └── mercadopago/  # Integración de pagos
│   ├── elEden_api/       # Configuración principal
│   └── manage.py         # CLI de Django
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── services/     # Servicios API
│   │   └── contexts/     # Contextos React
│   └── package.json
├── docker-compose.yml    # Configuración Docker
└── README.md            # Este archivo
```

---

## 🔧 Tecnologías

### Backend
- Django 5.2
- Django REST Framework
- PostgreSQL / SQLite
- JWT Authentication
- MercadoPago SDK
- Mailpit (emails de desarrollo)

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Lucide Icons

### DevOps
- Docker & Docker Compose
- Ngrok (túneles públicos)
- PostgreSQL

---

## 📚 Documentación Adicional

- [DOCKER_README.md](DOCKER_README.md) - Guía completa de Docker
- [POSTGRESQL_MIGRATION.md](backend/POSTGRESQL_MIGRATION.md) - Migración a PostgreSQL
- [backend/.env.example](backend/.env.example) - Variables de entorno backend
- [frontend/.env.example](frontend/.env.example) - Variables de entorno frontend

---

## 🔑 Credenciales de Prueba

### MercadoPago (Sandbox)
Las credenciales de prueba se configuran en el archivo `.env`

### Usuarios del Sistema
Después de crear el superusuario, puedes acceder al admin en:
http://localhost:8000/admin

---

## 🐛 Solución de Problemas

### Docker
Ver [DOCKER_README.md - Solución de Problemas](DOCKER_README.md#-solución-de-problemas)

### PostgreSQL
Ver [POSTGRESQL_MIGRATION.md - Solución de Problemas](backend/POSTGRESQL_MIGRATION.md#-solución-de-problemas)

### Frontend no Carga
```bash
# Limpiar caché y reinstalar
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend - Error de Migraciones
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

---

## 📝 Scripts Disponibles

### Windows
- `docker-start.bat` - Iniciar todos los servicios
- `docker-stop.bat` - Detener todos los servicios
- `docker-create-superuser.bat` - Crear superusuario

### Comandos Docker
```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de servicios
docker-compose ps

# Reiniciar un servicio
docker-compose restart backend

# Acceder a la shell de Django
docker-compose exec backend python manage.py shell

# Ejecutar tests
docker-compose exec backend python manage.py test
```

---

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 📞 Soporte

Para soporte y preguntas:
- 📧 Email: soporte@eleden.com
- 📖 Documentación: [DOCKER_README.md](DOCKER_README.md)
- 🐛 Issues: Abre un issue en GitHub

---

**¡Hecho con 💚 por el equipo de El Edén!**
