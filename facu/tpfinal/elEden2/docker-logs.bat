@echo off
echo ========================================
echo   El Eden - Ver Logs en Tiempo Real
echo ========================================
echo.
echo Presiona Ctrl+C para salir
echo.

docker-compose logs -f %*
