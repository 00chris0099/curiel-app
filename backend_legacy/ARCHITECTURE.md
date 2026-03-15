# 🏗️ ARQUITECTURA TÉCNICA - CURIEL BACKEND

## 📐 Visión General

El backend de CURIEL sigue una **arquitectura en capas** con separación clara de responsabilidades, siguiendo los principios SOLID y las mejores prácticas de desarrollo backend profesional.

---

## 🎯 CAPAS DE LA APLICACIÓN

```
┌─────────────────────────────────────────────────┐
│              HTTP REQUEST                       │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         MIDDLEWARES GLOBALES                    │
│  • Helmet (Seguridad)                          │
│  • CORS                                        │
│  • Rate Limiting                               │
│  • Body Parser                                 │
│  • Morgan (Logging)                            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│              ROUTES LAYER                       │
│  • Definición de endpoints                     │
│  • Middleware de autenticación                 │
│  • Middleware de autorización                  │
│  • Middleware de validación                    │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│            CONTROLLERS LAYER                    │
│  • Manejo de HTTP Request/Response            │
│  • Llamada a servicios                        │
│  • Transformación de datos                    │
│  • Auditoría                                   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│             SERVICES LAYER                      │
│  • Lógica de negocio                          │
│  • Validaciones de negocio                    │
│  • Orquestación de operaciones                │
│  • Manejo de errores de negocio               │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│              MODELS LAYER                       │
│  • Sequelize ORM                               │
│  • Definición de esquemas                     │
│  • Relaciones entre modelos                   │
│  • Validaciones de base de datos              │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│            POSTGRESQL DATABASE                  │
└─────────────────────────────────────────────────┘
```

---

## 📂 ESTRUCTURA DE DIRECTORIOS

```
backend/
├── src/
│   ├── config/              # Configuraciones
│   │   ├── index.js         # Config central (DB, JWT, etc)
│   │   ├── database.js      # Conexión a PostgreSQL
│   │   └── swagger.js       # Configuración de Swagger
│   │
│   ├── models/              # Modelos ORM (Sequelize)
│   │   ├── User.js
│   │   ├── Inspection.js
│   │   ├── ChecklistTemplate.js
│   │   ├── ChecklistItem.js
│   │   ├── InspectionResponse.js
│   │   ├── Photo.js
│   │   ├── Signature.js
│   │   ├── AuditLog.js
│   │   └── index.js         # Relaciones entre modelos
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── userService.js
│   │   ├── inspectionService.js
│   │   └── checklistService.js
│   │
│   ├── controllers/         # Lógica de endpoints
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── inspectionController.js
│   │   ├── checklistController.js
│   │   └── photoController.js
│   │
│   ├── routes/              # Definición de rutas
│   │   ├── index.js         # Router principal
│   │   ├── authRoutes.js
│   │   ├── usersRoutes.js
│   │   ├── inspectionRoutes.js
│   │   ├── checklistRoutes.js
│   │   └── photoRoutes.js
│   │
│   ├── middlewares/         # Middlewares custom
│   │   ├── auth.js          # Autenticación JWT
│   │   ├── errorHandler.js  # Manejo de errores
│   │   ├── auditLog.js      # Auditoría
│   │   ├── upload.js        # Multer config
│   │   └── validateRequest.js
│   │
│   ├── validators/          # Schemas de validación
│   │   ├── userValidator.js
│   │   ├── inspectionValidator.js
│   │   └── checklistValidator.js
│   │
│   ├── utils/               # Utilidades
│   │   └── cloudinary.js    # Helpers de Cloudinary
│   │
│   ├── database/            # Scripts de DB
│   │   ├── migrate.js
│   │   └── seed.js
│   │
│   └── server.js            # Punto de entrada
│
├── scripts/                 # Scripts de utilidad
│   └── verify.js            # Verificador de setup
│
├── .env                     # Variables de entorno
├── .env.example             # Ejemplo de variables
├── package.json
├── API_DOCUMENTATION.md     # Documentación completa
├── QUICKSTART.md            # Guía rápida
├── REQUEST_EXAMPLES.md      # Ejemplos de requests
└── README.md
```

---

## 🔄 FLUJO DE UNA REQUEST

### Ejemplo: Crear Inspección

