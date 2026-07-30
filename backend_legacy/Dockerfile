FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    libreoffice-core \
    libreoffice-writer \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV LIBRE_OFFICE_DIR=/usr/lib/libreoffice/program
ENV LIBRE_OFFICE_EXE=/usr/lib/libreoffice/program/soffice

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh", "-c", "npx prisma generate && node scripts/migrate-all.js && node scripts/seed-auth.js && node src/server.js"]
