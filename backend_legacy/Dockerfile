# =============================================
# CURIEL - Backend (Node 20 + Express + Prisma)
# =============================================
# Desplegado en EasyPanel: ruta de build = backend_legacy
# (la carpeta es backend_legacy, NO "backend" ni la raiz del repo)

FROM node:20-slim

WORKDIR /app

# ---- Dependencias del sistema ----
# Chromium (Puppeteer) para generar los PDF de informes y LibreOffice
# para conversiones de documentos.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    curl \
    fonts-liberation \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    libreoffice-core \
    libreoffice-writer \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer usa el Chromium del sistema (no descarga su propio binario)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV LIBRE_OFFICE_DIR=/usr/lib/libreoffice/program
ENV LIBRE_OFFICE_EXE=/usr/lib/libreoffice/program/soffice

# Directorios de runtime (reportes PDF y uploads temporales).
# Se crean aquí para que el usuario node pueda escribir en ellos.
RUN mkdir -p /app/storage/reports /app/uploads \
    && chown -R node:node /app

# ---- Capa 1: dependencias (cacheable) ----
# Si package*.json no cambian, Docker reutiliza esta capa sin re-descargar.
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Capa 2: codigo fuente ----
# .dockerignore evita copiar node_modules (Windows) y .env al contenedor.
COPY --chown=node:node . .

# ---- Capa 3: generar el cliente Prisma en BUILD ----
# Antes se ejecutaba en cada arranque (npx prisma generate en el CMD);
# ahora el contenedor arranca más rápido.
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=4000

# Ejecutar como usuario no-root (mejora de seguridad)
USER node

EXPOSE 4000

# Healthcheck: EasyPanel marca el servicio "healthy" cuando responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD ["sh", "-c", "curl -sf http://127.0.0.1:${PORT}/api/v1/health > /dev/null 2>&1 || exit 1"]

# Migraciones/seed/fixes son idempotentes y corren en cada arranque.
# El cliente Prisma ya está generado en build, así que arranca directo.
CMD ["sh", "-c", "node scripts/migrate-all.js && node scripts/seed-auth.js && node scripts/run-sql-fixes.js && node src/server.js"]
