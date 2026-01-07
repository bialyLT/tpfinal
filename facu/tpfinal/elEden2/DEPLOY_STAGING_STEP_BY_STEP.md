# Deploy Staging (sin tarjeta): Neon + PythonAnywhere + GitHub Pages

Este documento es el paso a paso para desplegar el sistema en un entorno de testing “prod-like”, sin usar ngrok y sin proveedores que pidan tarjeta.

## Arquitectura
- DB: Neon (Postgres)
- Backend: PythonAnywhere (Django)
- Frontend: GitHub Pages (Vite build)

---

## Paso 1 — Neon (DB staging)
1. Crear un proyecto/base en Neon para staging (por ejemplo `eleden-staging`).
2. Copiar el connection string (DATABASE_URL). Debe incluir TLS, por ejemplo:
   - `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`
3. Guardar ese valor: lo vas a usar en PythonAnywhere como `DATABASE_URL`.

Recomendación: crear también una DB “prod” separada aunque sea un TP.

---

## Paso 2 — Backend (PythonAnywhere)
### 2.1 Crear Web App
1. PythonAnywhere → Web → Add a new web app
2. Manual configuration
3. Elegir Python 3.11 (o superior si está disponible)

### 2.2 Subir código
Opción recomendada: `git clone` de tu repo.

### 2.3 Crear venv + instalar deps
1. `python -m venv ~/.virtualenvs/eleden`
2. `source ~/.virtualenvs/eleden/bin/activate`
3. `pip install -r backend/requirements.txt`

### 2.4 Variables de entorno mínimas en PythonAnywhere
Setear estas variables en el entorno (o en el WSGI file):
- `DEBUG=False`
- `SECRET_KEY=...`
- `ALLOWED_HOSTS=<tu-usuario>.pythonanywhere.com`
- `DATABASE_URL=<el de Neon con sslmode=require>`
- `FRONTEND_URL=https://<usuario>.github.io/<repo>/`
- MercadoPago:
  - `MERCADOPAGO_ACCESS_TOKEN=TEST-...`
  - `MERCADOPAGO_PUBLIC_KEY=TEST-...`
- Google (si aplica):
  - `GOOGLE_CLIENT_ID=...`
  - `GOOGLE_CLIENT_SECRET=...`

### 2.5 Migraciones + static
Dentro de `backend/`:
- `python manage.py migrate`
- `python manage.py collectstatic --noinput`

### 2.6 Reiniciar
Web → Reload

---

## Paso 3 — Frontend (GitHub Pages)
### 3.1 Variables de build (GitHub)
Repo → Settings → Secrets and variables → Actions → Variables
Configurar:
- `VITE_API_URL=https://<tu-usuario>.pythonanywhere.com/api/v1`
- `VITE_MERCADOPAGO_PUBLIC_KEY=TEST-...`
- `VITE_GOOGLE_CLIENT_ID=...` (si aplica)
- `VITE_BASE_PATH=/<repo>/` (si el Pages es “project pages”, típico)
- `VITE_USE_HASH_ROUTER=true` (recomendado en Pages para evitar 404 al refrescar)

### 3.2 Activar GitHub Pages
Repo → Settings → Pages
- Source: GitHub Actions

### 3.3 Deploy
Hacer push a `main` y esperar que termine el workflow `Deploy Frontend to GitHub Pages`.

---

## Paso 4 — MercadoPago (staging)
- Verificar que `FRONTEND_URL` (backend) apunte al Pages con HTTPS.
- Probar flujo de pago: MercadoPago debe redirigir a Pages y el frontend debe llamar al backend (PythonAnywhere) para confirmar.

---

## Notas importantes
- El frontend ahora usa `VITE_API_URL` (no queda hardcodeado a localhost).
- Para GitHub Pages es más estable usar HashRouter (`VITE_USE_HASH_ROUTER=true`).
