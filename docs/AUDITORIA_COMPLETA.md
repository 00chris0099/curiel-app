# AUDITORIA COMPLETA DE PROYECTO - CURIEL Inspecciones Tecnicas

> **Fecha:** 17 de Junio, 2026
> **Alcance:** Auditoria integral del sistema (Frontend, Backend, Mobile, Infraestructura)
> **Metodologia:** Revision exhaustiva de codigo, arquitectura, seguridad, desempeno y operabilidad
> **Nivel:** Produccion - Estándar agencia de software de alto nivel

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Auditoria: Backend (backend_legacy/)](#3-auditoria-backend)
4. [Auditoria: Frontend (frontend/)](#4-auditoria-frontend)
5. [Auditoria: Mobile (mobile/)](#5-auditoria-mobile)
6. [Auditoria: Infraestructura y DevOps](#6-auditoria-infraestructura-y-devops)
7. [Auditoria: Seguridad](#7-auditoria-seguridad)
8. [Auditoria: Base de Datos](#8-auditoria-base-de-datos)
9. [Hallazgos Criticos por Severidad](#9-hallazgos-criticos-por-severidad)
10. [Lo Que Profesionalmente Falta Para Produccion](#10-lo-que-profesionalmente-falta-para-produccion)

---

## 1. RESUMEN EJECUTIVO

**CURIEL** es un sistema SaaS de gestion de inspecciones tecnicas para el sector construccion/arquitectura. Permite a arquitectos, administradores e inspectores crear, ejecutar y dar seguimiento a inspecciones de departamentos, con generacion de reportes PDF, sincronizacion offline y integraciones con n8n.

### Stack Tecnologico

| Capa | Tecnologia | Estado |
|------|-----------|--------|
| Frontend Web | React 19, TypeScript, Vite 7, Tailwind CSS 3.4, Zustand | ~75% funcional |
| Backend | Node.js, Express 4.18, Sequelize 6, PostgreSQL 16 | ~70% funcional |
| Mobile | React Native + Expo SDK 50, JavaScript | ~15% funcional |
| Base de Datos | PostgreSQL 16 | Configurado |
| Automatizacion | n8n (documentado, no implementado) | 0% |
| CI/CD | No existe | 0% |
| Monitoreo | No existe | 0% |

### Veredicto General

El proyecto tiene una base tecnica solida y una arquitectura bien pensada, pero **no esta listo para produccion**. Existen problemas criticos de seguridad, ausencia total de testing, dependencias secrets comprometidas, y funcionalidades incompletas que impiden un despliegue seguro y confiable.

---

## 2. ARQUITECTURA GENERAL DEL SISTEMA

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIOS FINALES                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Browser  │  │  App Mobile  │  │  n8n (Futuro)        │  │
│  └────┬─────┘  └──────┬───────┘  └──────────┬───────────┘  │
│       │               │                      │              │
└───────┼───────────────┼──────────────────────┼──────────────┘
        │               │                      │
        ▼               ▼                      ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐
│  Frontend     │  │   Backend    │  │   Webhooks n8n       │
│  (Vite/Nginx) │──│  (Express)   │──│  (No implementado)   │
│  Puerto 80    │  │  Puerto 4000 │  │                      │
└───────────────┘  └──────┬───────┘  └──────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
              ┌─────▼───┐ ┌────▼────────┐
              │  PostgreSQL│ │ Cloudinary  │
              │  Puerto   │ │ (Fotos)     │
              │  5432     │ │             │
              └──────────┘ └─────────────┘
```

### 2.2 Flujo de Autenticacion

```
Login → POST /auth/login → Valida credenciales → Genera JWT (7 dias)
                                                        │
                    ┌───────────────────────────────────┘
                    ▼
            Token guardado en:
            - Frontend: localStorage('token')
            - Mobile: AsyncStorage('@curiel:auth_token')
                    │
                    ▼
            Requests futuros → Authorization: Bearer <token>
                    │
                    ▼
            Backend verifica JWT → Busca usuario en DB → Valida isActive
```

### 2.3 Modelo de Roles

```
Master Admin (isMasterAdmin=true)
    └── Acceso total, bypass de todos los permisos

Admin
    └── Gestion de usuarios, inspecciones, checklists

Arquitecto
    └── Crear/editar inspecciones, ejecucion, reportes

Inspector
    └── Ejecutar inspecciones asignadas, subir fotos, completar
```

### 2.4 Maquina de Estados de Inspeccion

```
                    ┌─────────────┐
                    │  pendiente  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │en_proceso│ │cancelada │ │reprogramada  │
        └────┬─────┘ └──────────┘ └──────┬───────┘
             │                           │
             ▼                           │
    ┌────────────────┐                   │
    │lista_revision  │◄──────────────────┘
    └───────┬────────┘
            │
            ▼
    ┌──────────────┐
    │  finalizada  │  (Terminal)
    └──────────────┘
```

---

## 3. AUDITORIA: BACKEND (backend_legacy/)

### 3.1 Arquitectura de Capas

El backend sigue un patron de tres capas bien estructurado:

```
Routes → Controllers → Services → Models
```

- **Routes:** Enrutamiento Express + middlewares (auth, validacion, permisos)
- **Controllers:** Parseo de input, llamada a services, formato de respuesta HTTP, audit logging
- **Services:** Logica de negocio, queries a BD, validaciones
- **Models:** Definicion de esquemas Sequelize y asociaciones

**Evaluacion:** La separacion de responsabilidades es correcta. Los controllers no acceden directamente a la BD. Los services encapsulan la logica de negocio. Sin embargo, hay inconsistencias en el uso de patron (algunos controllers no usan `asyncHandler`).

### 3.2 Endpoints Implementados (41 totales)

| Modulo | Endpoints | Estado |
|--------|-----------|--------|
| Auth (login, register, profile, password) | 5 | Funcional |
| Users (CRUD, stats, transfer) | 9 | Funcional |
| Inspections (CRUD, status, stats) | 7 | Funcional |
| Inspection Execution (areas, obs, photos, summary) | 11 | Funcional |
| Checklists (templates, items) | 8 | Funcional |
| Photos (upload, CRUD) | 6 | Funcional |
| Notifications (list, read) | 4 | Funcional |
| Health Check | 1 | Funcional |

### 3.3 Modelos de Base de Datos (15 modelos)

| Modelo | Tabla | Registros Criticos |
|--------|-------|-------------------|
| User | users | UUID PK, email unique, passwordHash, isActive, isMasterAdmin |
| Role | roles | admin, arquitecto, inspector |
| UserRole | user_roles | Relacion M:M User-Role |
| Inspection | inspections | 6 estados, FK inspector/creator, geolocalizacion |
| InspectionStatusHistory | inspection_states | Audit trail de cambios de estado |
| InspectionArea | inspection_areas | 12 areas por defecto (departamento) |
| InspectionObservation | inspection_observations | 4 severidades, 8 tipos |
| InspectionSummary | inspection_summaries | Estadisticas agregadas por inspeccion |
| InspectionResponse | inspection_responses | Respuestas a checklist items |
| ChecklistTemplate | checklist_templates | Plantillas por tipo de inspeccion |
| ChecklistItem | checklist_items | Items individuales de checklist |
| Photo | photos | URLs Cloudinary, metadata GPS |
| Signature | signatures | Firmas digitales (rutas no implementadas) |
| AuditLog | audit_logs | Trail de auditoria completo |
| Notification | notifications | Notificaciones in-app |

### 3.4 Seguridad del Backend

**Medidas implementadas:**
- Helmet (headers de seguridad HTTP)
- CORS configurable
- Rate limiting (100 req/15 min)
- bcrypt para hashing de passwords (salt rounds: 10)
- JWT Bearer token authentication
- uploads en memoria (nunca tocan disco)
- Filtro de tipos de archivo (JPEG, JPG, PNG, WebP)
- Limite de 10MB por archivo
- Escaping de HTML en templates PDF
- PasswordHash excluido de todas las respuestas toJSON()

**Problemas encontrados:**

| Severidad | Problema |
|-----------|----------|
| CRITICO | `.env` commitado con JWT_SECRET real (`curiel_super_secret_key_123`) y credenciales de DB |
| CRITICO | JWT_SECRET por defecto es debil (`cambiar_en_produccion_secret_key`) |
| CRITICO | No hay refresh tokens (JWT_REFRESH_EXPIRES_IN configurado pero nunca usado) |
| CRITICO | No hay revocacion de tokens (logout solo limpia cliente, token sigue valido 7 dias) |
| ALTO | SQL injection potencial en `migrate.js` e `inspectionStatusInfra.js` (string interpolation en raw SQL) |
| ALTO | No hay sanitizacion de input XSS (user inputs se guardan raw en DB) |
| ALTO | Validadores Joi definidos pero NO conectados a rutas (user, inspection, checklist CRUD sin validacion) |
| MEDIO | `rejectUnauthorized: false` en conexion SSL a PostgreSQL |
| MEDIO | Detalles de error expuestos en modo desarrollo |
| MEDIO | Credenciales admin por defecto (`admin@curiel.com` / `admin123`) |

### 3.5 Respuestas API - Inconsistencias

| Endpoint | Formato | Problema |
|----------|---------|----------|
| `GET /auth/me` | `{ success, data: <user> }` | Sin wrapper |
| `GET /users/profile` | `{ success, data: { user: <user> } }` | Con wrapper |
| `POST /auth/login` | `{ success, data: { user, token } }` | Token en data |
| Errores validateRequest | `{ success, message, errors: [...] }` | Campo `message` en vez de `error` |
| Errores errorHandler | `{ success, error: { code, message } }` | Formato correcto |
| `apiResponse.js` | Definido pero **nunca importado** por controllers | Muerto |

### 3.6 Dependencias No Utilizadas

| Paquete | Razon |
|---------|-------|
| `pdfkit` | Instalado pero Puppeteer se usa para PDFs |
| `sequelize-cli` | `.sequelizerc` existe pero no hay migraciones CLI |
| `supertest` | Instalado para testing pero no hay tests |

---

## 4. AUDITORIA: FRONTEND (frontend/)

### 4.1 Arquitectura

- **Componentes:** Organizados en `components/`, `pages/`, `services/`, `store/`, `types/`, `utils/`, `hooks/`
- **Routing:** React Router v7 con rutas protegidas por `PrivateRoute`
- **State:** Zustand para auth y theme, `useState` local para paginas
- **API:** Axios con interceptores para inyeccion de token y manejo de 401
- **Offline:** IndexedDB con sistema de cola de sincronizacion

### 4.2 Paginas Implementadas (10)

| Pagina | Lineas | Estado |
|--------|--------|--------|
| Login | Login form + branding | Funcional |
| Dashboard | Stats + acciones rapidas | Funcional |
| Profile | Display de perfil | Funcional |
| Users | CRUD admin de usuarios | Funcional |
| Inspections | Lista con filtros, offline fallback | Funcional |
| InspectionDetail | Overview + modal de estado | Funcional |
| InspectionExecution | Workspace completo (1501 lineas) | Funcional |
| InspectionAreaDetail | Detalle movil de area (706 lineas) | Funcional |
| CreateInspection | Formulario de 7 secciones (883 lineas) | Funcional |
| Notifications | Lista de notificaciones | Funcional |

### 4.3 Sistema Offline-First

El frontend implementa una arquitectura offline-first sofisticada:

- **IndexedDB** via `idb` para almacenamiento local
- **Cola de sincronizacion** con mapeo de IDs locales a IDs del servidor
- **Fallback automatico** cuando la API falla (muestra datos cacheados)
- **Sincronizacion manual** via boton "Sync now"
- **Merge de ejecuciones** con estrategia server-wins

**Evaluacion:** Este es uno de los puntos mas fuertes del proyecto. La implementacion offline es robusta y bien pensada.

### 4.4 Seguridad del Frontend

| Severidad | Problema |
|-----------|----------|
| CRITICO | `.env` commitado con URL de produccion real (`aimachristian-curielbackend.ajcxjb.easypanel.host`) |
| ALTO | `.env` no esta en `.gitignore` del frontend |
| ALTO | Sourcemaps habilitados en produccion (`build.sourcemap: true`) |
| ALTO | Token JWT almacenado en `localStorage` (vulnerable a XSS) |
| ALTO | Sin Content Security Policy (CSP) |
| MEDIO | `lucide-react` como dependencia pero nunca importado |
| MEDIO | `App.css` es codigo muerto (template Vite por defecto) |
| MEDIO | Dark mode parcialmente implementado |

### 4.5 TypeScript

**Configuracion:** Strict mode habilitado con `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.

**Evaluacion:** La tipificacion es robusta. `frontend/src/types/index.ts` define 417 lineas de tipos compartidos. Solo 9 usos de `any` en `InspectionAreaDetail.tsx` y 2 en `offlineDb.ts`.

### 4.6 Archivos en `dist/` commitados

El directorio `dist/` (build output) esta presente en el repositorio a pesar de estar en `.gitignore`. Esto sugiere que fue commitado antes de agregar la regla al gitignore.

---

## 5. AUDITORIA: MOBILE (mobile/)

### 5.1 Estado Actual

El modulo mobile esta en **fase muy temprana**. Solo existen 6 archivos fuente:

```
App.js                    # Entry point con navegacion condicional
src/config/index.js       # Configuracion centralizada
src/context/AuthContext.js # Provider de autenticacion
src/screens/LoginScreen.js # Formulario de login
src/screens/HomeScreen.js  # Dashboard con lista de inspecciones
src/services/api.js        # Capa Axios con interceptores
```

### 5.2 Funcionalidad Implementada

| Feature | Estado |
|---------|--------|
| Login con persistencia | Funcional |
| Navegacion condicional (auth gate) | Funcional |
| Lista de inspecciones con pull-to-refresh | Funcional |
| Estadisticas basadas en rol | Funcional |
| FAB para crear inspeccion (admin/arquitecto) | visible pero sin pantalla destino |

### 5.3 Dependencias Instaladas Pero No Utilizadas (12 paquetes)

| Paquete | Uso Planificado |
|---------|----------------|
| `expo-camera` | Tomar fotos de inspeccion |
| `expo-location` | GPS tagging |
| `expo-image-picker` | Seleccionar fotos de galeria |
| `expo-file-system` | Almacenamiento local |
| `react-native-signature-canvas` | Firmas digitales |
| `react-native-chart-kit` | Graficas de dashboard |
| `react-native-svg` | Renderizado SVG |
| `expo-status-bar` | Control de barra de estado |
| `@react-navigation/bottom-tabs` | Navegacion por tabs |
| `react-native-safe-area-context` | Insets de area segura |
| `react-native-screens` | Contenedores nativos |

### 5.4 Problemas Criticos del Mobile

| Severidad | Problema |
|-----------|----------|
| CRITICO | Directorio `assets/` no existe (icon.png, splash.png, adaptive-icon.png) - Build fallaria |
| CRITICO | Sin `eas.json` - No hay perfiles de build EAS |
| CRITICO | Sin `babel.config.js` - Depende de defaults de Expo |
| ALTO | Token en AsyncStorage (no encriptado, vulnerable en dispositivos rooted) |
| ALTO | Sin refresh de token ni manejo de expiracion |
| ALTO | 401 no redirige a login (limpia storage pero no actualiza navegacion) |
| ALTO | Sin ErrorBoundary - errores de render crasheean la app |
| ALTO | Sin boton de logout en la UI |
| MEDIO | Sin `.gitignore` para el directorio mobile |
| MEDIO | 12 pantallas planificadas, solo 2 existen |
| MEDIO | Sin testing, linting ni CI/CD |

---

## 6. AUDITORIA: INFRAESTRUCTURA Y DEVOPS

### 6.1 Docker

| Archivo | Estado | Observacion |
|---------|--------|-------------|
| `Dockerfile` (root) | Funcional | Build de frontend para EasyPanel |
| `backend_legacy/Dockerfile` | Funcional | Node 20-alpine + Chromium para Puppeteer |
| `frontend/Dockerfile` | Funcional | Multi-stage: build + Nginx |
| `docker-compose.yml` | Funcional | 3 servicios: postgres, backend, frontend |
| `frontend/nginx.conf` | Funcional | SPA fallback + runtime env injection |
| `frontend/docker-entrypoint.sh` | Funcional | Inyecta VITE_API_URL al container start |

**Evaluacion:** La configuracion Docker es solida. El multi-stage build del frontend es correcto. El entrypoint para runtime config es un patron adecuado.

### 6.2 CI/CD

**No existe ninguna configuracion de CI/CD.**

- Sin GitHub Actions
- Sin GitLab CI
- Sin Jenkins
- Sin Makefile
- Sin scripts de deploy

### 6.3 Integracion n8n - Estado Actual y Flujos Requeridos

#### Estado Actual en el Backend

El backend ya tiene la **infraestructura base** para integrar con n8n:

| Archivo | Funcion | Estado |
|---------|---------|--------|
| `src/utils/n8n.js` | Utilidad para disparar webhooks POST | Implementado |
| `src/config/index.js` | Configuracion de URLs de webhooks | Implementado |
| `.env` variables | `N8N_WEBHOOK_INSPECTION_COMPLETED`, `N8N_WEBHOOK_USER_NOTIFICATION`, `N8N_WEBHOOK_AUDIT_LOG` | Configuradas |

**Webhooks configurados en el backend:**

| Webhook Type | Variable de Entorno | Quien lo llama | Estado real |
|--------------|-------------------|-----------------|-------------|
| `userNotification` | `N8N_WEBHOOK_USER_NOTIFICATION` | `inspectionService.js:563` (cuando cambia estado) | **ACTIVO** - se llama pero n8n no lo recibe (no hay workflow) |
| `inspectionCompleted` | `N8N_WEBHOOK_INSPECTION_COMPLETED` | **NADIE** - configurado pero nunca invocado | **MUERTO** |
| `auditLog` | `N8N_WEBHOOK_AUDIT_LOG` | **NADIE** - configurado pero nunca invocado | **MUERTO** |

**Problema critico:** El backend tiene `createAuditLog()` que escribe a la tabla local `audit_logs` (54 llamadas en todo el codigo), pero **nunca** llama al webhook `auditLog` de n8n. El sistema de auditoria local funciona, pero la integracion externa no existe.

#### Flujo de Datos: Backend → n8n

```
Backend (Express)                    n8n
       │                              │
       │  POST /webhook/xxx           │
       │  { data, timestamp,          │
       │    source: "CURIEL-Backend" }│
       │─────────────────────────────>│
       │                              │  Procesa workflow
       │  200 OK (o timeout 5s)       │  ├─ Envia email
       │<─────────────────────────────│  ├─ Notifica admin
       │                              │  ├─ Registra en Sheet
       │  (no espera respuesta        │  └─ Alerta a Slack
       │   util, solo ack)            │
```

**Timeout:** 5 segundos. Si n8n no responde, el backend registra el error pero **no falla** el request principal.

---

#### FLUJOS DE N8N REQUERIDOS (7 workflows)

##### FLUJO 1: Inspeccion Completada ( Prioridad: ALTA )

**Trigger:** Webhook `POST /webhook/inspection-completed`
**Cuando se dispara:** Cuando una inspeccion pasa a estado `lista_revision` o `finalizada`
**Backend action:** Llamar `triggerN8nWebhook('inspectionCompleted', data)` desde `inspectionService.js`

**Payload del webhook:**
```json
{
    "inspectionId": "uuid",
    "projectName": "Torre Solar",
    "clientName": "Juan Perez",
    "clientEmail": "juan@ejemplo.com",
    "clientPhone": "+51 999 888 777",
    "inspectorName": "Carlos Garcia",
    "inspectorEmail": "carlos@curiel.com",
    "status": "finalizada",
    "completedDate": "2026-06-17T14:30:00Z",
    "totalAreas": 12,
    "totalObservations": 5,
    "criticalObservations": 1,
    "timestamp": "2026-06-17T14:30:05Z",
    "source": "CURIEL-Backend"
}
```

**Acciones del workflow n8n:**
1. **Email al cliente** con resumen de la inspeccion y link al reporte PDF
2. **Email al admin** notificando que la inspeccion fue completada
3. **(Opcional)** Registrar en Google Sheets como backup
4. **(Opcional)** Notificar a Slack canal #inspecciones

**Accion en backend (PENDIENTE):** Agregar en `inspectionService.js` o `inspectionExecutionController.js`:
```javascript
// Cuando la inspeccion pasa a lista_revision o finalizada:
await triggerN8nWebhook('inspectionCompleted', {
    inspectionId: inspection.id,
    projectName: inspection.projectName,
    clientName: inspection.clientName,
    clientEmail: inspection.clientEmail,
    inspectorName: inspection.inspector.fullName,
    status: history.toStatus,
    completedDate: new Date(),
    totalAreas: summary.totalAreas,
    totalObservations: summary.totalObservations,
    criticalObservations: summary.criticalObservations
});
```

---

##### FLUJO 2: Notificacion de Asignacion (Prioridad: ALTA)

**Trigger:** Webhook `POST /webhook/inspection-assigned`
**Cuando se dispara:** Cuando se crea una inspeccion o se reasigna a un inspector
**Backend action:** **NO EXISTE** - hay que crear el trigger

**Payload del webhook:**
```json
{
    "inspectionId": "uuid",
    "projectName": "Torre Solar",
    "clientName": "Juan Perez",
    "address": "Av. Javier Prado 123, Lima",
    "scheduledDate": "2026-06-20T09:00:00Z",
    "inspectionType": "departamento",
    "inspectorEmail": "carlos@curiel.com",
    "inspectorName": "Carlos Garcia",
    "assignedBy": "admin@curiel.com",
    "action": "created",
    "timestamp": "2026-06-17T10:00:00Z",
    "source": "CURIEL-Backend"
}
```

**Acciones del workflow n8n:**
1. **Email al inspector** con detalles de la inspeccion asignada
2. **Recordatorio calendarizado** 24h antes de la fecha programada
3. **(Opcional)** SMS al inspector (si se configura proveedor SMS)

**Accion en backend (PENDIENTE):** Agregar en `inspectionService.js`:
```javascript
// En createInspection() y al reasignar inspector:
await triggerN8nWebhook('inspectionAssigned', {
    inspectionId: inspection.id,
    projectName: inspection.projectName,
    clientName: inspection.clientName,
    address: inspection.address,
    scheduledDate: inspection.scheduledDate,
    inspectorEmail: inspection.inspector.email,
    inspectorName: inspection.inspector.fullName,
    action: 'created'
});
```

---

##### FLUJO 3: Cambio de Estado de Inspeccion (Prioridad: ALTA)

**Trigger:** Webhook `POST /webhook/inspection-status-changed`
**Cuando se dispara:** Cuando cambia el estado de cualquier inspeccion
**Backend action:** **YA EXISTE** como `userNotification` pero solo notifica al inspector

**Payload del webhook (ya se envia parcialmente):**
```json
{
    "channel": "internal",
    "type": "inspection_status_changed",
    "inspectionId": "uuid",
    "inspectionStatus": "en_proceso",
    "fromStatus": "pendiente",
    "recipient": {
        "id": "uuid",
        "email": "carlos@curiel.com",
        "fullName": "Carlos Garcia"
    },
    "reasonCode": null,
    "reasonLabel": null,
    "comment": null,
    "notifyClient": false,
    "timestamp": "2026-06-17T10:00:00Z",
    "source": "CURIEL-Backend"
}
```

**Acciones del workflow n8n:**
1. **Email al inspector** si la inspeccion fue reprogramada o corregida
2. **Email al cliente** si `notifyClient: true` (cuando se finaliza o cancela)
3. **Notificacion push** (futuro, requiere expo-notifications en mobile)
4. **Registrar cambio** en Google Sheets / Airtable

**Accion en backend:** Ya existe en `inspectionService.js:563`. Solo falta crear el workflow en n8n.

---

##### FLUJO 4: Auditoria y Alertas de Seguridad (Prioridad: MEDIA)

**Trigger:** Webhook `POST /webhook/audit-log`
**Cuando se dispara:** En eventos criticos del sistema
**Backend action:** **NO EXISTE** - hay que crear el trigger

**Payload del webhook:**
```json
{
    "event": "critical_action",
    "userId": "uuid",
    "userEmail": "admin@curiel.com",
    "action": "delete_inspection",
    "entityType": "Inspection",
    "entityId": "uuid",
    "changes": { "projectName": "Torre Solar" },
    "ipAddress": "190.123.456.789",
    "userAgent": "Mozilla/5.0...",
    "severity": "high",
    "timestamp": "2026-06-17T10:00:00Z",
    "source": "CURIEL-Backend"
}
```

**Acciones del workflow n8n:**
1. **Email de alerta al admin** para acciones criticas:
   - `delete_inspection`
   - `delete_user`
   - `transfer_master_admin`
   - `change_password` (de otro usuario)
   - `toggle_user_status` (deshabilitar usuario)
2. **Registrar en hoja de calculo** de auditoria
3. **(Opcional)** Alertar a Slack si hay mas de 5 eventos criticos en 1 hora

**Accion en backend (PENDIENTE):** Crear middleware o llamar desde controllers criticos:
```javascript
// Solo para eventos de ALTO RIESGO:
const criticalActions = [
    'delete_inspection', 'delete_user', 'transfer_master_admin',
    'change_password', 'toggle_user_status'
];

if (criticalActions.includes(action)) {
    await triggerN8nWebhook('auditLog', {
        event: 'critical_action',
        userId, userEmail, action, entityType, entityId,
        changes, ipAddress, userAgent, severity: 'high'
    });
}
```

---

##### FLUJO 5: Recordatorio de Inspecciones Pendientes (Prioridad: MEDIA)

**Trigger:** Cron `0 9 * * *` (todos los dias a las 9 AM)
**Cuando se dispara:** Automaticamente via cron en n8n
**Backend action:** **NO EXISTE** - n8n debe llamar al backend

**Flujo:**
```
Cron 9 AM → n8n llama GET /api/v1/inspections?status=pendiente
           → n8n procesa lista
           → Por cada inspector con inspecciones pendientes:
               → Envia email recordatorio con resumen del dia
```

**Acciones del workflow n8n:**
1. **HTTP Request** a `GET /api/v1/inspections?status=pendiente` (con auth Bearer)
2. **Agrupar** inspecciones por inspector
3. **Email a cada inspector** con:
   - Lista de inspecciones pendientes para hoy
   - Direccion y hora de cada una
   - Link directo al mapa

**Accion en backend (ya existe):** El endpoint `GET /inspections` ya filtra por rol. n8n solo necesita autenticarse.

---

##### FLUJO 6: Alerta de Inspecciones Vencidas (Prioridad: MEDIA)

**Trigger:** Cron `0 * * * *` (cada hora)
**Cuando se dispara:** Automaticamente via cron en n8n
**Backend action:** **NO EXISTE** - n8n debe llamar al backend

**Flujo:**
```
Cada hora → n8n llama GET /api/v1/inspections?status=en_proceso
           → Filtra inspecciones con scheduledDate > 7 dias atras
           → Si hay vencidas:
               → Email a admin con lista de vencidas
               → Email de recordatorio al inspector asignado
```

**Acciones del workflow n8n:**
1. **HTTP Request** a `GET /api/v1/inspections?status=en_proceso`
2. **Function** para filtrar por fecha vencida (>7 dias)
3. **Si hay resultados:**
   - Email a `admin@curiel.com` con tabla de inspecciones vencidas
   - Email a cada inspector afectado

---

##### FLUJO 7: Backup Automatico de Base de Datos (Prioridad: BAJA)

**Trigger:** Cron `0 2 * * *` (todos los dias a las 2 AM)
**Cuando se dispara:** Automaticamente via cron en n8n
**Backend action:** **NO EXISTE** - n8n ejecuta backup externo

**Flujo:**
```
Cron 2 AM → n8n ejecuta pg_dump via SSH o HTTP
           → Sube archivo a Google Drive / S3
           → Si falla → Email de alerta al admin
```

**Acciones del workflow n8n:**
1. **SSH Command** o **Execute Command** para `pg_dump`
2. **Google Drive** node para subir el dump
3. **IF** error → Email de alerta
4. **Cleanup** de dumps > 30 dias

---

#### RESUMEN: FLUJOS POR PRIORIDAD

| # | Workflow | Trigger | Backend Action | Estado Backend | Estado n8n | Prioridad |
|---|----------|---------|----------------|----------------|------------|-----------|
| 1 | Inspeccion Completada | Webhook | **PENDIENTE** (hay que agregar trigger) | Codigo listo, no se llama | No existe | ALTA |
| 2 | Asignacion de Inspeccion | Webhook | **PENDIENTE** (hay que crear) | No existe | No existe | ALTA |
| 3 | Cambio de Estado | Webhook | **EXISTE** (`userNotification`) | Funciona | No existe | ALTA |
| 4 | Auditoria Critica | Webhook | **PENDIENTE** (hay que agregar trigger) | `createAuditLog` local funciona, webhook muerto | No existe | MEDIA |
| 5 | Recordatorio Pendientes | Cron | **EXISTE** (GET /inspections) | Funciona | No existe | MEDIA |
| 6 | Inspecciones Vencidas | Cron | **EXISTE** (GET /inspections) | Funciona | No existe | MEDIA |
| 7 | Backup BD | Cron | Externo (pg_dump) | N/A | No existe | BAJA |

#### ARCHIVOS A MODIFICAR EN EL BACKEND

| Archivo | Cambio Requerido |
|---------|-----------------|
| `src/services/inspectionService.js` | Agregar `triggerN8nWebhook('inspectionCompleted', ...)` cuando status = `lista_revision` o `finalizada` |
| `src/services/inspectionService.js` | Agregar `triggerN8nWebhook('inspectionAssigned', ...)` en `createInspection()` |
| `src/controllers/inspectionController.js` | Agregar `triggerN8nWebhook('auditLog', ...)` para `delete_inspection` |
| `src/controllers/userController.js` | Agregar `triggerN8nWebhook('auditLog', ...)` para `delete_user`, `transfer_master_admin`, `toggle_user_status` |
| `src/utils/n8n.js` | Agregar case `'inspectionAssigned'` al switch |
| `src/config/index.js` | Agregar `inspectionAssigned` a la config de n8n |
| `.env` / `.env.example` | Agregar `N8N_WEBHOOK_INSPECTION_ASSIGNED` |

#### DEPENDENCIAS DE N8N PARA CADA FLUJO

| Workflow | Nodos n8n Necesarios | Integracion Externa |
|----------|---------------------|---------------------|
| 1. Inspeccion Completada | Webhook, Function, Email Send (x2) | SMTP (Gmail/SendGrid) |
| 2. Asignacion | Webhook, Function, Email Send | SMTP |
| 3. Cambio Estado | Webhook, Function, IF, Email Send | SMTP |
| 4. Auditoria | Webhook, Function, IF, Email Send | SMTP, (Slack opcional) |
| 5. Recordatorios | Cron, HTTP Request, Function, Email Send | SMTP + API_KEY del backend |
| 6. Vencidas | Cron, HTTP Request, Function, IF, Email Send | SMTP + API_KEY del backend |
| 7. Backup | Cron, Execute Command/SSH, Google Drive | SSH a BD, Google Drive API |

#### SEGURIDAD: AUTENTICACION ENTRE BACKEND Y N8N

**Requisito:** Los webhooks de n8n deben estar protegidos con un token secreto.

**En n8n:** Agregar nodo HTTP Header Auth antes de procesar:
```javascript
// Verificar token
const token = $input.all()[0].headers['x-curiel-secret'];
if (token !== 'TU_SECRET_TOKEN_AQUI') {
    throw new Error('Unauthorized');
}
```

**En backend (`src/utils/n8n.js`):**
```javascript
const response = await axios.post(webhookUrl, data, {
    timeout: 5000,
    headers: {
        'X-CURIEL-SECRET': process.env.N8N_SECRET_TOKEN
    }
});
```

**Variable de entorno a agregar:**
```env
N8N_SECRET_TOKEN=generar-token-seguro-de-32-caracteres
```

### 6.4 Estrategia de Branches

- **Unica rama:** `main`
- Sin ramas feature, develop, staging, o release
- Sin tags de version
- Mensajes de commit poco descriptivos (varios con el mismo mensaje "add cloudinary")

### 6.5 Monitoreo

| Componente | Estado |
|------------|--------|
| HTTP Logging | Morgan (dev/combined) |
| Error Tracking | No existe (Sentry planeado pero no configurado) |
| Structured Logging | No existe (Winston planeado pero no configurado) |
| Health Checks | Endpoint `/api/v1/health` implementado |
| Alertas | No existen |
| APM | No existe |

---

## 7. AUDITORIA: SEGURIDAD

### 7.1 Matriz de Vulnerabilidades

| # | Vulnerabilidad | Severidad | Ubicacion | Estado |
|---|---------------|-----------|-----------|--------|
| 1 | JWT_SECRET comprometido en `.env` commitado | CRITICO | `backend_legacy/.env` | Abierto |
| 2 | Credenciales DB en `.env` commitado | CRITICO | `backend_legacy/.env` | Abierto |
| 3 | URL de produccion en `.env` commitado | CRITICO | `frontend/.env` | Abierto |
| 4 | Sin refresh tokens ni revocacion de sesion | CRITICO | Backend auth | Abierto |
| 5 | Token en localStorage (XSS vulnerable) | ALTO | Frontend | Abierto |
| 6 | Token en AsyncStorage (no encriptado) | ALTO | Mobile | Abierto |
| 7 | Sin Content Security Policy | ALTO | Frontend/Nginx | Abierto |
| 8 | Sourcemaps en produccion | ALTO | Frontend Vite | Abierto |
| 9 | SQL injection en raw queries | ALTO | migrate.js, inspectionStatusInfra.js | Abierto |
| 10 | Sin sanitizacion XSS en inputs | ALTO | Backend | Abierto |
| 11 | Validadores Joi no conectados a rutas | ALTO | Backend validators | Abierto |
| 12 | Sin rate limiting por usuario/IP especifico | MEDIO | Backend | Abierto |
| 13 | SSL rejectUnauthorized: false | MEDIO | Backend DB config | Abierto |
| 14 | Admin password por defecto | MEDIO | Seed script | Abierto |
| 15 | Sin certificate pinning (mobile) | MEDIO | Mobile | Abierto |
| 16 | Sin biometria para re-autenticacion | BAJO | Mobile | Abierto |

### 7.2 Autenticacion - Analisis Detallado

**Problema fundamental:** El sistema usa JWT stateless sin mecanismo de revocacion.

- Un token emitido es valido por 7 dias completos
- No hay blacklist de tokens
- No hay refresh token para rotacion segura
- El logout solo limpia el storage del cliente
- Si un token es comprometido, no hay forma de invalidarlo del lado del servidor

**Impacto:** Un atacante con acceso al token tiene acceso completo al sistema por 7 dias, sin importar si el usuario cambio contrasena o fue desactivado.

### 7.3 Manejo de Secretos

| Archivo | Estado | Problema |
|---------|--------|----------|
| `.gitignore` | Excluye `.env*` | Correcto |
| `backend_legacy/.env` | En repositorio | JWT_SECRET y DB_PASSWORD expuestos |
| `frontend/.env` | En repositorio | URL de produccion expuesta |
| `.env.example` (root) | Contiene defaults debiles | `change-this-jwt-secret` |
| `.env.example` (backend) | Contiene defaults debiles | `cambiar_en_produccion_secret_key` |
| `docker-compose.yml` | Valores por defecto inline | Credenciales visibles |

---

## 8. AUDITORIA: BASE DE DATOS

### 8.1 Esquema

15 modelos Sequelize con asociaciones bien definidas. Todas las relaciones criticas usan CASCADE delete.

### 8.2 Migraciones

**No hay migraciones formales de Sequelize CLI.** El proyecto usa un script personalizado (`migrate.js`) que:

1. Prepara la tabla legacy de usuarios (renombrado de columnas)
2. Migra el enum de estados de inspeccion
3. Ejecuta `sequelize.sync({ alter: true })` para sincronizar todos los modelos

**Riesgo:** `sequelize.sync()` en produccion es peligroso. Puede alterar columnas existentes,丢弃 datos, o crear tablas no deseadas. Deberia usar migraciones versionadas.

### 8.3 Seed

El seed crea:
- 3 roles (admin, arquitecto, inspector)
- 1 usuario admin maestro
- 3 plantillas de checklist con 16 items

**Problema:** El seed se ejecuta manualmente y no tiene proteccion contra ejecucion multiple.

### 8.4 Conexiones

- Pool maximo: 5 conexiones (configurado en ARCHITECTURE.md)
- SSL deshabilitado en desarrollo
- `rejectUnauthorized: false` en produccion (RIESGO)

---

## 9. HALLAZGOS CRITICOS POR SEVERIDAD

### CRITICOS (Bloquean produccion)

1. **Secrets comprometidos en repositorio** - JWT_SECRET, credenciales de DB, URL de produccion
2. **Sin mecanismo de revocacion de tokens** - Logout inefectivo, tokens validos 7 dias
3. **Directorio assets/ no existe en mobile** - Build fallaria inmediatamente
4. **Sin eas.json en mobile** - No hay perfiles de build configurados
5. **Sin CI/CD** - No hay automatizacion de build, test o deploy

### ALTOS (Riesgo significativo)

6. **0 tests en todo el proyecto** - Frontend, backend y mobile sin tests
7. **Validadores Joi no conectados** - CRUD sin validacion de input
8. **SQL injection en raw queries** -虽然 con valores hardcodeados, patron peligroso
9. **Sourcemaps en produccion** - Exposicion de codigo fuente
10. **Sin CSP** - Frontend vulnerable a XSS
11. **Token en storage no encriptado** - Frontend (localStorage) y mobile (AsyncStorage)
12. **401 no redirige en mobile** - Usuario queda en pantalla stale
13. **Sin ErrorBoundary en mobile** - Errores de render crasheean la app
14. **Dark mode parcial** - Muchos componentes ignoran el tema

### MEDIOS (Deberia corregirse)

15. **Dependencias no utilizadas** - lucide-react, pdfkit, 12 paquetes mobile
16. **Codigo muerto** - App.css, dist/ commitado, servicios no llamados
17. **Inconsistencias en respuestas API** - apiResponse.js definido pero no usado
18. **Sin estructura de branches** - Todo en main, commits duplicados
19. **Logging insuficiente** - Solo console.log, sin structured logging
20. **Credenciales admin por defecto** - admin@curiel.com / admin123

---

## 10. LO QUE PROFESIONALMENTE FALTA PARA PRODUCCION

> **Nota:** Esta seccion resume TODO lo que una agencia de software de alto nivel consideraria indispensable antes de cualquier despliegue a produccion. Cada item incluye la accion concreta necesaria.

---

### FASE 1: SEGURIDAD (Prioridad Maxima - Semana 1-2)

#### 1.1 Rotar y proteger todos los secretos

```bash
# Acciones inmediatas:
- Revocar el JWT_SECRET actual (esta en el historial de git)
- Generar un nuevo JWT_SECRET de 64+ caracteres aleatorios
- Revocar las credenciales de DB comprometidas
- Eliminar .env del repositorio y del historial de git
- Usar secrets del proveedor de deploy (EasyPanel, Railway, etc.)
```

**Implementar:**
- Vault o variables de entorno del proveedor (nunca .env en repo)
- `.gitignore` debe excluir TODOS los `.env` (ya lo hace, pero los archivos ya estan tracked)
- `git filter-branch` o BFG para limpiar el historial

#### 1.2 Implementar refresh tokens

```
Flujo requerido:
1. Login → access token (15 min) + refresh token (30 dias)
2. Request con access token expirado → 401
3. Client usa refresh token → POST /auth/refresh → nuevo access token
4. Refresh token expirado → re-login obligatorio
5. Logout → invalidar refresh token en servidor (blacklist en DB)
```

**Archivos a crear/modificar:**
- `backend_legacy/src/models/RefreshToken.js` (nuevo modelo)
- `backend_legacy/src/services/authService.js` (logica de refresh)
- `backend_legacy/src/routes/authRoutes.js` (nuevos endpoints)
- Frontend: interceptor para auto-refresh
- Mobile: interceptor para auto-refresh

#### 1.3 Migrar tokens a storage seguro

**Frontend:**
```javascript
// Reemplazar localStorage por httpOnly cookies (más seguro)
// O usar memory-only token + refresh token en httpOnly cookie
```

**Mobile:**
```javascript
// Reemplazar AsyncStorage por expo-secure-store
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', token);
```

#### 1.4 Implementar Content Security Policy

**Nginx config:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://aimachristian-curielbackend.ajcxjb.easypanel.host;" always;
```

#### 1.5 Desactivar sourcemaps en produccion

```typescript
// vite.config.ts
build: {
    sourcemap: process.env.NODE_ENV !== 'production',
}
```

---

### FASE 2: TESTING (Prioridad Alta - Semana 2-4)

#### 2.1 Backend - Configurar Jest + Supertest

```javascript
// backend_legacy/package.json - agregar script de test real
"test": "jest --coverage --forceExit --detectOpenHandles"
```

**Tests minimos requeridos:**
- Unit tests para services (userService, inspectionService, etc.)
- Integration tests para rutas criticas (auth, inspections, execution)
- Tests de validacion (Joi schemas)
- Tests de permisos (role-based access)
- Tests del state machine de estados

**Meta:** 80% cobertura en modulo de auth e inspecciones.

#### 2.2 Frontend - Configurar Vitest + Testing Library

```bash
npm --prefix frontend install -D vitest @testing-library/react @testing-library/jest-dom
```

**Tests minimos requeridos:**
- Unit tests para utils (inspectionStatus, inspectionPermissions, iconSystem)
- Component tests para Login, CreateInspection, Users
- Integration tests para auth flow
- Tests del offline sync (IndexedDB)

#### 2.3 Mobile - Configurar Jest + React Native Testing Library

```bash
npm --prefix mobile install -D @testing-library/react-native
```

**Tests minimos requeridos:**
- Unit tests para AuthContext
- Component tests para LoginScreen, HomeScreen
- Tests de navegacion

---

### FASE 3: VALIDACION Y SANITIZACION (Prioridad Alta - Semana 3-4)

#### 3.1 Conectar validadores Joi a todas las rutas

```javascript
// Actualmente solo el execution module usa Joi
// Conectar: userValidator, inspectionValidator, checklistValidator

// Ejemplo en usersRoutes.js:
router.post('/', authenticate, authorize('admin'), validate(createUserSchema), createUser);
```

#### 3.2 Implementar sanitizacion XSS

```bash
npm install xss-sanitizer
```

```javascript
// Middleware de sanitizacion
const { sanitize } = require('xss-sanitizer');

app.use((req, res, next) => {
    if (req.body) req.body = sanitize(req.body);
    next();
});
```

#### 3.3 Implementar rate limiting granular

```javascript
// Rate limiting por endpoint critico
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 intentos de login por 15 min
    message: 'Demasiados intentos de login'
});

router.post('/auth/login', loginLimiter, login);
```

---

### FASE 4: CI/CD (Prioridad Alta - Semana 3-5)

#### 4.1 GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: backend_legacy
      - run: npm test
        working-directory: backend_legacy
        env:
          DATABASE_URL: postgresql://postgres:test_pass@localhost:5432/test_db
          JWT_SECRET: test-secret-key

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: frontend
      - run: npm run lint
        working-directory: frontend
      - run: npm run build
        working-directory: frontend

  mobile-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: mobile
      - run: npx expo lint
        working-directory: mobile
```

#### 4.2 Pipeline de Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EasyPanel/Railway
        # Configurar segun proveedor

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EasyPanel/Vercel/Netlify
        # Configurar segun proveedor
```

---

### FASE 5: OBSERVABILIDAD (Prioridad Media - Semana 4-6)

#### 5.1 Structured Logging (Winston)

```javascript
// backend_legacy/src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

module.exports = logger;
```

#### 5.2 Error Tracking (Sentry)

```javascript
// backend_legacy/src/server.js
const Sentry = require('@sentry/node');

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
});
```

```typescript
// frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
});
```

#### 5.3 Health Checks Mejorados

```javascript
// Agregar a /api/v1/health:
{
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: { status: 'connected', latency: '12ms' },
    memory: { used: '45MB', total: '128MB' },
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
}
```

#### 5.4 Métricas de Aplicacion

```javascript
// Considerar prom-client para métricas Prometheus
const client = require('prom-client');

// Métricas basicas:
// - request_duration_seconds (histograma por endpoint)
// - active_users (gauge)
// - inspections_created_total (counter)
// - inspection_status_changes_total (counter por estado)
```

---

### FASE 6: MOBILE - COMPLETAR MVP (Prioridad Media - Semana 5-8)

#### 6.1 Completar assets y configuracion

```bash
# Crear assets/ con iconos y splash
# Crear eas.json con perfiles de build
# Crear babel.config.js
# Crear .gitignore para mobile
```

#### 6.2 Implementar pantallas faltantes

| Pantalla | Prioridad | Descripcion |
|----------|-----------|-------------|
| InspectionDetail | Alta | Detalle completo de inspeccion |
| InspectionExecution | Alta | Ejecucion en campo |
| PhotoCapture | Alta | Camara + galeria |
| AreaDetail | Alta | Detalle de area con observaciones |
| ObservationForm | Alta | Formulario de observacion |
| Profile | Media | Ver/editar perfil |
| Settings | Media | Configuracion |
| OfflineSync | Media | Gestion de cola offline |

#### 6.3 Seguridad mobile

- Migrar a `expo-secure-store` para tokens
- Implementar biometria para re-autenticacion
- Agregar certificate pinning
- Implementar session timeout

---

### FASE 7: DOCUMENTACION Y GOBERNANZA (Prioridad Media - Semana 6-8)

#### 7.1 Estructura de branches

```
main (produccion)
├── develop (integracion)
├── feature/xxx (features)
├── fix/xxx (bugfixes)
├── staging (pre-produccion)
└── release/x.x.x (releases)
```

#### 7.2 Convenciones de commits

```
feat: agregar sistema de fotos
fix: corregir login en mobile
docs: actualizar API documentation
test: agregar tests para inspectionService
refactor: separar auth middleware
chore: actualizar dependencias
```

#### 7.3 LICENSE formal

```bash
# Agregar LICENSE.txt con terminos proprietarios
# Actualizar package.json "license" field
```

#### 7.4 CHANGELOG

```bash
# Crear CHANGELOG.md siguiendo Keep a Changelog
# Tags de version en git
```

---

### FASE 8: PERFORMANCE Y ESCALABILIDAD (Prioridad Baja - Semana 8-10)

#### 8.1 Backend

- [ ] Connection pooling tuning (actual: max 5)
- [ ] Query optimization (N+1 queries en includes de Sequelize)
- [ ] Pagination cursor-based en vez de offset
- [ ] Redis para cache de sesiones y rate limiting
- [ ] Background jobs para generacion de PDFs
- [ ] CDN para fotos (Cloudinary ya funciona, verificar configuracion)

#### 8.2 Frontend

- [ ] Code splitting por rutas (React.lazy)
- [ ] Optimizacion de imagenes (WebP automatico)
- [ ] Service Worker para PWA
- [ ] Prefetch de datos criticos
- [ ] Memoizacion de componentes pesados

#### 8.3 Mobile

- [ ] FlatList optimization (virtualization)
- [ ] Image caching con react-native-fast-image
- [ ] Offline-first completo (ya parcialmente implementado en frontend)
- [ ] Push notifications (expo-notifications)

---

### FASE 9: INTEGRACIONES PENDIENTES (Prioridad Baja - Semana 10-12)

#### 9.1 Integracion n8n (Ver seccion 6.3 para detalle completo)

**Resumen rapido:** 7 workflows necesarios. El backend ya tiene la utilidad `triggerN8nWebhook()` y 3 webhooks configurados. Solo `userNotification` se llama (para cambios de estado). Los otros 2 (`inspectionCompleted`, `auditLog`) estan configurados pero nunca invocados. Ademas, hay 4 workflows nuevos por crear (asignacion, recordatorios, vencidas, backup).

**Acciones inmediatas:**
1. Instanciar n8n (Docker o nube)
2. Crear los 7 workflows con autenticacion por token
3. Configurar variables de entorno en backend con las URLs de n8n
4. Agregar los triggers faltantes en el codigo del backend
5. Probar end-to-end con el endpoint de health check

#### 9.2 Email (Nodemailer)

El backend tiene configuracion SMTP pero no hay codigo de envio de emails. Con n8n, el email se maneja desde los workflows (nodos Email Send). **No es necesario implementar Nodemailer en el backend** si se usa n8n para toda la comunicacion por email.

Si se prefiere email directo desde backend (sin n8n), implementar:
- Bienvenida al registrar usuario
- Asignacion de inspeccion a inspector
- Reporte completado al cliente
- Recordatorios de inspeccion pendiente

#### 9.3 Firma Digital

El modelo `Signature` existe pero no hay rutas ni controladores. Implementar:
- Endpoint para subir firma
- Canvas de firma en mobile
- inclusion de firma en PDF

---

### RESUMEN: CHECKLIST DE PRODUCCION

| # | Item | Estado | Bloquea? |
|---|------|--------|----------|
| 1 | Rotar JWT_SECRET y DB credentials | Pendiente | SI |
| 2 | Eliminar .env del historial de git | Pendiente | SI |
| 3 | Implementar refresh tokens | Pendiente | SI |
| 4 | Agregar CSP headers | Pendiente | SI |
| 5 | Desactivar sourcemaps en prod | Pendiente | NO |
| 6 | Tests backend (minimo 80% auth) | Pendiente | SI |
| 7 | Tests frontend (minimo core flows) | Pendiente | NO |
| 8 | Conectar validadores Joi a rutas | Pendiente | SI |
| 9 | CI/CD pipeline | Pendiente | SI |
| 10 | Structured logging (Winston) | Pendiente | NO |
| 11 | Error tracking (Sentry) | Pendiente | NO |
| 12 | Health checks mejorados | Pendiente | NO |
| 13 | Mobile: assets, eas.json, babel | Pendiente | SI (mobile) |
| 14 | Mobile: pantallas faltantes | Pendiente | SI (mobile) |
| 15 | Mobile: secure token storage | Pendiente | SI (mobile) |
| 16 | Estructura de branches | Pendiente | NO |
| 17 | Convenciones de commits | Pendiente | NO |
| 18 | LICENSE formal | Pendiente | NO |
| 19 | Eliminar dependencias no usadas | Pendiente | NO |
| 20 | n8n: Instanciar servidor | Pendiente | NO |
| 21 | n8n: Crear 7 workflows con auth | Pendiente | NO |
| 22 | n8n: Agregar triggers faltantes en backend | Pendiente | NO |
| 23 | n8n: Configurar vars de entorno URLs + token | Pendiente | NO |

### TIEMPO ESTIMADO TOTAL: 10-12 semanas (1 desarrollador senior)

| Fase | Semanas | Dependencias |
|------|---------|-------------|
| Fase 1: Seguridad | 1-2 | Ninguna |
| Fase 2: Testing | 2-4 | Fase 1 |
| Fase 3: Validacion | 3-4 | Fase 1 |
| Fase 4: CI/CD | 3-5 | Fase 2 |
| Fase 5: Observabilidad | 4-6 | Fase 4 |
| Fase 6: Mobile MVP | 5-8 | Fase 1 |
| Fase 7: Documentacion | 6-8 | Fase 4 |
| Fase 8: Performance | 8-10 | Fase 2 |
| Fase 9: Integraciones | 10-12 | Fase 5 |

---

> **Conclusion:** CURIEL tiene una base arquitectonica solida y funcionalidad significativa implementada. Sin embargo, los problemas de seguridad (secret comprometidos, sin revocacion de tokens) y la ausencia total de testing hacen que **no sea seguro ni confiable para produccion** en su estado actual. Las fases 1-4 son absolutamente obligatorias antes de cualquier despliegue. Las fases 5-9 pueden executarse incrementalmente post-lanzamiento.