```
1. HTTP REQUEST
   POST /api/v1/inspections
   ↓

2. MIDDLEWARES GLOBALES
   ✓ Helmet → Headers de seguridad
   ✓ CORS → Validar origen
   ✓ Rate Limit → Verificar límite de requests
   ✓ Body Parser → Parsear JSON
   ↓

3. ROUTER
   /api/v1/inspections → inspectionRoutes
   ↓

4. ROUTE MIDDLEWARES
   ✓ authenticate → Verificar JWT token
   ✓ authorize('admin', 'arquitecto') → Verificar rol
   ↓

5. CONTROLLER
   inspectionController.createInspection()
   ✓ Extraer datos del request
   ✓ Llamar al service
   ✓ Registrar auditoría
   ✓ Retornar respuesta
   ↓

6. SERVICE
   inspectionService.createInspection()
   ✓ Validar inspector existe
   ✓ Validar rol del inspector
   ✓ Crear inspección en DB
   ✓ Cargar relaciones
   ✓ Retornar datos
   ↓

7. MODEL
   Inspection.create()
   ✓ Validar datos
   ✓ Insertar en PostgreSQL
   ↓

8. DATABASE
   PostgreSQL ejecuta INSERT
   ↓

9. RESPONSE
   {
     "success": true,
     "message": "Inspección creada",
     "data": { inspection }
   }
```

---

## 🛡️ SEGURIDAD - CAPAS DE PROTECCIÓN

### 1. Nivel de Red
- ✅ **Helmet** - Headers HTTP seguros
- ✅ **CORS** - Control de orígenes
- ✅ **Rate Limiting** - Prevención de abuso

### 2. Nivel de Autenticación
- ✅ **JWT** - Tokens con expiración
- ✅ **Bcrypt** - Hash de contraseñas (10 rounds)
- ✅ **Middleware authenticate** - Validación de token

### 3. Nivel de Autorización
- ✅ **Middleware authorize** - Control por roles
- ✅ **Validación de ownership** - Usuario solo ve sus datos

### 4. Nivel de Validación
- ✅ **Joi Schemas** - Validación de inputs
- ✅ **Sequelize Validators** - Validación en DB
- ✅ **File Type Validation** - Solo imágenes permitidas

### 5. Nivel de Base de Datos
- ✅ **Sequelize ORM** - Prevención de SQL Injection
- ✅ **Prepared Statements** - Queries parametrizadas
- ✅ **Constraints** - Integridad referencial

---

## 📊 MODELOS Y RELACIONES

```
User (usuarios)
├── hasMany → Inspection (como inspector)
├── hasMany → Inspection (como creador)
├── hasMany → Photo (subidas)
├── hasMany → ChecklistTemplate (creadas)
└── hasMany → AuditLog

Inspection (inspecciones)
├── belongsTo → User (inspector)
├── belongsTo → User (creador)
├── hasMany → Photo
├── hasMany → InspectionResponse
└── hasMany → Signature

ChecklistTemplate (plantillas)
├── belongsTo → User (creador)
└── hasMany → ChecklistItem

ChecklistItem (ítems)
├── belongsTo → ChecklistTemplate
├── hasMany → InspectionResponse
└── hasMany → Photo

Photo (fotos)
├── belongsTo → Inspection
├── belongsTo → ChecklistItem (opcional)
└── belongsTo → User (uploader)

InspectionResponse (respuestas)
├── belongsTo → Inspection
└── belongsTo → ChecklistItem

Signature (firmas)
└── belongsTo → Inspection

AuditLog (auditoría)
└── belongsTo → User
```

---

## 🔐 SISTEMA DE ROLES Y PERMISOS

### Roles Definidos

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| **admin** | 3 | Acceso total al sistema |
| **arquitecto** | 2 | Gestión de inspecciones y checklists |
| **inspector** | 1 | Ejecución de inspecciones |

### Matriz de Permisos

| Recurso | Admin | Arquitecto | Inspector |
|---------|-------|------------|-----------|
| **Usuarios** |
| Crear | ✅ | ❌ | ❌ |
| Leer todos | ✅ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |
| **Inspecciones** |
| Crear | ✅ | ✅ | ❌ |
| Leer todas | ✅ | ✅ | ❌ |
| Leer propias | ✅ | ✅ | ✅ |
| Actualizar | ✅ | ✅ | ✅* |
| Eliminar | ✅ | ❌ | ❌ |
| **Checklists** |
| Crear template | ✅ | ✅ | ❌ |
| Leer template | ✅ | ✅ | ✅ |
| Actualizar template | ✅ | ✅ | ❌ |
| Eliminar template | ✅ | ❌ | ❌ |
| **Fotos** |
| Subir | ✅ | ✅ | ✅ |
| Leer | ✅ | ✅ | ✅ |
| Eliminar propia | ✅ | ✅ | ✅ |
| Eliminar cualquiera | ✅ | ❌ | ❌ |

\* Solo inspecciones asignadas

---

## 📝 SISTEMA DE AUDITORÍA

