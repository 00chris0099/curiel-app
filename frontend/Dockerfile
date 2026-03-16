FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Use legacy peer deps to avoid build failures on strict peer dependency resolution
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD sh -c "npm run preview -- --port ${PORT:-3000} --host 0.0.0.0"