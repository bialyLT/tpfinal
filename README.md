### Pasos

1. Clonar el repositorio:

```bash
git clone https://github.com/bialyLT/dise-oweb
cd dise-oweb
```
2. Instalar las dependencias 

```bash
pip3 install -r requirements.txt
npm install
```
3. Creamos las migraciones

```bash
python manage.py makemigrations
python manage.py migrate
```

4. Ejecutamos el proyecto

```bash
// Esto dejamos ejecutando en otra consola para que funcione tailwind:
.\app\tailwindcss.exe
npx tailwindcss -i ./app/static/css/input.css -o ./app/static/css/output.css --watch

// Con este comando ejecutamos
python manage.py runserver
```