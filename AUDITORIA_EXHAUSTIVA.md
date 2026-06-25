# Auditoria Exhaustiva del Proyecto CURIEL

> Fecha: 24 de Junio 2026
> Alcance: Arquitectura de Base de Datos, Backend, Frontend Web, Mobile, n8n, Infraestructura

---

## Indice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Base de Datos](#3-base-de-datos)
4. [Backend (backend_legacy/)](#4-backend)
5. [Frontend Web (frontend/)](#5-frontend-web)
6. [Mobile (mobile/)](#6-mobile)
7. [Automatizaciones n8n](#7-automatizaciones-n8n)
8. [Infraestructura y DevOps](#8-infraestructura-y-devops)
9. [Seguridad](#9-seguridad)
10. [Issues Criticos por Prioridad](#10-issues-criticos-por-prioridad)
11. [Roadmap de Mejoras](#11-roadmap-de-mejoras)

---

## 1. Resumen Ejecutivo

CURIEL es un sistema de gestion de inspecciones de propiedades construido como monorepo con 4 componentes principales:

| Componente | Stack | Estado |
|-----------|-------|--------|
| **Backend** | Node.js, Express 4, Prisma 7, PostgreSQL (7 DBs) | Funcional, con deuda tecnica |
| **Frontend Web** | React 19, TypeScript, Vite, Tailwind CSS, Zustand | Funcional, componentes oversized |
| **Mobile** | React Native + Expo SDK 50, SQLite offline-first | Funcional, sin TypeScript |
| **Automatizaciones** | n8n (4 webhooks + 3 cron jobs) | Funcional, workflows faltantes |

**Fortalezas principales:**
- Arquitectura offline-first robusta en mobile con SQLite + sync engine
- Sistema de iconos custom con 51 iconos PNG
- Dark mode completo en frontend web
- Token refresh automatico con cola de requests en ambos clientes
- Monitoreo con Prometheus + Grafana

**Debilidades principales:**
- Credenciales de produccion commiteadas en `.env`
- Componentes gigantes (>1700 lineas) sin descomponer
- Dark mode roto en 10 de 12 pantallas mobile
- Dual ORM (Prisma + Sequelize) y dual validacion (Joi + express-validator)
- Multiples dependencias instaladas pero nunca usadas

---

## 2. Arquitectura General

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile (Expo)                            │
│  React Native + SQLite (offline-first) + Axios              │
│  Puerto: Expo Go / Device                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST (API_URL)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express)                          │
│  Node.js + Prisma 7 + JWT Auth                              │
│  Puerto: 4000                                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ curiel_  │ curiel_  │ curiel_  │ curiel_  │ curiel_  │   │
│  │ auth     │inspecc.  │ media    │ admin    │notif.    │   │
│  │ :5434    │ :5435    │ :5436    │ :5437    │ :5438    │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│  ┌──────────┬──────────┐                                    │
│  │ curiel_  │ curiel_  │                                    │
│  │ alertas  │auditoria │                                    │
│  │ :5439    │ :5440    │                                    │
│  └──────────┴──────────┘                                    │
└──────────┬──────────────────────┬───────────────────────────┘
           │ Webhooks             │ HTTP
           ▼                     ▼
┌──────────────────┐  ┌──────────────────────┐
│   n8n (EasyPanel)│  │  Frontend (React)    │
│  4 webhooks      │  │  Vite + Tailwind     │
│  3 cron jobs     │  │  Puerto: 3000 (nginx)│
│  Puerto: 5678    │  │  PWA + Offline       │
└──────────────────┘  └──────────────────────┘
```

### 2.2 Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Runtime Backend | Node.js | >=18 |
| Web Framework | Express | 4.18.2 |
| ORM | Prisma | 7.8.0 |
| Base de Datos | PostgreSQL | 16 |
| Auth | JWT (access 15min + refresh 30d) | - |
| Frontend UI | React | 19.2.0 |
| Build Tool | Vite | 7.3.2 |
| CSS | Tailwind CSS | 3.4.1 |
| State (Web) | Zustand | 5.0.11 |
| Mobile | React Native + Expo SDK | 50 |
| Mobile DB | SQLite (expo-sqlite) | 13.4.0 |
| Automatizacion | n8n | - |
| Monitoreo | Prometheus + Grafana | - |
| CI/CD | GitHub Actions | - |
| Deploy | EasyPanel (Docker) | - |

---

## 3. Base de Datos

### 3.1 Arquitectura Multi-Database

El sistema usa **7 bases de datos PostgreSQL separadas**, cada una en un puerto diferente:

| Base de Datos | Puerto | Modelos | proposito |
|--------------|--------|---------|-----------|
| `curiel_auth` | 5434 | User, Role, UserRole, RefreshToken, PasswordResetToken | Autenticacion |
| `curiel_inspecciones` | 5435 | Inspection, InspectionStatusHistory, InspectionArea, InspectionObservation, InspectionSummary, InspectionResponse | Inspecciones |
| `curiel_media` | 5436 | Photo, Signature | Archivos multimedia |
| `curiel_admin` | 5437 | Client, ChecklistTemplate, ChecklistItem, ApiKey | Administracion |
| `curiel_notificaciones` | 5438 | Notification | Notificaciones |
| `curiel_alertas` | 5439 | Alert, Suspension, Evaluation | Alertas y evaluaciones |
| `curiel_auditoria` | 5440 | AuditLog | Logs de auditoria |

**Total: 21 modelos, 16 enums, 22+ indices**

### 3.2 Schema Unificado

- **Schema principal:** `backend_legacy/prisma/schema.prisma` (638 lineas)
- **Schemas modulares:** 7 archivos en `backend_legacy/src/modules/*/prisma/schema.prisma`
- **Relaciones cross-database:** Implementadas como UUID strings sin `@relacion` (limitacion de Prisma para multi-DB)

### 3.3 Migraciones

| Archivo | Proposito |
|---------|-----------|
| `scripts/migrate-all.js` | Runner principal. Genera SQL desde schemas modulares, ejecuta contra cada DB |
| `scripts/migrate-remaining.js` | Runner para notificaciones, alertas, auditoria |
| `scripts/seed-auth.js` | Seeds 4 roles + usuario admin (admin@curiel.com / Admin123*) |
| `prisma/migrations/20260622_add_api_keys/migration.sql` | Tabla api_keys |

### 3.4 SQLite (Mobile Offline-First)

6 tablas en `mobile/src/database/schema.js`:

| Tabla | Proposito |
|-------|-----------|
| `inspections` | Cache local con campos de sync (`is_dirty`, `last_synced_at`) |
| `areas` | Areas con soft delete (`is_deleted`) |
| `observations` | Observaciones locales |
| `photos` | Referencias fotos con estado de upload |
| `sync_queue` | Cola de operaciones offline→online |
| `conflicts` | Almacenamiento de resolucion de conflictos |

### 3.5 Issues de Base de Datos

| # | Severidad | Issue |
|---|-----------|-------|
| DB-1 | Critico | `.env` con credenciales de produccion commiteado (IP 187.77.57.116, passwords, JWT secret, Cloudinary keys) |
| DB-2 | Alto | Dual ORM: Sequelize instalado pero solo Prisma usado. Codigo muerto en errorHandler.js |
| DB-3 | Alto | `prisma.config.js` solo apunta a `DATABASE_URL_AUTH` - migraciones CLI solo funcionan para auth |
| DB-4 | Medio | 7 PrismaClient instances sin connection pooling compartido |
| DB-5 | Medio | Relaciones cross-DB como UUID strings sin integridad referencial |
| DB-6 | Bajo | `temp_migration.sql` es un artefacto temporal que debería eliminarse |

---

## 4. Backend (backend_legacy/)

### 4.1 Estructura

```
backend_legacy/
├── src/
│   ├── server.js              # Startup del servidor
│   ├── app.js                 # Cadena de middlewares Express
│   ├── config/                # Configuracion (index.js)
│   ├── lib/                   # Conexiones DB (databases.js)
│   ├── routes/                # 14 archivos de rutas
│   ├── controllers/           # 13 controladores
│   ├── services/              # 12 servicios
│   ├── middlewares/            # 7 middlewares
│   ├── validators/            # 8 validadores
│   ├── utils/                 # 9 utilidades
│   ├── pdf/                   # Templates de reportes PDF
│   ├── cron/                  # Tareas programadas
│   ├── modules/               # Schemas Prisma por modulo
│   └── __tests__/             # 8 archivos de test
├── prisma/                    # Schema unificado
└── scripts/                   # Scripts de migracion/seed
```

### 4.2 Dependencias Principales

| Paquete | Version | Estado |
|---------|---------|--------|
| express | 4.18.2 | Activo |
| prisma | 7.8.0 | Activo |
| sequelize | 6.37.8 | **MUERTO - no usado** |
| joi | - | Activo (validacion principal) |
| express-validator | - | Activo (solo rutas auth) |
| jsonwebtoken | - | Activo |
| bcrypt | - | Activo |
| nodemailer | - | Activo |
| puppeteer | - | Activo (PDFs) |
| cloudinary | - | Activo (archivos) |
| prometheus | - | Activo (metricas) |
| sentry | - | Activo (errores) |
| winston | - | Activo (logging) |

### 4.3 Endpoints API (14 archivos de rutas)

| Ruta | Prefijo | Auth | Validacion |
|------|---------|------|-----------|
| `authRoutes.js` | `/api/auth/*` | No (excepto profile) | express-validator |
| `usersRoutes.js` | `/api/users/*` | Admin | Joi |
| `inspectionRoutes.js` | `/api/inspections/*` | Si | Joi |
| `inspectionExecutionRoutes.js` | `/api/inspections/:id/*` | Si | Inline custom |
| `clientRoutes.js` | `/api/clients/*` | Admin | Joi |
| `checklistRoutes.js` | `/api/checklists/*` | Si | Joi |
| `photoRoutes.js` | `/api/photos/*` | Si | Joi |
| `notificationRoutes.js` | `/api/notifications/*` | Si | Ninguna |
| `evaluationRoutes.js` | `/api/evaluations/*` | Si | Joi |
| `alertRoutes.js` | `/api/alerts/*` | Si | Joi |
| `suspensionRoutes.js` | `/api/suspensions/*` | Si | Joi |
| `apiKeyRoutes.js` | `/api/api-keys/*` | Admin | Ninguna |

### 4.4 Controllers

| Controller | Responsabilidad |
|-----------|----------------|
| `authController.js` | Login, registro, refresh tokens, reset password |
| `inspectionController.js` | CRUD + transiciones de estado + estadisticas |
| `inspectionExecutionController.js` | Workflow de ejecucion (areas, obs, fotos, resumen) |
| `inspectionReportController.js` | Generacion de PDFs con Puppeteer |
| `evaluationController.js` | Creacion bulk + rankings + KPIs |
| `alertController.js` | Gestion de alertas con reasignacion |
| `suspensionController.js` | Suspension de usuarios con reasignacion |
| `clientController.js` | CRUD de clientes |
| `userController.js` | CRUD de usuarios + estadisticas |
| `notificationController.js` | Notificaciones + conteo no leidas |
| `checklistController.js` | Templates de checklist |
| `photoController.js` | Upload de fotos |
| `apiKeyController.js` | CRUD de API keys |

### 4.5 Servicios

| Servicio | Logica de Negocio |
|---------|-------------------|
| `inspectionService.js` | Maquina de estados compleja (13+ estados con reglas de transicion) |
| `inspectionReportService.js` | Puppeteer PDF + upload a Cloudinary |
| `evaluationService.js` | Calculo KPIs + evaluaciones semanales automaticas |
| `suspensionService.js` | Reasignacion de inspecciones durante suspension |
| `emailService.js` | Transporte Nodemailer con templates HTML |
| `apiKeyService.js` | Generacion y validacion de API keys |
| `clientService.js` | CRUD + eliminacion de clientes no protegidos (30 dias) |
| `userService.js` | CRUD + estadisticas |
| `notificationService.js` | Creacion y gestion |
| `alertService.js` | Gestion con niveles de gravedad |
| `syncService.js` | Sincronizacion offline→online |
| `offlineQueueService.js` | Cola IndexedDB |

### 4.6 Middlewares

| Middleware | Proposito |
|-----------|-----------|
| `auth.js` | Verificacion JWT + control de acceso por roles |
| `inspectionPermissions.js` | Control de acceso especifico por inspeccion |
| `validateJoi.js` | Validacion Joi |
| `validateRequest.js` | Validacion express-validator |
| `upload.js` | Manejo de uploads Multer |
| `errorHandler.js` | Manejador global de errores + AppError class |
| `auditLog.js` | Logging de auditoria + helper function |

### 4.7 Autenticacion y Autorizacion

**Flujo de Login:**
1. Login → JWT access token (15 min) + refresh token (30 dias)
2. Access token requerido en rutas protegidas
3. Rotacion de refresh token en renovacion
4. Password reset via email tokens (1 hora expiracion)

**Roles:** admin, supervisor, arquitecto, inspector
**Master Admin:** Flag especial en modelo User para super-admin

### 4.8 Manejo de Errores

```javascript
// AppError class
class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

// Respuesta de error estandar
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje legible"
  }
}
```

### 4.9 Issues del Backend

| # | Severidad | Issue |
|---|-----------|-------|
| BE-1 | Critico | `.env` con credenciales de produccion commiteado |
| BE-2 | Alto | Sequelize instalado pero nunca usado (dependencia muerta) |
| BE-3 | Alto | Sistema dual de validacion (Joi + express-validator) inconsistente |
| BE-4 | Alto | `inspectionExecutionController.js` usa validacion inline en vez de middleware |
| BE-5 | Alto | Rate limiter usa JWT token como key (se resetea en refresh) |
| BE-6 | Alto | Password temporal enviado en texto plano en email de bienvenida |
| BE-7 | Medio | `optionalAuth` middleware existe pero nunca se usa |
| BE-8 | Medio | Rounds de bcrypt inconsistentes (10 en controllers, 12 en seed) |
| BE-9 | Medio | No hay request ID para tracing entre logs/metricas |
| BE-10 | Medio | No hay middleware para validar API keys a pesar de que el modelo existe |
| BE-11 | Bajo | Supervisor role no documentado en Swagger ni .env.example |

---

## 5. Frontend Web (frontend/)

### 5.1 Estructura

```
frontend/
├── src/
│   ├── api/axios.ts           # Instancia Axios + interceptores
│   ├── App.tsx                # Root component, router, lazy loading
│   ├── auth/PrivateRoute.tsx  # Guard de autenticacion
│   ├── components/            # 8 componentes compartidos
│   ├── hooks/                 # 3 hooks custom
│   ├── pages/                 # 20 paginas
│   ├── services/              # 11 servicios API
│   ├── store/                 # 2 stores Zustand
│   ├── types/index.ts         # 612 lineas de tipos
│   └── utils/                 # 5 modulos utilitarios
├── tailwind.config.js
├── vite.config.ts
└── vitest.config.ts
```

### 5.2 Dependencias

| Paquete | Version | Estado |
|---------|---------|--------|
| react | 19.2.0 | Activo |
| react-router-dom | 7.13.0 | Activo |
| zustand | 5.0.11 | Activo |
| axios | 1.16.0 | Activo |
| react-hot-toast | 2.6.0 | Activo |
| lucide-react | 0.574.0 | **MUERTO - nunca importado** |
| idb | 8.0.3 | Activo (offline) |
| @sentry/react | 10.59.0 | Activo |
| vite-plugin-pwa | 1.3.0 | Activo |
| tailwindcss | 3.4.1 | Activo |
| vitest | 4.1.9 | Activo |

### 5.3 Rutas

**Publicas:**
| Ruta | Componente |
|------|-----------|
| `/login` | Login |
| `/forgot-password` | ForgotPassword |
| `/reset-password` | ResetPassword |

**Protegidas (cualquier rol autenticado):**
| Ruta | Componente |
|------|-----------|
| `/dashboard` | Dashboard |
| `/profile` | Profile |
| `/notifications` | Notifications |
| `/inspections` | Inspections |
| `/inspections/:id` | InspectionDetail |

**Protegidas (por rol):**
| Ruta | Roles Permitidos |
|------|-----------------|
| `/users` | admin |
| `/clients` | admin |
| `/clients/:id` | admin |
| `/inspections/create` | admin, arquitecto, supervisor |
| `/inspections/:id/execute` | admin, arquitecto, supervisor, inspector |
| `/inspections/:id/execute/areas/:areaId` | admin, arquitecto, supervisor, inspector |
| `/supervisor` | supervisor, admin |
| `/alerts` | supervisor, admin |
| `/evaluations` | supervisor, admin |
| `/suspensions` | supervisor, admin |
| `/supervisor/actions` | supervisor, admin |
| `/config` | admin |

**Lazy Loading:** 17 de 20 paginas usan `React.lazy`. Solo Login, ForgotPassword y ResetPassword se cargan eager.

### 5.4 State Management

**authStore.ts** (71 lineas):
- `user`, `isAuthenticated`, `isLoading`
- Actions: `login()`, `logout()`, `loadUser()`, `refreshProfile()`
- Persistencia en localStorage

**themeStore.ts** (53 lineas):
- `isDark`
- Actions: `toggleTheme()`, `setTheme()`
- Persistencia en localStorage + clase `dark` en `<html>`

### 5.5 API Layer

**Axios Configuration (`api/axios.ts`, 188 lineas):**
- Resolucion de URL: runtime config → env variable → error
- Request interceptor: Bearer token (excepto auth endpoints)
- Response interceptor: Token refresh con cola de requests para 401s
- Manejo de 429 (rate limit) y 500+ (Sentry)

**Servicios (11 archivos):**

| Servicio | Lineas | Endpoints |
|---------|--------|-----------|
| auth.service.ts | 128 | `/auth/*` |
| inspection.service.ts | 293 | `/inspections/*` |
| user.service.ts | 98 | `/users/*` |
| client.service.ts | 79 | `/clients/*` |
| notification.service.ts | 32 | `/notifications/*` |
| alert.service.ts | 54 | `/alerts/*` |
| evaluation.service.ts | 77 | `/evaluations/*` |
| suspension.service.ts | 53 | `/suspensions/*` |
| apiKey.service.ts | 73 | `/config/api-keys/*` |
| sync.service.ts | 153 | Orquestacion offline sync |
| offlineQueue.service.ts | 54 | Cola IndexedDB |

### 5.6 Componentes

| Componente | Lineas | Funcion |
|-----------|--------|---------|
| Navbar.tsx | 98 | Barra superior fija |
| Sidebar.tsx | 84 | Navegacion lateral filtrada por rol |
| CustomIcon.tsx | 181 | Sistema de 51 iconos PNG, 7 tonos, 4 tamanos, 3 variantes |
| ErrorBoundary.tsx | 69 | Class component con Sentry |
| ConnectionStatus.tsx | 148 | Indicador online/offline con toggle |
| NotificationDropdown.tsx | 220 | Campana con polling 30s |
| Loader.tsx | 27 | Spinner |
| Skeleton.tsx | 175 | 8 variantes de skeleton loading |

### 5.7 Paginas (20)

| Pagina | Lineas | Funcion |
|--------|--------|---------|
| Login.tsx | 143 | Login email/password |
| ForgotPassword.tsx | 107 | Solicitud reset password |
| ResetPassword.tsx | 157 | Nueva password via token |
| Dashboard.tsx | 154 | KPIs + acciones rapidas |
| Profile.tsx | 133 | Perfil de usuario |
| Notifications.tsx | 102 | Lista de notificaciones |
| Inspections.tsx | 307 | Lista filtrable con offline fallback |
| CreateInspection.tsx | ~1050 | Formulario multi-paso |
| InspectionDetail.tsx | 447 | Detalle + acciones de estado |
| InspectionExecution.tsx | ~1700+ | Workspace completo de ejecucion |
| InspectionAreaDetail.tsx | 707 | Vista mobile de area |
| Users.tsx | 627 | CRUD usuarios + stats |
| Clients.tsx | 471 | CRUD clientes |
| ClientDetail.tsx | 213 | Detalle cliente + inspecciones |
| SupervisorDashboard.tsx | 391 | KPIs supervisor + rankings |
| Alerts.tsx | - | Gestion alertas |
| Evaluations.tsx | - | Evaluaciones |
| Suspensions.tsx | - | Suspensiones |
| SupervisorActions.tsx | - | Acciones supervisor |
| Config.tsx | 364 | Gestion API keys |

### 5.8 Temas de Diseno

- **Fuentes:** Manrope (body) + Fraunces (headings) via Google Fonts
- **CSS Variables:** 13 design tokens con overrides dark mode
- **Componentes CSS:** `.btn`, `.card`, `.badge`, `.input` con glassmorphism
- **Dark mode:** Class-based con `dark:` prefix en Tailwind
- **Responsive:** Mobile-first con breakpoints sm/md/lg/xl/2xl

### 5.9 Issues del Frontend

| # | Severidad | Issue |
|---|-----------|-------|
| FE-1 | Critico | `dist/` (build artifacts) commiteado al repo |
| FE-2 | Alto | `InspectionExecution.tsx` tiene ~1700+ lineas (god component) |
| FE-3 | Alto | `CreateInspection.tsx` tiene ~1050 lineas |
| FE-4 | Alto | `any` pervasive en `InspectionAreaDetail.tsx` (lineas 76, 111, 143, 148, 153, 180, 281) |
| FE-5 | Alto | `any` en `offlineDb.ts` para tipos de cache |
| FE-6 | Alto | Codigo duplicado entre `InspectionExecution.tsx` e `InspectionAreaDetail.tsx` |
| FE-7 | Alto | `safeArray` helper definido en 4 lugares |
| FE-8 | Alto | `inspectionStatusLabels` duplicado en `inspectionStatus.ts` e `InspectionExecution.tsx` |
| FE-9 | Alto | `lucide-react` instalado pero nunca importado |
| FE-10 | Medio | No hay pagina 404/Not Found |
| FE-11 | Medio | No hay libreria de validacion de formularios (zod, yup, react-hook-form) |
| FE-12 | Medio | `usePrefetchCriticalData` checkea ruta `/inspections/new` pero la ruta real es `/inspections/create` |
| FE-13 | Medio | Google Fonts cargado dos veces (Inter + Manrope/Fraunces) |
| FE-14 | Medio | `Inter` font cargada en index.html pero nunca usada en CSS |
| FE-15 | Medio | No hay boundary de errores en la mayoria de rutas |
| FE-16 | Medio | No hay soporte de navegacion por teclado |
| FE-17 | Medio | No hay audit de accesibilidad (a11y) |
| FE-18 | Medio | No hay internacionalizacion (i18n) |
| FE-19 | Medio | Polling de notificaciones cada 30s sin considerar si el tab esta activo |
| FE-20 | Bajo | No hay paginacion en listas (Users limit 100, Clients limit 100) |
| FE-21 | Bajo | `apiKey.service.ts` define interfaz `ApiKey` localmente en vez de types/index.ts |
| FE-22 | Bajo | Hardcoded backend URL en index.html (dns-prefetch) |

---

## 6. Mobile (mobile/)

### 6.1 Estructura

```
mobile/
├── App.js                          # Root + navegacion + providers
├── app.json                        # Config Expo
├── eas.json                        # EAS Build profiles
├── src/
│   ├── config/index.js             # Constantes, API URL, storage keys
│   ├── context/                    # 3 Contexts (Auth, Offline, Theme)
│   ├── services/                   # api.js, syncEngine.js, offlineQueue.js
│   ├── database/                   # SQLite schema + 6 repos
│   ├── components/                 # 6 componentes
│   ├── screens/                    # 12 pantallas
│   ├── utils/                      # colors.js, uuid.js, imageOptimizer.js
│   └── __tests__/                  # 8 archivos de test
```

### 6.2 Dependencias

| Paquete | Version | Estado |
|---------|---------|--------|
| expo | ~50.0.0 | Activo |
| react | 18.2.0 | Activo |
| react-native | 0.73.0 | Activo |
| @react-navigation/stack | ^6.3.20 | Activo |
| @react-navigation/bottom-tabs | ^6.5.11 | **MUERTO** |
| @react-native-async-storage/async-storage | 1.21.0 | Activo |
| @react-native-community/netinfo | 11.1.0 | Activo |
| expo-camera | ~14.0.0 | Activo |
| expo-file-system | ~16.0.0 | Activo |
| expo-image-manipulator | ^56.0.19 | Activo |
| expo-image-picker | ~14.7.0 | Activo |
| expo-location | ~16.5.0 | **MUERTO** |
| expo-sqlite | ~13.4.0 | Activo |
| expo-status-bar | ~1.11.1 | **MUERTO** |
| react-native-chart-kit | ^6.12.0 | **MUERTO** |
| react-native-fast-image | ^8.6.3 | Activo (CachedImage) |
| react-native-signature-canvas | ^4.7.0 | **MUERTO** |
| react-native-svg | 14.1.0 | **MUERTO** (peer dep) |

**5 dependencias muertas instaladas.**

### 6.3 Navegacion

**Arquitectura:** Stack Navigator unico (sin tabs)

| Pantalla | Componente | Header |
|----------|-----------|--------|
| Login | LoginScreen | Oculto |
| Home | HomeScreen | "CURIEL - Inspecciones" |
| InspectionDetail | InspectionDetailScreen | "Detalle de Inspeccion" |
| Execution | ExecutionScreen | "Ejecucion" |
| PhotoCapture | PhotoCaptureScreen | Oculto (full-screen) |
| AreaDetail | AreaDetailScreen | "Detalle de Area" |
| ObservationForm | ObservationFormScreen | "Observacion" |
| ConflictResolution | ConflictResolutionScreen | "Conflictos" |
| OfflineStatus | OfflineStatusScreen | "Estado Offline" |
| CreateInspection | CreateInspectionScreen | "Nueva Inspeccion" |
| Profile | ProfileScreen | "Mi Perfil" |
| Settings | SettingsScreen | "Configuracion" |

**Pantallas sin navegacion:**
- `ObservationFormScreen` - Registrada pero nunca navegada (usa formularios inline)
- `ConflictResolutionScreen` - Sin punto de entrada visible desde ninguna UI

### 6.4 API Layer

**Axios (`services/api.js`):**
- Base URL desde config (default: `http://localhost:4000/api/v1`)
- Request interceptor: Bearer token + deteccion offline
- Response interceptor: Token refresh con cola

**Servicios:**
- `authService`: login, refresh, logout, getProfile, updateProfile, changePassword
- `inspectionService`: CRUD + complete + delete
- `photoService`: upload multipart

### 6.5 Contexts

| Context | Estado | Provee |
|---------|--------|--------|
| AuthContext | user, loading, isAuthenticated | login, logout, updateUser |
| OfflineContext | isOnline, isSyncing, pendingCount, conflictCount | syncNow, refreshCounts |
| ThemeContext | isDark, loaded, theme (50+ tokens) | toggleTheme |

**Provider Tree:** ErrorBoundary → ThemeProvider → AuthProvider → OfflineProvider → Navigation

### 6.6 Screens

| Pantalla | Lineas | Funcion |
|----------|--------|---------|
| LoginScreen | 161 | Login email/password |
| HomeScreen | 435 | Dashboard: stats + inspecciones + FAB |
| InspectionDetailScreen | 205 | Resumen inspeccion con areas, obs, fotos |
| ExecutionScreen | 472 | Ejecucion: areas, obs, fotos, auto-save 30s |
| PhotoCaptureScreen | 177 | Camara/galeria + compresion WebP |
| AreaDetailScreen | 191 | Detalle area + lista observaciones |
| ObservationFormScreen | 132 | Form crear/editar observacion (huerfana) |
| ConflictResolutionScreen | 102 | Resolucion conflictos sync (huerfana) |
| OfflineStatusScreen | 125 | Dashboard estado offline |
| CreateInspectionScreen | 489 | Formulario crear inspeccion |
| ProfileScreen | 121 | Perfil editable |
| SettingsScreen | 156 | Config + logout |

### 6.7 Estilos

- **Patron:** `StyleSheet.create()` en cada archivo
- **Tema:** ThemeContext con 50+ tokens de color (light/dark)
- **Problema:** Solo HomeScreen usa colores dinamicos del tema. Las demas 11 pantallas tienen colores hardcodeados en StyleSheet (dark mode roto)
- **Duplicacion:** Estilos de card, section, input, button repetidos en cada pantalla

### 6.8 Issues del Mobile

| # | Severidad | Issue |
|---|-----------|-------|
| MO-1 | Critico | Dark mode roto en 10 de 12 pantallas (colores hardcodeados) |
| MO-2 | Alto | Token refresh no dispara UI logout (api.js lineas 146-151) |
| MO-3 | Alto | ConflictResolutionScreen sin punto de navegacion |
| MO-4 | Alto | ObservationFormScreen huerfana (nunca navegada) |
| MO-5 | Alto | Settings toggles (autoSync, autoSave) son decorativos - nunca se leen |
| MO-6 | Alto | autoSave useCallback con riesgo de stale closure |
| MO-7 | Alto | 5 dependencias muertas instaladas |
| MO-8 | Alto | No hay SafeAreaProvider en el arbol de componentes |
| MO-9 | Medio | Duplicacion de funciones getStatusColor/getSeverityColor en 3 pantallas |
| MO-10 | Medio | IDs locales con `Date.now() + Math.random()` en vez de UUID |
| MO-11 | Medio | CachedImage componente nunca usado |
| MO-12 | Medio | No hay TypeScript en todo el codebase mobile |
| MO-13 | Medio | No hay configuracion de lint |
| MO-14 | Medio | `app.json` dice `"userInterfaceStyle": "light"` pero soporta dark mode |
| MO-15 | Medio | `inspectionsRepo.upsertMany` usa loop sin transaccion |
| MO-16 | Medio | Comparacion JSON.stringify fragil en syncEngine |
| MO-17 | Medio | No hay pull-to-refresh en InspectionDetail, AreaDetail, ConflictResolution |
| MO-18 | Medio | No hay boundary de errores por pantalla (solo root) |
| MO-19 | Bajo | `@babel/preset-env` instalado pero no usado |
| MO-20 | Bajo | `eas.json` submit con credenciales vacias |
| MO-21 | Bajo | LoginScreen no usa ThemeContext |
| MO-22 | Bajo | Tests superficiales (exports, SQL strings, mocks) |

---

## 7. Automatizaciones n8n

### 7.1 Workflows Webhook (4)

| Workflow | Webhook Path | Funcion |
|----------|-------------|---------|
| inspection-completed.json | `POST /webhook/inspection-completed` | Email al cliente con PDF + email al admin |
| inspection-assigned.json | `POST /webhook/inspection-assigned` | Email al inspector con detalles |
| user-notification.json | `POST /webhook/user-notification` | Email segun estado (6 estados) + alerta admin urgente |
| evaluation-notification.json | `POST /webhook/evaluation-notification` | Email evaluacion semanal al inspector + admin |

**Seguridad:** Todos validan header `X-CURIEL-SECRET` contra env var `CURIEL_SECRET_TOKEN`.

### 7.2 Workflows Cron (3)

| Workflow | Schedule | Funcion |
|----------|----------|---------|
| reminder-pending.json | `0 8 * * 1-5` (8am weekdays) | Email admin con inspecciones pendientes |
| overdue-inspections.json | `0 9 * * 1` (9am Lunes) | Email admin con inspecciones vencidas |
| database-backup.json | `0 3 * * *` (3am diario) | pg_dump + gzip + limpieza backups >30 dias |

### 7.3 Issues de n8n

| # | Severidad | Issue |
|---|-----------|-------|
| N8-1 | Alto | Falta workflow `audit-log.json` (backend lo configura pero no existe) |
| N8-2 | Alto | `N8N_WEBHOOK_EVALUATION_NOTIFICATION` no esta en .env del backend |
| N8-3 | Alto | `inspection-assigned` no esta en .env del backend |
| N8-4 | Medio | `inspection-assigned.json` usa IF node para secret en vez de Code node (inconsistente) |
| N8-5 | Medio | `database-backup.json` sin manejo de errores ni notificacion si falla |
| N8-6 | Medio | `database-backup.json` escribe a `/backups/` sin documentar volumen |
| N8-7 | Medio | Template de email inconsistente en `inspection-assigned.json` (sin estilo) |
| N8-8 | Bajo | `BACKEND_URL` usado en cron workflows pero no documentado |

---

## 8. Infraestructura y DevOps

### 8.1 Docker

| Archivo | Servicios | Proposito |
|---------|----------|-----------|
| `Dockerfile` (root) | Frontend only | Deploy EasyPanel |
| `backend_legacy/Dockerfile` | Backend | node:20-alpine + Chromium (Puppeteer) |
| `frontend/Dockerfile` | Frontend | Multi-stage: node builder → nginx |
| `docker-compose.yml` | postgres, backend, frontend | Local dev |

### 8.2 GitHub Actions

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `test.yml` | push/PR main+develop | Backend tests (Postgres container), Frontend tests, Mobile tests |
| `build.yml` | push/PR main+develop | Backend build + verify, Frontend tsc + build |
| `lint.yml` | push/PR main+develop | Backend lint, Frontend lint |

### 8.3 Monitoring

- **Prometheus:** Scrape cada 15s, target `host.docker.internal:4000/api/v1/metrics`
- **Grafana:** 7 paneles (Request Rate, Latency p95, Error Rate, Memory, CPU, Emails, Webhooks, Uptime)

### 8.4 Issues de Infraestructura

| # | Severidad | Issue |
|---|-----------|-------|
| INF-1 | Alto | `docker-compose.yml` solo tiene 1 instancia de Postgres (deberia tener 7 para las 7 DBs) |
| INF-2 | Alto | Backend Dockerfile ejecuta `migrate-all.js` y `seed-auth.js` en cada start (peligroso en prod) |
| INF-3 | Medio | `.gitignore` referencia `backend/` pero el directorio real es `backend_legacy/` |
| INF-4 | Medio | `monitoring/docker-compose.yml` usa `version: '3.8'` deprecado |
| INF-5 | Medio | Password hardcodeada de Grafana: `curiel_monitoring_2024` |
| INF-6 | Bajo | No hay health check en `database-backup.json` |

---

## 9. Seguridad

### 9.1 Issues de Seguridad

| # | Severidad | Issue | Ubicacion |
|---|-----------|-------|-----------|
| SEC-1 | **CRITICO** | `.env` con credenciales de produccion commiteado | `backend_legacy/.env` |
| SEC-2 | **CRITICO** | IP de servidor, passwords de DB, JWT secret, Cloudinary keys expuestos | `backend_legacy/.env` |
| SEC-3 | Alto | Password de admin hardcodeado en seed (`Admin123*`) | `scripts/seed-auth.js` |
| SEC-4 | Alto | Password temporal enviado en texto plano en email de bienvenida | `emailService.js` |
| SEC-5 | Alto | Tokens en localStorage (vulnerable a XSS) | Frontend + Mobile |
| SEC-6 | Alto | No hay HTTPS enforcement en la applicacion | Backend |
| SEC-7 | Medio | Password de Grafana hardcodeado | `monitoring/docker-compose.yml` |
| SEC-8 | Medio | No hay CSRF protection visible | Backend |
| SEC-9 | Medio | No hay rate limiting robusto (key basada en JWT) | Backend |
| SEC-10 | Bajo | No hay Content Security Policy headers | Frontend |

---

## 10. Issues Criticos por Prioridad

### P0 - Inmediato (Seguridad / Datos)

1. **Rotar todas las credenciales expuestas** - JWT secret, passwords de DB, Cloudinary keys, n8n secret
2. **Remover `.env` del historial de git** - Usar `git filter-branch` o BFG
3. **Remover `dist/` del repo** - Build artifacts no deben estar en version control
4. **Remover `.env` del frontend del repo**

### P1 - Alto (Funcionalidad Rota)

5. **Fix dark mode en mobile** - 10 de 12 pantallas con colores hardcodeados
6. **Fix token refresh logout en mobile** - 401 no-expired limpia tokens pero no dispara UI logout
7. **Fix `usePrefetchCriticalData`** - Ruta `/inspections/new` no existe, debería ser `/inspections/create`
8. **Fix rate limiter** - Usar IP o user ID en vez de JWT token
9. **Implementar API key middleware** - Modelo existe pero no se valida en requests
10. **Agregar workflow `audit-log.json`** en n8n

### P2 - Medio (Deuda Tecnica)

11. **Descomponer `InspectionExecution.tsx`** (~1700 lineas → componentes mas pequenos)
12. **Descomponer `CreateInspection.tsx`** (~1050 lineas)
13. **Eliminar dependencias muertas** - lucide-react (frontend), 5 paquetes (mobile), sequelize (backend)
14. **Unificar sistema de validacion** - Migrar todo a Joi o todo a express-validator
15. **Eliminar codigo duplicado** - safeArray, statusLabels, getStatusColor
16. **Agregar TypeScript al mobile**
17. **Agregar 404 page** al frontend
18. **Agregar boundary de errores** en todas las rutas del frontend
19. **Fix stale closure** en autoSave del ExecutionScreen mobile
20. **Conectar navegacion** a ConflictResolutionScreen

### P3 - Bajo (Mejoras)

21. **Agregar i18n** si se necesita multi-idioma
22. **Agregar validacion de formularios** con zod/yup
23. **Mejorar test coverage** (componentes y pantallas)
24. **Agregar lint al mobile**
25. **Mejorar accesibilidad** (aria-labels, keyboard navigation)
26. **Optimizar polling de notificaciones** (WebSocket o Visibility API)
27. **Agregar paginacion** a listas (Users, Clients)

---

## 11. Roadmap de Mejoras

### Fase 1: Seguridad Inmediata (1-2 dias)
- [ ] Rotar todas las credenciales comprometidas
- [ ] Limpiar historial de git (BFG Repo-Cleaner)
- [ ] Remover `dist/` del repo
- [ ] Asegurar `.gitignore` excluye todos los `.env`
- [ ] Agregar HTTPS enforcement

### Fase 2: Fixes Criticos (3-5 dias)
- [ ] Fix dark mode mobile (conectar ThemeContext en todas las pantallas)
- [ ] Fix token refresh logout en mobile
- [ ] Fix ruta prefetch en frontend
- [ ] Fix rate limiter
- [ ] Implementar API key middleware
- [ ] Agregar workflow audit-log en n8n

### Fase 3: Limpieza de Codigo (1 semana)
- [ ] Eliminar dependencias muertas (lucide-react, sequelize, 5 mobile packages)
- [ ] Descomponer InspectionExecution.tsx en componentes
- [ ] Descomponer CreateInspection.tsx en componentes
- [ ] Eliminar codigo duplicado (safeArray, statusLabels, getStatusColor)
- [ ] Unificar sistema de validacion
- [ ] Limpiar `temp_migration.sql`

### Fase 4: Mobile (1-2 semanas)
- [ ] Agregar TypeScript al mobile
- [ ] Conectar navegacion a pantallas huerfanas
- [ ] Fix autoSave stale closure
- [ ] Agregar SafeAreaProvider
- [ ] Agregar lint configuration
- [ ] Eliminar componentes nunca usados (CachedImage)

### Fase 5: Frontend (1 semana)
- [ ] Agregar pagina 404
- [ ] Agregar boundary de errores en todas las rutas
- [ ] Agregar validacion de formularios (zod)
- [ ] Corregir importacion de Google Fonts
- [ ] Agregar paginacion a listas
- [ ] Mejorar polling de notificaciones

### Fase 6: Calidad (2 semanas)
- [ ] Agregar tests de componentes (frontend)
- [ ] Agregar tests de screens (mobile)
- [ ] Agregar accesibilidad (a11y)
- [ ] Agregar request IDs para tracing
- [ ] Consolidar documentacion (eliminar duplicados)
- [ ] Fix .gitignore para `backend_legacy/`

---

> **Total de issues encontrados:** 89
> **Criticos:** 4 | **Altos:** 27 | **Medios:** 38 | **Bajos:** 20
