# Migración de SQLite a PostgreSQL

Este documento explica cómo migrar tu base de datos de SQLite a PostgreSQL.

## 📋 Requisitos Previos

1. PostgreSQL instalado en tu sistema o acceso a una base de datos PostgreSQL remota
2. Credenciales de acceso a la base de datos PostgreSQL

## 🚀 Pasos para la Migración

### 1. Instalar las Dependencias

Primero, instala las nuevas dependencias de Python:

```bash
cd backend
pip install -r requirements.txt
```

Esto instalará:
- `psycopg2-binary`: Adaptador de PostgreSQL para Python
- `dj-database-url`: Utilidad para parsear URLs de base de datos

### 2. Configurar la Variable de Entorno

Edita tu archivo `.env` en el directorio `backend/` y agrega la variable `DATABASE_URL`:

```env
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/nombre_db
```

**Ejemplos:**

**Base de datos local:**
```env
DATABASE_URL=postgresql://postgres:mipassword@localhost:5432/eleden_db
```

**Base de datos remota (Railway, Render, etc.):**
```env
DATABASE_URL=postgresql://usuario:password@proyecto.railway.app:5432/railway
```

**Nota:** Si no configuras `DATABASE_URL`, el sistema seguirá usando SQLite automáticamente.

### 3. Crear la Base de Datos en PostgreSQL

Conéctate a PostgreSQL y crea la base de datos:

**En Windows (usando psql):**
```bash
psql -U postgres
CREATE DATABASE eleden_db;
\q
```

**En Linux/Mac:**
```bash
sudo -u postgres psql
CREATE DATABASE eleden_db;
\q
```

### 4. Ejecutar las Migraciones

Una vez configurado `DATABASE_URL`, ejecuta las migraciones:

```bash
cd backend
python manage.py migrate
```

Esto creará todas las tablas necesarias en PostgreSQL.

### 5. Migrar los Datos Existentes (Opcional)

Si ya tienes datos en SQLite y quieres migrarlos a PostgreSQL:

#### Opción A: Usando dumpdata/loaddata (Recomendado para bases pequeñas)

1. **Exportar datos de SQLite:**
   ```bash
   # Asegúrate de que DATABASE_URL esté comentado o vacío en .env
   python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 4 > datadump.json
   ```

2. **Configurar PostgreSQL en .env:**
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/eleden_db
   ```

3. **Ejecutar migraciones en PostgreSQL:**
   ```bash
   python manage.py migrate
   ```

4. **Importar datos a PostgreSQL:**
   ```bash
   python manage.py loaddata datadump.json
   ```

#### Opción B: Usando pgloader (Para bases grandes)

1. **Instalar pgloader:**
   - Windows: Descargar desde https://github.com/dimitri/pgloader/releases
   - Linux: `sudo apt-get install pgloader`
   - Mac: `brew install pgloader`

2. **Crear archivo de configuración `migrate.load`:**
   ```
   LOAD DATABASE
        FROM sqlite://backend/db.sqlite3
        INTO postgresql://postgres:password@localhost/eleden_db
   
   WITH include drop, create tables, create indexes, reset sequences
   
   SET work_mem to '16MB', maintenance_work_mem to '512 MB';
   ```

3. **Ejecutar la migración:**
   ```bash
   pgloader migrate.load
   ```

### 6. Crear Superusuario (Si es necesario)

Si partiste desde cero en PostgreSQL, crea un superusuario:

```bash
python manage.py createsuperuser
```

### 7. Verificar la Migración

Inicia el servidor y verifica que todo funcione correctamente:

```bash
python manage.py runserver
```

## 🔄 Volver a SQLite

Si necesitas volver a usar SQLite temporalmente, simplemente comenta o elimina la variable `DATABASE_URL` en tu `.env`:

```env
# DATABASE_URL=postgresql://...
```

El sistema automáticamente volverá a usar SQLite.

## 📝 Estructura de DATABASE_URL

La URL de PostgreSQL sigue este formato:

```
postgresql://[usuario]:[contraseña]@[host]:[puerto]/[nombre_db]
```

**Componentes:**
- `usuario`: Usuario de PostgreSQL (ej: postgres)
- `contraseña`: Contraseña del usuario
- `host`: Dirección del servidor (localhost para local)
- `puerto`: Puerto de PostgreSQL (por defecto: 5432)
- `nombre_db`: Nombre de la base de datos

**Ejemplos comunes:**

```env
# Local
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/eleden_db

# Railway
DATABASE_URL=postgresql://postgres:xYz123...@containers-us-west-1.railway.app:5432/railway

# Render
DATABASE_URL=postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/dbname

# Heroku
DATABASE_URL=postgresql://user:pass@ec2-xx-xx-xx-xx.compute-1.amazonaws.com:5432/d123abc
```

## ⚠️ Notas Importantes

1. **Backup:** Siempre haz un backup de tu base de datos SQLite antes de migrar:
   ```bash
   cp backend/db.sqlite3 backend/db.sqlite3.backup
   ```

2. **Archivos de Media:** Los archivos subidos (imágenes, etc.) no se migran automáticamente. Están en `backend/media/` y se mantienen igual.

3. **Credenciales:** Nunca subas tu archivo `.env` a Git. El archivo `.env.example` es el que debe estar en el repositorio.

4. **Conexiones SSL:** Algunos proveedores requieren SSL. En ese caso, usa:
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

## 🐛 Solución de Problemas

### Error: "FATAL: password authentication failed"
- Verifica que usuario y contraseña sean correctos en DATABASE_URL
- En PostgreSQL local, verifica `pg_hba.conf`

### Error: "could not connect to server"
- Verifica que PostgreSQL esté corriendo: `sudo service postgresql status`
- Verifica el puerto (por defecto 5432)
- Verifica que el host sea correcto

### Error: "database does not exist"
- Crea la base de datos primero: `CREATE DATABASE eleden_db;`

### Error durante loaddata
- Asegúrate de ejecutar `migrate` antes de `loaddata`
- Si hay conflictos, borra los datos de auth: `-e auth -e contenttypes` al hacer dumpdata

## 📚 Recursos Adicionales

- [Documentación oficial de PostgreSQL](https://www.postgresql.org/docs/)
- [Django con PostgreSQL](https://docs.djangoproject.com/en/5.2/ref/databases/#postgresql-notes)
- [pgloader Documentation](https://pgloader.readthedocs.io/)
