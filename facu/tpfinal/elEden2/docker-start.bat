@echo off
echo ========================================
echo   El Eden - Iniciando con Docker
echo ========================================
echo.

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está instalado o no está en el PATH
    echo Por favor instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [OK] Docker encontrado
echo.

REM Verificar si Docker está corriendo
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está corriendo
    echo Por favor inicia Docker Desktop e intenta nuevamente
    pause
    exit /b 1
)

echo [OK] Docker está corriendo
echo.

REM Verificar si existe el archivo .env
if not exist .env (
    echo [INFO] Creando archivo .env desde .env.docker
    copy .env.docker .env
    echo [IMPORTANTE] Por favor edita el archivo .env con tus credenciales
    echo   - NGROK_AUTHTOKEN
    echo   - MERCADOPAGO_PUBLIC_KEY
    echo.
    pause
)

REM Verificar si existe backend/.env.docker
if not exist backend\.env.docker (
    echo [ERROR] No se encuentra backend/.env.docker
    pause
    exit /b 1
)

echo ========================================
echo   Construyendo contenedores...
echo ========================================
echo.

docker-compose build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo al construir los contenedores
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Iniciando servicios...
echo ========================================
echo.

docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo al iniciar los servicios
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SERVICIOS INICIADOS EXITOSAMENTE
echo ========================================
echo.
echo   Frontend:           http://localhost:5173
echo   Backend:            http://localhost:8000
echo   Admin Django:       http://localhost:8000/admin
echo   Mailpit (emails):   http://localhost:8025
echo   Ngrok Frontend UI:  http://localhost:4040
echo   Ngrok Backend UI:   http://localhost:4041
echo.
echo ========================================
echo.
echo Para ver los logs:     docker-compose logs -f
echo Para detener:          docker-compose down
echo Para ver el estado:    docker-compose ps
echo.
echo Presiona cualquier tecla para ver los logs en tiempo real...
pause >nul

docker-compose logs -f
