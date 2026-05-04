# 🚀 GUÍA DE INSTALACIÓN - CURIEL

Esta guía te llevará paso a paso para configurar y ejecutar la aplicación CURIEL completa.

## 📋 Requisitos Previos

### Obligatorios
- **Node.js** 18+ ([Descargar](https://nodejs.org/))
- **PostgreSQL** 14+ ([Descargar](https://www.postgresql.org/download/))
- **Git** ([Descargar](https://git-scm.com/))

### Para desarrollo móvil
- **Expo CLI** (se instala automáticamente)
- **iOS:** Xcode (solo macOS)
- **Android:** Android Studio

## 🗄️ PASO 1: Configurar Base de Datos

### Windows (PowerShell)

```powershell
# 1. Iniciar servicio de PostgreSQL
# (Verificar que PostgreSQL esté instalado y corriendo)

# 2. Conectar a PostgreSQL
psql -U postgres

# 3. Crear base de datos
CREATE DATABASE curiel_db;

# 4. Crear usuario (opcional)
CREATE USER curiel_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE curiel_db TO curiel_user;

# 5. Salir
\q
```

## 📦 PASO 2: Instalar Backend

```powershell
# Navegar a la carpeta del backend
cd backend

# Instalar dependencias
npm install

# Crear archivo .env
Copy-Item .env.example .env

# IMPORTANTE: Editar .env con tus credenciales
notepad .env
```

### Configurar .env

Edita el archivo `.env` y configura:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curiel_db
DB_USER=postgres
DB_PASSWORD=tu_password_postgresql

# JWT Secret (genera uno aleatorio)
JWT_SECRET=cambiar_por_secreto_super_seguro_aleatorio

# Cloudinary (Crear cuenta gratuita en cloudinary.com)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Email (opcional para testing, configurar después)
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
```

### Ejecutar Migraciones

```powershell
# Crear tablas en la base de datos
npm run migrate

# Cargar datos de prueba (usuarios y plantillas)
npm run seed
```

### Iniciar Backend

```powershell
# Modo desarrollo (con hot-reload)
npm run dev

# El servidor iniciará en http://localhost:4000
```

✅ El backend debe mostrar:
```
✅ Base de datos conectada exitosamente
✅ Modelos sincronizados
🚀 ========================================
   CURIEL API Server
   Entorno: development
   Puerto: 4000
   URL: http://localhost:4000
========================================
```

## 📱 PASO 3: Instalar App Móvil

Abre **NUEVA TERMINAL** (mantén el backend corriendo)

```powershell
# Navegar a la carpeta mobile
cd ../mobile

# Instalar dependencias
npm install

# Iniciar Expo
npm start
```

### Probar en Dispositivo

**Opción 1: Expo Go (Recomendado para desarrollo)**

1. Instalar **Expo Go** en tu celular:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Escanear el código QR que aparece en la terminal

**Opción 2: Emulador**

Para Android:
```powershell
npm run android
```

Para iOS (solo macOS):
```powershell
npm run ios
```

## 🧪 PASO 4: Probar la Aplicación

### Credenciales de Prueba

El script de seed crea un usuario **admin** (puedes cambiar credenciales con variables de entorno):

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@curiel.com | admin123 |

> Para agregar más usuarios (arquitectos/inspectores), usa el endpoint `POST /api/v1/users` con un token admin.

### Verificar Endpoints

Puedes probar el backend directamente:

```powershell
# Health check
curl http://localhost:4000/api/v1/health

# Login
curl -X POST http://localhost:4000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@curiel.com\",\"password\":\"admin123\"}'
```

## 🔧 TROUBLESHOOTING

### Backend no inicia

**Error: "Error al conectar a la base de datos"**
- Verifica que PostgreSQL esté corriendo
- Confirma las credenciales en `.env`
- Intenta: `psql -U postgres -d curiel_db`

**Error: "Port 4000 is already in use"**
```powershell
# Cambiar puerto en .env
PORT=4001
```

### Mobile no conecta al backend

**Error: "Network request failed"**

En `mobile/src/config/index.js`, cambia:

```javascript
# Si usas Expo Go en celular físico:
API_URL: 'http://TU_IP_LOCAL:4000/api/v1'

# Encontrar tu IP local:
ipconfig
# Busca "Dirección IPv4" (ejemplo: 192.168.1.100)
```

### Migraciones fallan

```powershell
# Resetear base de datos
npm run migrate

# Si persiste, borrar y recrear:
psql -U postgres
DROP DATABASE curiel_db;
CREATE DATABASE curiel_db;
\q

npm run migrate
npm run seed
```

## 🌐 PASO 5: Configurar n8n (Opcional)

n8n permite automatizar notificaciones por email.

### Instalar n8n

```powershell
# Con Docker (recomendado)
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  -v C:\Users\TU_USUARIO\.n8n:/home/node/.n8n `
  n8nio/n8n

# Sin Docker
npm install -g n8n
n8n start
```

Acceder: http://localhost:5678

### Crear Workflow

1. Importar `n8n-workflows/inspection-completed.json`
2. Configurar nodo de Email con tus credenciales SMTP
3. Activar workflow
4. Copiar URL del webhook
5. Agregar URL en `backend/.env`:
   ```
   N8N_WEBHOOK_INSPECTION_COMPLETED=https://tu-n8n-url/webhook/...
   ```

## 📦 PASO 6: Deploy a Producción (Opcional)

### Backend

**Railway (Recomendado)**

```powershell
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up

# Agregar PostgreSQL
railway add postgresql

# Configurar variables de entorno en dashboard
```

**Render**

1. Crear cuenta en [render.com](https://render.com)
2. New > Web Service
3. Conectar repositorio GitHub
4. Root Directory: `backend`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Agregar PostgreSQL addon
8. Configurar environment variables

### Mobile

```powershell
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar proyecto
eas build:configure

# Build para Android
eas build --platform android

# Build para iOS (requiere cuenta de desarrollador Apple)
eas build --platform ios

# Submit a stores
eas submit
```

## 🎯 Próximos Pasos

1. ✅ Personalizar logo y colores
2. ✅ Configurar Cloudinary para fotos
3. ✅ Configurar Email SMTP
4. ✅ Crear más plantillas de checklist
5. ✅ Configurar n8n para automatización
6. ✅ Deploy a producción

## 📚 Documentación Adicional

- **API:** Ver `docs/API.md` para endpoints completos
- **Deployment:** Ver `docs/DEPLOYMENT.md` para guía detallada
- **Manual:**Ver `docs/USER_GUIDE.md` para manual de usuario

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs del backend (terminal donde corre `npm run dev`)
2. Revisa los logs de Expo (terminal donde corre `npm start`)
3. Verifica que ambos servicios estén corriendo
4. Confirma la conexión de red entre mobile y backend

---

**¡Felicidades! 🎉 Tu aplicación CURIEL está lista para usar.**
