@echo off
echo ========================================
echo   Crear Superusuario en Docker
echo ========================================
echo.

docker-compose exec backend python manage.py createsuperuser

echo.
pause
