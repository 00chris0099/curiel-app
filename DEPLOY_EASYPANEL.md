# Deploy En EasyPanel

## A. Mapa de despliegue

- `PostgreSQL` en EasyPanel como servicio administrado.
- `backend_legacy/` como API Node/Express.
- `frontend/` como frontend web estatico compilado con Vite.
- `mobile/` fuera de EasyPanel; solo consume la API productiva y se publica con Expo/EAS.

Notas:

- No existe `package.json` en la raiz.
- No ejecutes `npm install` ni `npm run` desde la raiz.
- El backend real del proyecto es `backend_legacy/`, no `backend/`.

## B. Backend

### Servicio en EasyPanel

- Tipo: App desde Git
- Root directory: `backend_legacy`
- Build command: `npm install`
- Start command: `npm start`
- Puerto interno: `4000`

### Variables de entorno minimas

```env
NODE_ENV=production
PORT=4000
API_VERSION=v1

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
DATABASE_SSL=false

JWT_SECRET=un-secret-largo-y-seguro
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=https://app.tudominio.com
FRONTEND_URL=https://app.tudominio.com
BACKEND_URL=https://api.tudominio.com

ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=una-clave-segura
```

### Variables opcionales

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASSWORD=...
FROM_EMAIL=noreply@tudominio.com
FROM_NAME=CURIEL

N8N_WEBHOOK_INSPECTION_COMPLETED=https://n8n.tudominio.com/webhook/...
N8N_WEBHOOK_USER_NOTIFICATION=https://n8n.tudominio.com/webhook/...
N8N_WEBHOOK_AUDIT_LOG=https://n8n.tudominio.com/webhook/...
```

### Post deploy

Ejecuta estos comandos desde la consola del servicio backend:

```bash
npm run migrate
npm run seed
```

### Qué validar

- `npm start` levanta `src/server.js` y escucha en `process.env.PORT || 4000`.
- El backend acepta `DATABASE_URL`.
- `DATABASE_SSL=true|false` controla `dialectOptions.ssl`.
- CORS toma `CORS_ORIGIN` y `FRONTEND_URL`.
- Las rutas de verificacion publicas son `/` y `/api/v1/health`.

## C. Frontend

### Servicio en EasyPanel

- Tipo: Static site desde Git
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Output directory: `dist`

### Variable requerida

```env
VITE_API_URL=https://api.tudominio.com/api/v1
```

### Notas de frontend

- `frontend/src/api/axios.ts` usa `VITE_API_URL` como base de la API.
- El login y el resto de servicios salen contra esa URL.
- El proyecto usa `BrowserRouter`, asi que en EasyPanel debes activar SPA fallback o rewrite de todas las rutas hacia `index.html`.

## D. Dominios recomendados

- Frontend: `https://app.tudominio.com`
- Backend: `https://api.tudominio.com`

## E. Verificacion

Prueba este checklist despues del deploy:

1. `https://api.tudominio.com/`
2. `https://api.tudominio.com/api/v1/health`
3. Abrir `https://app.tudominio.com`
4. Iniciar sesion con el admin creado por `npm run seed`
5. Revisar que no haya errores de CORS en el navegador
6. Si subes fotos, validar Cloudinary
7. Si usas correos o automatizaciones, validar SMTP y n8n

## F. Nota sobre almacenamiento

Si en algun momento guardas PDFs o reportes en disco en lugar de un storage externo, monta un volumen persistente para esa ruta.

## Mobile

- No despliegues `mobile/` en EasyPanel.
- Configura `EXPO_PUBLIC_API_URL=https://api.tudominio.com/api/v1` para builds Expo/EAS.
- Publica la app con Expo/EAS (`npm --prefix mobile run build:android`, `npm --prefix mobile run build:ios`, `npm --prefix mobile run submit`).
