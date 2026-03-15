# 📐 ARQUITECTURA DEL SISTEMA CURIEL

## 🎯 Visión General

CURIEL es una aplicación empresarial de inspecciones técnicas diseñada como producto SaaS escalable, con arquitectura moderna y enfoque en simplicidad de mantenimiento por un desarrollador freelance.

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE CLIENTE                          │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │   iOS App       │              │  Android App    │       │
│  │  (React Native) │              │ (React Native)  │       │
│  └────────┬────────┘              └────────┬────────┘       │
│           │                                │                │
│           └───────────────┬────────────────┘                │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   HTTPS/REST   │
                    └───────┬────────┘
┌───────────────────────────┼─────────────────────────────────┐
│                    CAPA DE BACKEND                           │
│                  ┌────────▼─────────┐                        │
│                  │   API Gateway    │                        │
│                  │  (Express.js)    │                        │
│                  └────────┬─────────┘                        │
│                           │                                  │
│     ┌─────────────────────┼─────────────────────┐           │
│     │                     │                     │           │
│ ┌───▼────┐         ┌──────▼──────┐       ┌─────▼────┐     │
│ │  Auth  │         │  Business   │       │  Storage │     │
│ │ Layer  │         │    Logic    │       │  Service │     │
│ └───┬────┘         └──────┬──────┘       └─────┬────┘     │
│     │                     │                     │           │
│     └─────────────────────┼─────────────────────┘           │
│                           │                                  │
│                  ┌────────▼─────────┐                        │
│                  │   Data Layer     │                        │
│                  │  (Sequelize ORM) │                        │
│                  └────────┬─────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                  CAPA DE DATOS                               │
│      ┌────────────────────┼────────────────────┐            │
│      │                    │                    │            │
│ ┌────▼────┐        ┌──────▼──────┐      ┌─────▼────┐      │
│ │  PostgreSQL │    │  Cloudinary │      │   n8n    │      │
│ │  (Datos)    │    │  (Imágenes) │      │ (Webhooks)│     │
│ └─────────────┘    └─────────────┘      └───────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## 🔧 Stack Tecnológico Completo

### Backend
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | 18+ | Runtime de JavaScript |
| Express.js | 4.18 | Framework web |
| PostgreSQL | 14+ | Base de datos relacional |
| Sequelize | 6.35 | ORM para PostgreSQL |
| JWT | 9.0 | Autenticación stateless |
| Bcrypt | 2.4 | Hash de contraseñas |
| Multer | 1.4 | Upload de archivos |
| Cloudinary | 1.41 | Almacenamiento de imágenes |
| PDFKit | 0.14 | Generación de PDFs |
| Nodemailer | 6.9 | Envío de emails |
| Helmet | 7.1 | Seguridad HTTP |
| CORS | 2.8 | Control de acceso |
| Morgan | 1.10 | Logging HTTP |
| Joi | 17.11 | Validación de esquemas |

### Frontend Móvil
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React Native | 0.73 | Framework móvil |
| Expo | ~50.0 | Toolchain y SDK |
| React Navigation | 6.1 | Navegación |
| Axios | 1.6 | Cliente HTTP |
| AsyncStorage | 1.21 | Persistencia local |
| Expo Camera | ~14.0 | Acceso a cámara |
| Expo Location | ~16.5 | GPS / Geolocalización |
| React Native Signature Canvas | 4.7 | Firmas digitales |

### Automatización
| Tecnología | Propósito |
|-----------|-----------|
| n8n | Workflows de automatización |
| Webhooks | Eventos asíncronos |

## 📊 Modelo de Datos

### Diagrama ER Simplificado