### Tabla: audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),        -- login, create, update, delete, etc.
  entity_type VARCHAR(50),    -- User, Inspection, Photo, etc.
  entity_id UUID,
  changes JSONB,              -- Datos modificados
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP
);
```

### Acciones Auditadas

- ✅ `login` - Inicio de sesión
- ✅ `logout` - Cierre de sesión
- ✅ `create_user` - Creación de usuario
- ✅ `update_user` - Actualización de usuario
- ✅ `delete_user` - Eliminación de usuario
- ✅ `create_inspection` - Creación de inspección
- ✅ `update_inspection` - Actualización de inspección
- ✅ `change_inspection_status` - Cambio de estado
- ✅ `delete_inspection` - Eliminación de inspección
- ✅ `upload_photo` - Subida de foto
- ✅ `delete_photo` - Eliminación de foto
- ✅ `create_checklist_template` - Creación de template
- ✅ `update_checklist_template` - Actualización de template
- ✅ `delete_checklist_template` - Eliminación de template

---

## 🔄 MANEJO DE ERRORES

### Jerarquía de Errores

```
Error
└── AppError (custom)
    ├── ValidationError (400)
    ├── UnauthorizedError (401)
    ├── ForbiddenError (403)
    ├── NotFoundError (404)
    └── InternalServerError (500)
```

### Error Handler Pipeline

```
1. Ocurre error en cualquier capa
   ↓
2. throw new AppError(message, statusCode, code)
   ↓
3. asyncHandler captura el error
   ↓
4. next(error) → pasa al error handler
   ↓
5. errorHandler middleware procesa
   ↓
6. Determina tipo de error:
   • Sequelize → Traduce a error de negocio
   • JWT → Error de autenticación
   • Multer → Error de archivo
   • AppError → Ya está formateado
   • Unknown → Error 500 genérico
   ↓
7. Responde con formato estándar:
   {
     "success": false,
     "error": {
       "code": "ERROR_CODE",
       "message": "Mensaje claro",
       "details": "..." (solo development)
     }
   }
```

---

## 🚀 OPTIMIZACIONES IMPLEMENTADAS

### Performance
- ✅ **Compression** - Compresión gzip de responses
- ✅ **Connection Pooling** - Pool de conexiones a DB
- ✅ **Lazy Loading** - Carga de relaciones bajo demanda
- ✅ **Pagination** - Listados paginados
- ✅ **Indexes** - Índices en DB (email, foreign keys)

### Seguridad
- ✅ **Helmet** - Headers HTTP seguros
- ✅ **Rate Limiting** - 100 requests / 15 min
- ✅ **Input Validation** - Joi en todos los endpoints
- ✅ **SQL Injection Prevention** - Sequelize ORM
- ✅ **XSS Prevention** - Sanitización automática

### Escalabilidad
- ✅ **Stateless API** - Sin sesiones en servidor
- ✅ **Service Layer** - Lógica reutilizable
- ✅ **Environment Config** - Variables por entorno
- ✅ **Horizontal Scaling Ready** - Sin estado compartido

---

## 🔧 TECNOLOGÍAS Y VERSIONES

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime |
| Express | 4.18+ | Framework web |
| PostgreSQL | 14+ | Base de datos |
| Sequelize | 6.35+ | ORM |
| JWT | 9.0+ | Autenticación |
| Joi | 17.11+ | Validación |
| Bcrypt | 2.4+ | Hashing passwords |
| Multer | 1.4+ | Upload de archivos |
| Cloudinary | 1.41+ | Storage de imágenes |
| Swagger | 6.2+ | Documentación |
| Helmet | 7.1+ | Seguridad |
| Morgan | 1.10+ | Logging |

---

## 📈 MÉTRICAS Y MONITOREO

### Health Check Endpoint
```
GET /api/v1/health

Retorna:
• Estado del servidor
• Estado de la DB
• Latencia de DB
• Uso de memoria
• Uptime
• Versión de la API
```

### Logs
- **Morgan** en desarrollo: formato `dev` (coloreado)
- **Morgan** en producción: formato `combined` (Apache)
- **Console.log** para eventos importantes
- **Error logs** siempre registrados

---

## 🔮 EXTENSIBILIDAD

### Agregar Nuevo Módulo

1. **Crear Modelo** en `src/models/`
2. **Agregar Relaciones** en `src/models/index.js`
3. **Crear Service** en `src/services/`
4. **Crear Controller** en `src/controllers/`
5. **Crear Validator** en `src/validators/`
6. **Crear Routes** en `src/routes/`
7. **Registrar Routes** en `src/routes/index.js`
8. **Documentar en Swagger** en schemas

### Agregar Nuevo Endpoint

1. **Definir validador** (Joi schema)
2. **Crear función en service**
3. **Crear función en controller**
4. **Agregar ruta** con middlewares apropiados
5. **Documentar en Swagger**
6. **Agregar ejemplo** en REQUEST_EXAMPLES.md

---

## 📚 REFERENCIAS

- **Express:** https://expressjs.com/
- **Sequelize:** https://sequelize.org/
- **JWT:** https://jwt.io/
- **Joi:** https://joi.dev/
- **Swagger:** https://swagger.io/
- **Cloudinary:** https://cloudinary.com/documentation

---

**Arquitectura diseñada para producción y escalabilidad** 🏗️

_Última actualización: 17 de febrero de 2026_
