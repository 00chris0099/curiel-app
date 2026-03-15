# 📘 CURIEL BACKEND API - Documentación Completa

## 🚀 Sistema de Inspecciones Técnicas - Backend Profesional

Backend RESTful API construido con Node.js, Express, PostgreSQL y Sequelize para el sistema de gestión de inspecciones técnicas de construcción.

---

## 📋 Tabla de Contenidos

1. [Características](#características)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Requisitos](#requisitos)
4. [Instalación](#instalación)
5. [Configuración](#configuración)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [API Endpoints](#api-endpoints)
8. [Autenticación](#autenticación)
9. [Roles y Permisos](#roles-y-permisos)
10. [Auditoría](#auditoría)
11. [Documentación Swagger](#documentación-swagger)
12. [Producción](#producción)

---

## ✨ Características

### Core Features
- ✅ **Autenticación JWT** completa con roles
- ✅ **CRUD de Usuarios** con control de permisos
- ✅ **Gestión de Inspecciones** con estados y flujo completo
- ✅ **Checklists dinámicos** con templates configurables
- ✅ **Upload de fotos** a Cloudinary con validación
- ✅ **Auditoría automática** de todas las acciones críticas
- ✅ **Health check** con estado de DB y métricas
- ✅ **Documentación Swagger/OpenAPI** completa
- ✅ **Manejo de errores** centralizado y profesional
- ✅ **Validaciones** con Joi en todos los endpoints

### Seguridad
- 🔒 JWT con expiración configurable
- 🔒 Helmet para headers de seguridad
- 🔒 Rate limiting configurable
- 🔒 CORS dinámico por entorno
- 🔒 Validación de inputs en todas las rutas
- 🔒 Soft delete en usuarios
- 🔒 Control de roles estricto

### Arquitectura
- 📦 **Service Layer** - Lógica de negocio separada
- 📦 **Controllers** - Manejo de requests/responses
- 📦 **Middlewares** - Autenticación, autorización, validación
- 📦 **Models** - Sequelize ORM con relaciones
- 📦 **Validators** - Schemas Joi reutilizables
- 📦 **Utils** - Helpers (Cloudinary, etc)

---

## 🛠 Stack Tecnológico

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Base de Datos:** PostgreSQL 14+
- **ORM:** Sequelize
- **Autenticación:** JWT (jsonwebtoken)
- **Validación:** Joi
- **File Upload:** Multer + Cloudinary
- **Documentación:** Swagger UI + JSDoc
- **Seguridad:** Helmet, CORS, bcryptjs
- **Email:** Nodemailer
- **PDF:** PDFKit
- **Logging:** Morgan
- **Rate Limiting:** express-rate-limit

---

## 📦 Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0
- Cuenta de Cloudinary (opcional para fotos)
- Cuenta SMTP (opcional para emails)

---

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
cd backend
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Crear base de datos
```bash
# En PostgreSQL
createdb curiel_db
```

### 4. Ejecutar migraciones (opcional)
```bash
npm run migrate
```

### 5. Crear datos de prueba (opcional)
```bash
npm run seed
```

### 6. Iniciar servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:4000`

---

## ⚙️ Configuración

### Variables de Entorno

#### Servidor
```env
NODE_ENV=development
PORT=4000
API_VERSION=v1
```

#### Base de Datos
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curiel_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_DIALECT=postgres
```

#### JWT
```env
JWT_SECRET=tu_secret_muy_seguro
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

#### Cloudinary
```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

#### Email (Nodemailer)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
FROM_EMAIL=noreply@curiel.com
FROM_NAME=CURIEL Inspecciones
```

#### n8n Webhooks
```env
N8N_WEBHOOK_INSPECTION_COMPLETED=https://n8n.com/webhook/xxx
N8N_WEBHOOK_USER_NOTIFICATION=https://n8n.com/webhook/xxx
N8N_WEBHOOK_AUDIT_LOG=https://n8n.com/webhook/xxx
```

#### CORS
```env
CORS_ORIGIN=http://localhost:19006,http://localhost:8081
```

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/             # Configuración (DB, Swagger, etc)
│   │   ├── database.js
│   │   ├── index.js
│   │   └── swagger.js
│   ├── controllers/        # Controladores (lógica de endpoints)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── inspectionController.js
│   │   ├── checklistController.js
│   │   └── photoController.js
│   ├── middlewares/        # Middlewares (auth, validate, error)
│   │   ├── auth.js
│   │   ├── auditLog.js
│   │   ├── errorHandler.js
│   │   ├── upload.js
│   │   └── validateRequest.js
│   ├── models/             # Modelos Sequelize
│   │   ├── User.js
│   │   ├── Inspection.js
│   │   ├── ChecklistTemplate.js
│   │   ├── ChecklistItem.js
│   │   ├── InspectionResponse.js
│   │   ├── Photo.js
│   │   ├── Signature.js
│   │   ├── AuditLog.js
│   │   └── index.js
│   ├── routes/             # Definición de rutas
│   │   ├── authRoutes.js
│   │   ├── usersRoutes.js
│   │   ├── inspectionRoutes.js
│   │   ├── checklistRoutes.js
│   │   ├── photoRoutes.js
│   │   └── index.js
│   ├── services/           # Lógica de negocio
│   │   ├── userService.js
│   │   ├── inspectionService.js
│   │   └── checklistService.js
│   ├── utils/              # Utilidades
│   │   └── cloudinary.js
│   ├── validators/         # Schemas de validación Joi
│   │   ├── userValidator.js
│   │   ├── inspectionValidator.js
│   │   └── checklistValidator.js
│   └── server.js           # Punto de entrada
├── .env                    # Variables de entorno (no commitear)
├── .env.example            # Ejemplo de variables
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Base URL
```
Desarrollo: http://localhost:4000/api/v1
Producción: https://api.curiel.com/api/v1
```

### 🔐 Autenticación
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login de usuario | No |
| POST | `/auth/register` | Registrar usuario (admin) | Sí (Admin) |
| GET | `/auth/me` | Obtener perfil | Sí |
| PUT | `/auth/me` | Actualizar perfil | Sí |
| PUT | `/auth/change-password` | Cambiar contraseña | Sí |

### 👥 Usuarios
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/users/profile` | Mi perfil | Sí |
| GET | `/users` | Listar usuarios | Sí (Admin) |
| GET | `/users/stats` | Estadísticas | Sí (Admin) |
| GET | `/users/:id` | Usuario por ID | Sí (Admin) |
| POST | `/users` | Crear usuario | Sí (Admin) |
| PUT | `/users/:id` | Actualizar usuario | Sí (Admin) |
| PATCH | `/users/:id/status` | Activar/Desactivar | Sí (Admin) |
| POST | `/users/:id/transfer-master` | Transferir master admin (solo master admin actual) | Sí (Master Admin) |
| DELETE | `/users/:id` | Eliminar usuario | Sí (Admin) |

### 📋 Inspecciones
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/inspections` | Listar inspecciones | Sí |
| GET | `/inspections/stats` | Estadísticas | Sí |
| GET | `/inspections/:id` | Inspección por ID | Sí |
| POST | `/inspections` | Crear inspección | Sí (Admin/Arquitecto) |
| PUT | `/inspections/:id` | Actualizar | Sí |
| PATCH | `/inspections/:id/status` | Cambiar estado | Sí |
| DELETE | `/inspections/:id` | Eliminar | Sí (Admin) |

### ✅ Checklists
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/checklists/templates` | Listar templates | Sí |
| GET | `/checklists/templates/:id` | Template por ID | Sí |
| POST | `/checklists/templates` | Crear template | Sí (Admin/Arquitecto) |
| PUT | `/checklists/templates/:id` | Actualizar template | Sí (Admin/Arquitecto) |
| DELETE | `/checklists/templates/:id` | Eliminar template | Sí (Admin) |
| POST | `/checklists/templates/:id/items` | Agregar ítem | Sí (Admin/Arquitecto) |
| PUT | `/checklists/items/:itemId` | Actualizar ítem | Sí (Admin/Arquitecto) |
| DELETE | `/checklists/items/:itemId` | Eliminar ítem | Sí (Admin/Arquitecto) |

### 📷 Fotos
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/photos/inspection/:id` | Subir foto | Sí |
| POST | `/photos/inspection/:id/multiple` | Subir múltiples | Sí |
| GET | `/photos/inspection/:id` | Fotos de inspección | Sí |
| GET | `/photos/:id` | Foto por ID | Sí |
| PUT | `/photos/:id` | Actualizar foto | Sí |
| DELETE | `/photos/:id` | Eliminar foto | Sí |

---

## 🔑 Autenticación

### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@curiel.com",
  "password": "tu_password"
}

# Respuesta
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Usar token en requests
```bash
GET /api/v1/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👮 Roles y Permisos

### Roles disponibles
- **admin** - Acceso total
- **arquitecto** - Crear inspecciones, gestionar checklists
- **inspector** - Ver y completar inspecciones asignadas

### Matriz de permisos

| Acción | Admin | Arquitecto | Inspector |
|--------|-------|------------|-----------|
| Ver usuarios | ✅ | ❌ | ❌ |
| Crear usuarios | ✅ | ❌ | ❌ |
| Crear inspecciones | ✅ | ✅ | ❌ |
| Ver todas las inspecciones | ✅ | ✅ | ❌ |
| Ver mis inspecciones | ✅ | ✅ | ✅ |
| Cambiar estado de inspección | ✅ | ✅ | ✅ (solo asignadas) |
| Crear templates | ✅ | ✅ | ❌ |
| Subir fotos | ✅ | ✅ | ✅ |
| Eliminar inspecciones | ✅ | ❌ | ❌ |

---

## 📊 Auditoría

Todas las acciones críticas se registran en `audit_logs`:

### Acciones auditadas
- ✅ Login/Logout
- ✅ Creación de usuarios
- ✅ Cambios en usuarios
- ✅ Creación de inspecciones
- ✅ Cambios de estado
- ✅ Upload de fotos
- ✅ Eliminaciones

### Información registrada
- Usuario que ejecutó la acción
- Tipo de acción
- Entidad afectada
- Timestamp
- IP del cliente
- User-Agent
- Payload resumido

### Consultar auditoría
```sql
SELECT * FROM audit_logs 
WHERE user_id = 'uuid-del-usuario'
ORDER BY created_at DESC;
```

---

## 📖 Documentación Swagger

La API cuenta con documentación interactiva en Swagger.

### Acceder a Swagger UI
```
http://localhost:4000/api/docs
```

### Características de Swagger
- Descripción completa de todos los endpoints
- Schemas de request/response
- Autenticación con Bearer Token
- Prueba endpoints directamente
- Ejemplos de uso

### Autenticarse en Swagger
1. Ir a `/api/docs`
2. Click en "Authorize" (arriba a la derecha)
3. Ingresar: `Bearer TU_TOKEN_JWT`
4. Click "Authorize"

---

## 🚀 Producción

### Checklist de Deploy

#### 1. Variables de entorno
```env
NODE_ENV=production
JWT_SECRET=<secreto-super-seguro-aleatorio>
DATABASE_URL=postgresql://user:pass@host:5432/db
CORS_ORIGIN=https://app.curiel.com
```

#### 2. Base de datos
- ✅ Migrar esquema: `npm run migrate`
- ✅ Crear usuario admin inicial
- ✅ Backup automático configurado

#### 3. Seguridad
- ✅ SECRET_KEY fuerte y aleatorio
- ✅ CORS apuntando solo a dominios permitidos
- ✅ HTTPS habilitado
- ✅ Rate limiting ajustado

#### 4. Monitoreo
- ✅ Health check: `/api/v1/health`
- ✅ Logs configurados
- ✅ Alertas de errores

### Despliegue en Railway/Render

#### Railway
```bash
# 1. Instalar CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway up
```

#### Render
1. Conectar repositorio en Render.com
2. Configurar build: `npm install`
3. Configurar start: `npm start`
4. Agregar variables de entorno
5. Deploy automático

### PM2 (VPS)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar app
pm2 start src/server.js --name curiel-api

# Auto-restart on reboot
pm2 startup
pm2 save
```

---

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Con coverage
npm run test:coverage
```

---

## 🐛 Debugging

### Logs
Los logs se muestran en consola con **Morgan**:
- Desarrollo: formato `dev` (coloreado)
- Producción: formato `combined` (Apache)

### Health Check
```bash
GET /api/v1/health

# Respuesta
{
  "success": true,
  "status": "operational",
  "timestamp": "2026-02-17T14:35:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "latency": "15ms"
  },
  "memory": {
    "used": "120MB",
    "total": "512MB"
  },
  "version": "1.0.0"
}
```

---

## 📞 Soporte

- **Email:** soporte@curiel.com
- **Documentación:** `/api/docs`
- **Health Check:** `/api/v1/health`

---

## 📄 Licencia

Proprietary - © 2026 CURIEL

---

**🎉 Backend listo para producción - Desarrollado profesionalmente**
