# 🏗️ CURIEL Backend API

Sistema backend profesional para gestión de inspecciones técnicas con autenticación JWT, autorización por roles, auditoría automática y respuestas estandarizadas.

## ⚡ Quick Start

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
npm run migrate

# Poblar BD (desarrollo)
npm run seed

# Iniciar servidor
npm run dev
```

El servidor estará disponible en `http://localhost:4000`

## 🎯 Características Principales

### ✅ Sistema Completo Implementado

- [x] **Autenticación JWT** - Login seguro con tokens
- [x] **Autorización por Roles** - Admin, Arquitecto, Inspector
- [x] **CRUD de Inspecciones** - GET, POST, PUT, PATCH, DELETE
- [x] **Auditoría Automática** - Registro completo de acciones
- [x] **Respuestas Estandarizadas** - Formato consistente
- [x] **Manejo Centralizado de Errores** - Códigos de error claros
- [x] **Validación de Inputs** - express-validator
- [x] **Seguridad Empresarial** - Helmet, CORS, Rate Limiting

## 📋 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/              # Configuración (DB, JWT, server)
│   ├── controllers/         # Lógica de negocio
│   │   ├── authController.js
│   │   └── inspectionController.js
│   ├── middlewares/         # Auth, errores, validación, audit
│   │   ├── auth.js          # authenticate(), authorize()
│   │   ├── auditLog.js      # Registro automático
│   │   ├── errorHandler.js  # Manejo centralizado
│   │   └── validateRequest.js
│   ├── models/              # Modelos Sequelize
│   │   ├── User.js
│   │   ├── Inspection.js
│   │   └── AuditLog.js
│   ├── routes/              # Definición de rutas
│   │   ├── authRoutes.js
│   │   └── inspectionRoutes.js
│   ├── utils/               # Utilidades
│   │   ├── apiResponse.js   # Respuestas estandarizadas
│   │   └── n8n.js           # Webhooks
│   └── server.js            # Punto de entrada
├── .env.example
├── package.json
├── BACKEND_DOCUMENTATION.md  # 📚 Documentación completa
└── POSTMAN_GUIDE.md         # 📮 Guía de Postman
```

## 🔐 Autorización por Roles

### Middleware `authorize(...roles)`

```javascript
// Solo admin y arquitecto pueden crear
router.post('/inspections', 
    authenticate, 
    authorize('admin', 'arquitecto'), 
    createInspection
);

// Solo admin puede eliminar
router.delete('/inspections/:id', 
    authenticate, 
    authorize('admin'), 
    deleteInspection
);
```

### Roles Disponibles

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total, puede eliminar inspecciones |
| **arquitecto** | Crea inspecciones, asigna inspectores |
| **inspector** | Solo ve/edita sus inspecciones asignadas |

## 📦 CRUD de Inspecciones

### Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/v1/inspections` | ✅ | Listar inspecciones |
| GET | `/api/v1/inspections/:id` | ✅ | Ver detalle |
| POST | `/api/v1/inspections` | ✅ Admin/Arq | Crear inspección |
| PUT | `/api/v1/inspections/:id` | ✅ | Actualizar completa |
| **PATCH** | `/api/v1/inspections/:id` | ✅ | **Actualizar parcial** |
| POST | `/api/v1/inspections/:id/complete` | ✅ | Finalizar |
| DELETE | `/api/v1/inspections/:id` | ✅ Admin | Eliminar |

### Ejemplo: Crear Inspección

```javascript
POST /api/v1/inspections
Authorization: Bearer {token}

{
  "projectName": "Torre Central",
  "clientName": "ABC Corp",
  "address": "Av. Principal 123",
  "inspectionType": "estructural",
  "scheduledDate": "2026-02-20T10:00:00Z",
  "inspectorId": "uuid-del-inspector"
}
```

## 📊 Sistema de Auditoría

### Middleware `auditLog`

```javascript
// Uso automático en rutas
router.post('/inspections', 
    authenticate,
    auditLog('create', 'Inspection'),  // ✅ Registro automático
    createInspection
);
```

### Eventos Auditados

- ✅ Login de usuarios
- ✅ Creación de inspecciones
- ✅ Actualización de inspecciones
- ✅ Cambios de estado
- ✅ Eliminación de inspecciones
- ✅ Modificación de perfiles
- ✅ Cambio de contraseñas

### Consultar Audit Logs

```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'Inspection' 
ORDER BY created_at DESC;
```

## ✅ Respuestas Estandarizadas

### Formato Exitoso

