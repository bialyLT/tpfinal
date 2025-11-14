#!/bin/bash
set -e

echo "Esperando a que PostgreSQL esté listo..."
until pg_isready -h postgres -U postgres > /dev/null 2>&1; do
  >&2 echo "PostgreSQL no está listo - esperando..."
  sleep 2
done

echo "PostgreSQL está listo!"

echo "Ejecutando migraciones..."
python manage.py migrate --noinput

echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput --clear || true

echo "Iniciando servidor Django..."
exec "$@"
