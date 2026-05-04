# 🏗️ CURIEL Backend - Documentación Técnica

## 📋 Tabla de Contenidos
1. [Arquitectura General](#arquitectura-general)
2. [Sistema de Autorización](#sistema-de-autorización)
3. [CRUD de Inspecciones](#crud-de-inspecciones)
4. [Sistema de Auditoría](#sistema-de-auditoría)
5. [Respuestas Estandarizadas](#respuestas-estandarizadas)
6. [Seguridad](#seguridad)
7 [API Endpoints](#api-endpoints)

---

## 🏛️ Arquitectura General

### Estructura del Proyecto

```
backend/
├── src/
│   ├── config/           # Configuración (DB, JWT, server)
│   ├── controllers/      # Lógica de negocio
│   ├── middlewares/      # Auth, errores, validación, audit
│   ├── models/           # Modelos Sequelize (PostgreSQL)
│   ├── routes/           # Definición de rutas
│   ├── utils/            # Utilidades (responses, n8n)
│   └── server.js         # Punto de entrada
├── .env                  # Variables de entorno
└── package.json
```

### Stack Tecnológico

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Base de Datos:** PostgreSQL + Sequelize ORM
- **Autenticación:** JWT (jsonwebtoken)
- **Validación:** express-validator + Joi
- **Seguridad:** Helmet, CORS, Rate Limiting
- **Uploads:** Cloudinary (opcional: Multer local)

---

## 🔐 Sistema de Autorización

### Roles Disponibles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **admin** | Administrador del sistema | Acceso total, puede eliminar inspecciones |
| **arquitecto** | Arquitecto/Manager | Crea inspecciones, asigna inspectores, ve todas las inspecciones |
| **inspector** | Inspector de campo | Solo ve/edita sus inspecciones asignadas |

### Middleware de Autorización

📄 **Archivo:** `src/middlewares/auth.js`

#### `authenticate` - Verificar JWT

```javascript
// Uso en rutas
router.use(authenticate);
```

Valida el token JWT del header `Authorization: Bearer <token>` y adjunta `req.user`, `req.userId`, `req.userRole`.

#### `authorize(...roles)` - Verificar Roles

```javascript
// Solo admin y arquitecto
router.post('/inspections', authenticate, authorize('admin', 'arquitecto'), createInspection);

// Solo admin
router.delete('/inspections/:id', authenticate, authorize('admin'), deleteInspection);
```

**Respuesta en caso de acceso denegado (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permisos para realizar esta acción"
  }
}
```

---

## 📦 CRUD de Inspecciones

### Modelo Inspection

📄 **Archivo:** `src/models/Inspection.js`

**Campos principales:**
- `id` (UUID) - Primary key
- `projectName` - Nombre del proyecto
- `clientName`, `clientEmail`, `clientPhone` - Info del cliente
- `address`, `city`, `state`, `zipCode` - Ubicación
- `inspectionType` - Tipo (estructural, eléctrica, etc.)
- `status` - Estado: `pendiente`, `en_proceso`, `finalizada`, `cancelada`
- `scheduledDate` - Fecha programada
- `completedDate` - Fecha de finalización
- `inspectorId` (FK) - Inspector asignado
- `createdById` (FK) - Quien creó la inspección
- `notes` - Notas generales
- `reportUrl` - URL del PDF final
- `latitude`, `longitude` - Coordenadas GPS

### Endpoints Disponibles

#### 1️⃣ **GET /api/v1/inspections** - Listar Inspecciones

**Autenticación:** Requerida  
**Autorización:** Todos los roles

**Query Parameters:**
- `status` - Filtrar por estado
- `inspectorId` - Filtrar por inspector (admin/arquitecto)
- `startDate` - Fecha inicio
- `endDate` - Fecha fin
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 20)

**Filtros por rol:**
- `inspector`: Solo ve sus inspecciones asignadas
- `arquitecto/admin`: Ven todas las inspecciones

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "inspections": [...]
  },
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

#### 2️⃣ **GET /api/v1/inspections/:id** - Obtener Inspección

**Autenticación:** Requerida  
**Autorización:** Admin/Arquitecto ven todas, Inspector solo la suya

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "inspection": {
      "id": "uuid",
      "projectName": "Edificio Central",
      "status": "en_proceso",
      "inspector": {
        "id": "uuid",
        "firstName": "Juan",
        "lastName": "Pérez"
      },
      "responses": [...],
      "photos": [...],
      "signatures": [...]
    }
  }
}
```

#### 3️⃣ **POST /api/v1/inspections** - Crear Inspección

**Autenticación:** Requerida  
**Autorización:** `admin`, `arquitecto`

**Body (JSON):**
```json
{
  "projectName": "Edificio Torre Norte",
  "clientName": "ABC Constructora",
  "clientEmail": "contacto@abc.com",
  "clientPhone": "+123456789",
  "address": "Av. Principal 123",
  "city": "Ciudad",
  "state": "Estado",
  "zipCode": "12345",
  "inspectionType": "estructural",
  "scheduledDate": "2026-02-20T10:00:00Z",
  "inspectorId": "uuid-del-inspector",
  "notes": "Revisión completa",
  "latitude": 19.4326,
  "longitude": -99.1332
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Inspección creada exitosamente",
  "data": {
    "inspection": {...}
  }
}
```

#### 4️⃣ **PUT/PATCH /api/v1/inspections/:id** - Actualizar Inspección

**Autenticación:** Requerida  
**Autorización:** Admin/Arquitecto editan todas, Inspector solo la suya

**Diferencia PUT vs PATCH:**
- `PUT`: Reemplazo completo (REST clásico)
- `PATCH`: Actualización parcial (REST best practice) ✅

**Body (JSON) - Solo campos a actualizar:**
```json
{
  "status": "en_proceso",
  "notes": "Avance del 50%"
}
```

**Restricciones:**
- Inspecciones finalizadas solo pueden ser editadas por admin
- El inspector asignado no puede ser cambiado después de crear la inspección

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Inspección actualizada exitosamente",
  "data": {
    "inspection": {...}
  }
}
```

#### 5️⃣ **POST /api/v1/inspections/:id/complete** - Finalizar Inspección

**Autenticación:** Requerida  
**Autorización:** Admin o inspector asignado

**Validaciones:**
- La inspección debe tener al menos 1 respuesta completada
- No puede estar ya finalizada

**Efectos:**
- Cambia `status` a `finalizada`
- Registra `completedDate`
- Dispara webhook de n8n (si configurado)
- Crea audit log

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Inspección finalizada exitosamente",
  "data": {
    "inspection": {...}
  }
}
```

#### 6️⃣ **DELETE /api/v1/inspections/:id** - Eliminar Inspección

**Autenticación:** Requerida  
**Autorización:** Solo `admin`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Inspección eliminada exitosamente"
}
```

---

## 📊 Sistema de Auditoría

### Modelo AuditLog

📄 **Archivo:** `src/models/AuditLog.js`

**Campos:**
- `id` (UUID)
- `userId` (FK) - Quien realizó la acción
- `action` - Acción realizada (create, update, delete, login, etc.)
- `entityType` - Tipo de entidad (Inspection, User, etc.)
- `entityId` - ID de la entidad afectada
- `changes` (JSONB) - Cambios realizados (body, params, query)
- `ipAddress` - IP del usuario
- `userAgent` - Navegador/cliente
- `details` (JSONB) - Info adicional (método, path, statusCode)
- `createdAt` - Timestamp

### Uso del Middleware auditLog

📄 **Archivo:** `src/middlewares/auditLog.js`

#### Uso Automático en Rutas

```javascript
router.post(
    '/inspections',
    authenticate,
    authorize('admin', 'arquitecto'),
    auditLog('create', 'Inspection'),  // ✅ Registro automático
    createInspection
);
```

#### Uso Manual en Controllers

```javascript
const { createAuditLog } = require('../middlewares/auditLog');

// En cualquier controller
await createAuditLog(userId, 'custom_action', 'EntityType', entityId, {
    custom: 'data'
});
```

### Eventos que se Auditan

| Evento | Action | Entity | Cuándo |
|--------|--------|--------|--------|
| Login | `login` | `User` | Usuario inicia sesión |
| Registro | `register` | `User` | Admin crea nuevo usuario |
| Crear Inspección | `create` | `Inspection` | Nueva inspección creada |
| Actualizar Inspección | `update` | `Inspection` | Inspección modificada |
| Iniciar Inspección | `start_inspection` | `Inspection` | Cambia a "en_proceso" |
| Finalizar Inspección | `complete` | `Inspection` | Cambia a "finalizada" |
| Eliminar Inspección | `delete` | `Inspection` | Admin elimina inspección |
| Actualizar Perfil | `update_profile` | `User` | Usuario modifica su perfil |
| Cambiar Contraseña | `change_password` | `User` | Usuario cambia contraseña |

---

## ✅ Respuestas Estandarizadas

📄 **Archivo:** `src/utils/apiResponse.js`

### Formato de Respuestas Exitosas

```json
{
  "success": true,
  "message": "Mensaje opcional",
  "data": {...},
  "meta": {...}  // Para paginación
}
```

### Formato de Respuestas de Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error",
    "details": {...}  // Solo en development
  }
}
```

### Códigos de Error Estandarizados

| HTTP | Código | Descripción | Uso |
|------|--------|-------------|-----|
| 400 | `BAD_REQUEST` | Solicitud mal formada | Datos faltantes o inválidos |
| 401 | `UNAUTHORIZED` | No autenticado | Token faltante o inválido |
| 401 | `TOKEN_EXPIRED` | Token expirado | JWT vencido |
| 401 | `INVALID_TOKEN` | Token inválido | JWT malformado |
| 403 | `FORBIDDEN` | Sin permisos | Rol insuficiente |
| 404 | `NOT_FOUND` | No encontrado | Recurso inexistente |
| 409 | `DUPLICATE_ENTRY` | Registro duplicado | Email ya existe |
| 409 | `CONFLICT` | Conflicto de estado | Inspección ya finalizada |
| 413 | `FILE_TOO_LARGE` | Archivo muy grande | Excede límite de tamaño |
| 422 | `VALIDATION_ERROR` | Error de validación | Campos inválidos |
| 500 | `INTERNAL_SERVER_ERROR` | Error del servidor | Error no controlado |
| 500 | `DATABASE_ERROR` | Error de BD | Fallo en Sequelize |

### Helpers Disponibles

```javascript
const { 
    successResponse,      // 200 OK
    createdResponse,      // 201 Created
    paginatedResponse,    // 200 con meta
    noContentResponse,    // 204 No Content
    
    badRequestError,      // 400
    unauthorizedError,    // 401
    forbiddenError,       // 403
    notFoundError,        // 404
    conflictError,        // 409
    validationError,      // 422
    serverError          // 500
} = require('../utils/apiResponse');

// Ejemplos
return successResponse(res, { user }, 'Usuario actualizado');
return createdResponse(res, { inspection }, 'Inspección creada');
return notFoundError(res, 'Inspección no encontrada');
return forbiddenError(res, 'No tienes permiso para esta acción');
```

---

## 🔒 Seguridad

### Implementaciones de Seguridad

#### 1. **Helmet** - Headers de Seguridad
```javascript
app.use(helmet());
```
Protege contra:
- XSS (Cross-Site Scripting)
- Clickjacking
- MIME type sniffing

#### 2. **CORS** - Control de Orígenes
```javascript
app.use(cors({
    origin: config.server.corsOrigin,
    credentials: true
}));
```

#### 3. **Rate Limiting** - Límite de Requests
```javascript
// 100 requests por 15 minutos
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api', limiter);
```

#### 4. **Validación de Inputs**
```javascript
// express-validator
body('email').isEmail().withMessage('Email inválido'),
body('password').isLength({ min: 6 })
```

#### 5. **Bcrypt** - Hash de Contraseñas
```javascript
// En modelo User
const bcrypt = require('bcryptjs');
this.password = await bcrypt.hash(password, 10);
```

#### 6. **JWT** - Tokens Seguros
```javascript
const token = jwt.sign({ userId }, secret, { expiresIn: '7d' });
```

### Buenas Prácticas Implementadas

✅ **No exponer datos sensibles**
- Contraseñas nunca se retornan en responses
- `user.toJSON()` excluye campos sensibles

✅ **Validación centralizada**
- Middleware `validateRequest` para todos los endpoints

✅ **Manejo centralizado de errores**
- `errorHandler` global catch all errors
- No expone stack traces en producción

✅ **Uso de asyncHandler**
- Elimina `try-catch` redundante
- Captura automática de errores async

✅ **AppError personalizado**
```javascript
throw new AppError('Mensaje', 400, 'ERROR_CODE');
```

---

## 📡 API Endpoints - Resumen

### Autenticación (`/api/v1/auth`)

| Método | Endpoint | Auth | Roles | Descripción |
|--------|----------|------|-------|-------------|
| POST | `/login` | ❌ | Todos | Iniciar sesión |
| POST | `/register` | ✅ | admin | Crear usuario |
| GET | `/me` | ✅ | Todos | Obtener perfil propio |
| PUT | `/me` | ✅ | Todos | Actualizar perfil |
| PUT | `/change-password` | ✅ | Todos | Cambiar contraseña |

### Inspecciones (`/api/v1/inspections`)

| Método | Endpoint | Auth | Roles | Descripción |
|--------|----------|------|-------|-------------|
| GET | `/` | ✅ | Todos | Listar inspecciones |
| GET | `/:id` | ✅ | Todos* | Ver inspección |
| POST | `/` | ✅ | admin, arquitecto | Crear inspección |
| PUT | `/:id` | ✅ | Todos* | Actualizar completa |
| PATCH | `/:id` | ✅ | Todos* | Actualizar parcial |
| POST | `/:id/complete` | ✅ | Todos* | Finalizar inspección |
| DELETE | `/:id` | ✅ | admin | Eliminar inspección |

\* *Con restricciones según rol*

### Health Check

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | ❌ | Estado del servidor |

---

## 🚀 Cómo Usar

### 1. Instalación

```bash
cd backend
npm install
```

### 2. Configurar .env

```env
NODE_ENV=development
PORT=4000
API_VERSION=v1

DB_HOST=localhost
DB_PORT=5432
DB_NAME=curiel_db
DB_USER=postgres
DB_PASSWORD=tu_password

JWT_SECRET=tu_secret_key
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:19006
```

### 3. Ejecutar Migraciones

```bash
npm run migrate
```

### 4. Poblar Base de Datos (Desarrollo)

```bash
npm run seed
```

### 5. Iniciar Servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

### 6. Probar con Postman

Ver [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) para ejemplos completos.

---

## 📝 Flujo de Trabajo Típico

### 1. **Admin crea un Inspector**
```http
POST /api/v1/auth/register
Authorization: Bearer {admin_token}

{
  "email": "inspector@curiel.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Inspector",
  "role": "inspector"
}
```

### 2. **Arquitecto crea una Inspección**
```http
POST /api/v1/inspections
Authorization: Bearer {arquitecto_token}

{
  "projectName": "Torre Central",
  "clientName": "ABC Corp",
  "address": "Calle 123",
  "inspectionType": "estructural",
  "scheduledDate": "2026-02-20T10:00:00Z",
  "inspectorId": "{inspector_uuid}"
}
```

### 3. **Inspector realiza la Inspección**
```http
# Ver su inspección
GET /api/v1/inspections/{id}

# Actualizar estado a "en proceso"
PATCH /api/v1/inspections/{id}
{
  "status": "en_proceso"
}

# Completar inspección
POST /api/v1/inspections/{id}/complete
```

### 4. **Ver Audit Logs** (consulta directa a BD)
```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'Inspection' 
AND entity_id = 'uuid-de-la-inspeccion'
ORDER BY created_at DESC;
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
npm test
```

### Coverage

```bash
npm run test:coverage
```

---

## 📦 Dependencias Principales

```json
{
  "express": "^4.18.2",
  "sequelize": "^6.35.2",
  "pg": "^8.11.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "express-validator": "^7.0.1",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.1.5",
  "dotenv": "^16.3.1"
}
```

---

## ✨ Características Destacadas

### 1. **Código Limpio y Modular**
- Separación clara de responsabilidades
- Controllers delgados, modelos inteligentes
- Middlewares reutilizables

### 2. **Escalable**
- Fácil agregar nuevos endpoints
- Patrón consistente en todos los controllers
- Utilidades compartidas

### 3. **Seguro**
- Múltiples capas de seguridad
- Validación exhaustiva
- Audit trail completo

### 4. **Mantenible**
- Código autodocumentado
- Comentarios claros
- Convenciones consistentes

### 5. **Listo para Producción**
- Manejo robusto de errores
- Logging apropiado
- Configuración por entorno

---

## 📞 Soporte

Para dudas o issues, revisar:
1. Esta documentación
2. Comentarios en el código
3. `POSTMAN_GUIDE.md` para ejemplos de uso

---

**¡Sistema CURIEL Backend - Listo para Producción! 🚀**
