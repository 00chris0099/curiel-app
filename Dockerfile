# Dockerfile para desplegar la app frontend (React + Vite) en EasyPanel.
# EasyPanel requiere que exista un Dockerfile en la raíz del proyecto.

# ----- Build stage -----
FROM node:20-slim AS builder
WORKDIR /app

# Copiar dependencias de frontend
COPY frontend/package*.json ./frontend/

# Instalar dependencias (legacy-peer-deps evita errores de peer deps en npm 10+)
RUN cd frontend && npm install --legacy-peer-deps

# Copiar el código de frontend y generar el build
COPY frontend ./frontend
RUN cd frontend && npm run build

# ----- Runtime stage -----
FROM node:20-slim AS runner
WORKDIR /app

# Servidor estático ligero
RUN npm install -g serve

# Copiar el build de frontend
COPY --from=builder /app/frontend/dist ./dist

# Puerto expuesto (EasyPanel define $PORT)
ENV PORT=${PORT:-3000}
EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
