@echo off
echo ========================================
echo   El Eden - Deteniendo Docker
echo ========================================
echo.

docker-compose down

echo.
echo [OK] Todos los contenedores han sido detenidos
echo.
pause
