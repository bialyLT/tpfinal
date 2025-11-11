# Usar Node 20 como base (requerido por Vite 6+)
FROM node:20-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node
RUN npm ci

# Copiar el código de la aplicación
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Comando para ejecutar el servidor de desarrollo
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