```
┌──────────────┐
│    Users     │
├──────────────┤
│ id (PK)      │
│ email        │
│ password     │
│ firstName    │
│ lastName     │
│ role         │◄────────┐
│ phone        │         │
│ isActive     │         │
└──────────────┘         │
       │                 │
       │ created         │ inspector
       │                 │
       ▼                 │
┌──────────────┐         │
│ Inspections  │         │
├──────────────┤         │
│ id (PK)      │         │
│ projectName  │         │
│ clientName   │         │
│ address      │◄────────┘
│ status       │
│ inspectorId  │
│ createdById  │
└──────┬───────┘
       │
       │ has many
       │
       ▼
┌─────────────────────┐
│ InspectionResponses │
├─────────────────────┤
│ id (PK)             │
│ inspectionId (FK)   │
│ checklistItemId (FK)│
│ status              │
│ observations        │
└─────────────────────┘
       │
       │ belongs to
       │
       ▼
┌──────────────────┐
│ ChecklistItems   │
├──────────────────┤
│ id (PK)          │
│ templateId (FK)  │
│ itemText         │
│ category         │
│ orderIndex       │
└──────────────────┘
       │
       │ belongs to
       │
       ▼
┌───────────────────┐
│ ChecklistTemplate │
├───────────────────┤
│ id (PK)           │
│ name              │
│ inspectionType    │
│ createdById (FK)  │
└───────────────────┘
```

## 🔐 Seguridad

### Autenticación y Autorización

**JWT (JSON Web Tokens)**
- Tokens firmados con HS256
- Expiración configurable (default: 7 días)
- Refresh tokens para sesiones largas
- Storage seguro con AsyncStorage en móvil

**Roles y Permisos**

| Rol | Crear Inspección | Realizar Inspección | Ver Todas | Eliminar | Crear Usuarios |
|-----|-----------------|---------------------|-----------|----------|----------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arquitecto | ✅ | ✅ | ✅ | ❌ | ❌ |
| Inspector | ❌ | ✅ (solo asignadas) | ❌ | ❌ | ❌ |

**Protecciones Implementadas**

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet para headers HTTP seguros
- ✅ CORS configurado
- ✅ Validación de inputs con Joi
- ✅ SQL Injection protegido (Sequelize ORM)
- ✅ XSS protegido
- ✅ Audit logging completo

## 📡 API REST

### Diseño de Endpoints

**Principios:**
- RESTful standard
- Versionado: `/api/v1/`
- Respuestas JSON consistentes
- HTTP status codes apropiados
- Paginación en listados

**Formato de Respuesta Estándar**

Éxito:
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [ ... ]
}
```

### Principales Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login | Público |
| POST | `/auth/register` | Crear usuario | Admin |
| GET | `/auth/me` | Perfil actual | Privado |
| GET | `/inspections` | Listar inspecciones | Privado |
| POST | `/inspections` | Crear inspección | Admin/Arq |
| GET | `/inspections/:id` | Ver detalle | Privado |
| PUT | `/inspections/:id` | Actualizar | Privado |
| POST | `/inspections/:id/complete` | Finalizar | Privado |
| POST | `/photos/upload` | Subir foto | Privado |

## 💾 Estrategia de Almacenamiento

### Base de Datos (PostgreSQL)

**Ventajas:**
- ACID compliant
- Relaciones complejas
- JSON support (JSONB)
- Excelente para reportes
- Escalable verticalmente

**Optimizaciones:**
- Índices en foreign keys
- Index en campos de búsqueda común
- Connection pooling (max: 5)

### Archivos (Cloudinary)

**Ventajas:**
- CDN global
- Transformaciones automáticas
- Backup automático
- Tier gratuito generoso

**Estructura:**
```
curiel/
├── inspections/
│   ├── {inspection_id}/
│   │   ├── photos/
│   │   │   └── {photo_id}.jpg
│   │   └── signatures/
│   │       ├── inspector.png
│   │       └── client.png
│   └── reports/
│       └── {inspection_id}.pdf
```

## 📱 Arquitectura Móvil

### Estructura de Componentes

```
src/
├── screens/          # Pantallas completas
│   ├── LoginScreen.js
│   ├── HomeScreen.js
│   ├── InspectionDetailScreen.js
│   └── ...
├── components/       # Componentes reutilizables
│   ├── Button.js
│   ├── Card.js
│   └── ...
├── navigation/       # Configuración de navegación
│   └── AppNavigator.js
├── services/         # Llamadas a API
│   ├── api.js
│   └── storage.js
├── context/          # State management
│   └── AuthContext.js
└── utils/            # Utilidades
    └── helpers.js