```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": {...},
  "meta": {...}
}
```

### Formato de Error

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permiso para esta acción"
  }
}
```

### Códigos de Error

| Código | HTTP | Descripción |
|--------|------|-------------|
| `BAD_REQUEST` | 400 | Solicitud inválida |
| `UNAUTHORIZED` | 401 | No autenticado |
| `FORBIDDEN` | 403 | Sin permisos |
| `NOT_FOUND` | 404 | No encontrado |
| `DUPLICATE_ENTRY` | 409 | Ya existe |
| `VALIDATION_ERROR` | 422 | Campos inválidos |
| `INTERNAL_SERVER_ERROR` | 500 | Error del servidor |

## 🔒 Seguridad

### Implementado

✅ **Helmet** - Headers de seguridad  
✅ **CORS** - Control de orígenes  
✅ **Rate Limiting** - 100 req/15min  
✅ **JWT** - Tokens seguros (7d)  
✅ **Bcrypt** - Hash de contraseñas (salt 10)  
✅ **Validación** - express-validator  
✅ **Error Handling** - Sin exponer stack traces en producción

### Ejemplo: Token JWT

```http
GET /api/v1/inspections
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧪 Scripts Disponibles

```json
{
  "dev": "nodemon src/server.js",           // Desarrollo
  "start": "node src/server.js",            // Producción
  "migrate": "node src/database/migrate.js", // Migraciones
  "seed": "node src/database/seed.js",      // Poblar BD
  "test": "jest --coverage",                // Tests
  "lint": "eslint src/**/*.js"              // Linter
}
```

## 🌐 Usuario admin (después de seed)

El seed crea un usuario **admin** que puede usar el backend inmediatamente.

| Email | Password | Rol |
|-------|----------|-----|
| admin@curiel.com | admin123 | admin |

> Para crear más usuarios (arquitectos/inspectores), usa el endpoint `POST /api/v1/users` con un token admin.

## 📚 Documentación Completa

Para documentación detallada, ver:
- **[BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md)** - Guía técnica completa
- **[POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)** - Guía de uso con Postman

## 🛠️ Stack Tecnológico

- **Node.js** 18+
- **Express.js** 4.18
- **PostgreSQL** + Sequelize ORM
- **JWT** (jsonwebtoken)
- **Bcrypt** (bcryptjs)
- **Express Validator**
- **Helmet, CORS, Rate Limiting**

## 📦 Variables de Entorno

```env
# SERVIDOR
NODE_ENV=development
PORT=4000
API_VERSION=v1

# BASE DE DATOS
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curiel_db
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_secret_key_aqui
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:19006,http://localhost:8081

# CLOUDINARY (opcional)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# N8N WEBHOOKS (opcional)
N8N_WEBHOOK_INSPECTION_COMPLETED=https://n8n.com/webhook/xxx
```

## 🚀 Deployment

### Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Pasos

1. Configurar variables de entorno
2. Ejecutar migraciones: `npm run migrate`
3. Iniciar servidor: `npm start`

### Servicios Compatibles

- ✅ **Railway** (recomendado)
- ✅ **Render**
- ✅ **Heroku**
- ✅ **AWS EC2**
- ✅ **DigitalOcean**

## 🎓 Buenas Prácticas Aplicadas

✅ Código limpio y modular  
✅ Separación de responsabilidades  
✅ Middlewares reusables  
✅ Validación centralizada  
✅ Manejo robusto de errores  
✅ Audit trail completo  
✅ Respuestas consistentes  
✅ Comentarios claros  
✅ No exponer datos sensibles  
✅ asyncHandler reduce boilerplate

## 🆘 Troubleshooting

### Error: ECONNREFUSED 127.0.0.1:4000

**Solución:** Asegúrate de que el servidor esté corriendo:
```bash
npm run dev
```

### Error: connect ECONNREFUSED 127.0.0.1:5432

**Solución:** PostgreSQL no está corriendo. Iniciar servicio:
```bash
# Windows
Start-Service postgresql-x64-18

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Error: JWT Token Expired

**Solución:** Hacer login nuevamente para obtener un nuevo token:
```http
POST /api/v1/auth/login
{
  "email": "admin@curiel.com",
  "password": "admin123"
}
```

## 📄 Licencia

PROPRIETARY - Uso interno solamente

---

## 📞 Contacto

Para dudas técnicas, revisar:
1. [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md)
2. [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)
3. Comentarios en el código fuente

---

**Backend desarrollado siguiendo estándares empresariales y mejores prácticas de la industria** 🚀