```

### State Management

**Context API** (en lugar de Redux)
- Más simple para un solo desarrollador
- Menos boilerplate
- Suficiente para esta escala

**Contextos principales:**
- `AuthContext` - Usuario y autenticación
- `InspectionContext` - Estado de inspecciones (futuro)

### Modo Offline

**Estrategia:**
1. Queue de operaciones offline
2. Sincronización automática al recuperar conexión
3. Caché de datos en AsyncStorage
4. Resolución de conflictos (last-write-wins)

## 🔄 Flujo de Automatización (n8n)

### Workflow: Inspección Finalizada

```
┌───────────────┐
│  Inspection   │
│  Completed    │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Backend     │
│ POST webhook  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│     n8n       │
│  Workflow     │
└───────┬───────┘
        │
        ├──────────────┬──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Email   │   │  SMS     │   │  Slack   │   │  Google  │
│  Cliente │   │  Admin   │   │  Notify  │   │  Sheets  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## 📈 Escalabilidad

### Horizontal Scaling (Futuro)

**Backend:**
- Stateless design permite múltiples instancias
- Load balancer (Nginx/AWS ALB)
- Redis para sesiones compartidas

**Database:**
- Read replicas para consultas
- Connection pooling
- Query optimization

### Multi-Tenant (Roadmap v2.0)

**Estrategia de Aislamiento:**
- Shared database, separate schemas
- `companyId` en todas las tablas
- Row-level security en PostgreSQL

```sql
-- Ejemplo de RLS
CREATE POLICY company_isolation ON inspections
FOR ALL
USING (companyId = current_setting('app.current_company')::uuid);
```

## 🚀 Deployment

### Ambientes

| Ambiente | Propósito | URL |
|----------|-----------|-----|
| Development | Local | localhost:4000 |
| Staging | Testing | staging.curiel.com |
| Production | Clientes | api.curiel.com |

### CI/CD Pipeline (Futuro)

```
GitHub Push
    │
    ▼
┌─────────┐
│ GitHub  │
│ Actions │
└────┬────┘
     │
     ├──────────────┬──────────────┐
     │              │              │
     ▼              ▼              ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│  Test   │   │  Build  │   │ Deploy  │
└─────────┘   └─────────┘   └─────────┘
                                  │
                                  ▼
                            ┌──────────┐
                            │ Railway/ │
                            │  Render  │
                            └──────────┘
```

## 🔍 Monitoring y Logs

### Logging Strategy

**Backend:**
- Morgan para HTTP logs
- Console logs para desarrollo
- Winston para producción (futuro)
- Sentry para error tracking (futuro)

**Audit Trail:**
- Tabla `audit_logs` registra todas las acciones
- Webhook a n8n para alertas críticas

### Métricas Clave

- Requests por segundo
- Latencia promedio
- Error rate
- Inspecciones creadas/día
- Usuarios activos

## 💡 Decisiones de Diseño

### ¿Por qué estas tecnologías?

**Node.js + Express**
- ✅ JavaScript end-to-end
- ✅ Gran ecosistema npm
- ✅ Async por defecto
- ✅ Fácil de aprender y mantener

**React Native + Expo**
- ✅ Una sola codebase para iOS y Android
- ✅ Fast refresh
- ✅ OTA updates
- ✅ Menos código nativo

**PostgreSQL**
- ✅ Open source
- ✅ JSONB para flexibilidad
- ✅ Excelente para relaciones
- ✅ Tier gratuito en Railway/Render

**Cloudinary vs S3**
- ✅ Más simple que AWS
- ✅ Transformaciones built-in
- ✅ CDN incluido
- ✅ Tier gratuito generoso

### Trade-offs Aceptados

| Decisión | Pro | Contra |
|----------|-----|--------|
| Expo en lugar de CLI puro | Setup rápido, OTA updates | Tamaño de app mayor |
| Context en lugar de Redux | Menos código | Menos escalable que Redux |
| Sequelize en lugar de TypeORM | Más maduro | Menos type-safe |
| JWT en lugar de sesiones | Stateless, escalable | No se pueden revocar fácilmente |

## 📊 Estimación de Recursos

### Para 100 usuarios activos/mes

**Backend:**
- RAM: 512MB
- CPU: 1 core
- Storage: 10GB

**Base de Datos:**
- RAM: 1GB
- Storage: 5GB

**Ancho de Banda:**
- ~50GB/mes (con Cloudinary CDN)

**Costo Mensual Estimado:** $15-25 USD

---

**Documento creado:** 2026-02-15
**Versión:** 1.0
**Autor:** Freelancer Developer
