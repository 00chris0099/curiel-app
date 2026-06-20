# Migración a Microservicios con Prisma ORM

## Resumen Ejecutivo

Migración del backend monolítico (Sequelize + 1 DB) a arquitectura modular (Prisma + 7 DBs separadas). Cada dominio de negocio tiene su propia base de datos, schema Prisma, y módulo de código independiente.

**Fecha inicio:** 2026-06-20
**Estado actual:** COMPLETADO
**Enfoque:** Monolito modular (1 backend Express, 7 PrismaClients, 7 DBs)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                  Express Backend                     │
│                                                     │
│  ┌──────┐ ┌──────────┐ ┌───────┐ ┌───────┐        │
│  │ auth │ │inspecc.  │ │ media │ │ admin │        │
│  └──┬───┘ └────┬─────┘ └──┬────┘ └──┬────┘        │
│     │          │           │         │              │
│  ┌──┴───┐ ┌────┴─────┐ ┌──┴────┐ ┌──┴────┐       │
│  │notif.│ │ alertas  │ │audit. │ │shared │       │
│  └──────┘ └──────────┘ └───────┘ └───────┘       │
│                                                     │
│  ┌──────────────────────────────────────────┐      │
│  │         src/shared/eventBus.js           │      │
│  │    (comunicación entre módulos)          │      │
│  └──────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
         │    │    │    │    │    │    │
    ┌────┴┐┌──┴─┐┌─┴──┐┌┴──┐┌┴───┐┌┴──┐┌┴───┐
    │:5434││5435││5436││5437││5438││5439││5440│
    │auth ││insp││mdea││adm.││noti││alrt││aud.│
    └─────┘└────┘└────┘└────┘└────┘└────┘└─────┘
```

---

## Bases de Datos

| # | Database | Puerto | Modelos | Dominio |
|---|----------|--------|---------|---------|
| 1 | `inspecciones` (original) | 5434 | Todos (Sequelize viejo) | **NO SE USA - backup** |
| 2 | `curiel_auth` | 5434 | User, Role, UserRole, RefreshToken, PasswordResetToken | Identidad y Acceso |
| 3 | `curiel_inspecciones` | 5435 | Inspection, InspectionStatusHistory | Workflow Principal |
| 4 | `curiel_media` | 5436 | Photo, Signature | Fotos y Firmas |
| 5 | `curiel_admin` | 5437 | Client, ChecklistTemplate, ChecklistItem | Clientes y Checklists |
| 6 | `curiel_notificaciones` | 5438 | Notification | Notificaciones |
| 7 | `curiel_alertas` | 5439 | Alert, Suspension, Evaluation | Alertas, Suspensiones, Evaluaciones |
| 8 | `curiel_auditoria` | 5440 | AuditLog | Logs de Auditoría |

### URLs de Conexión (desarrollo/migración)

```env
# DB Original (backup, no se usa)
DATABASE_URL_ORIGINAL="postgres://postgres:Ebeats2026@187.77.57.116:5434/inspecciones?sslmode=disable"

# Microservicios
DATABASE_URL_AUTH="postgres://postgres:Mineria99*@187.77.57.116:5434/curiel_auth?sslmode=disable"
DATABASE_URL_INSPECCIONES="postgres://postgres:Mineria99*@187.77.57.116:5435/curiel_inspecciones?sslmode=disable"
DATABASE_URL_MEDIA="postgres://postgres:Mineria99*@187.77.57.116:5436/curiel_media?sslmode=disable"
DATABASE_URL_ADMIN="postgres://postgres:Mineria99*@187.77.57.116:5437/curiel_admin?sslmode=disable"
DATABASE_URL_NOTIFICACIONES="postgres://postgres:Mineria99*@187.77.57.116:5438/curiel_notificaciones?sslmode=disable"
DATABASE_URL_ALERTAS="postgres://postgres:Mineria99*@187.77.57.116:5439/curiel_alertas?sslmode=disable"
DATABASE_URL_AUDITORIA="postgres://postgres:Mineria99*@187.77.57.116:5440/curiel_auditoria?sslmode=disable"
```

### URLs en Producción (VPS interno)

```env
DATABASE_URL_AUTH="postgres://postgres:Mineria99*@localhost:5434/curiel_auth?sslmode=disable"
DATABASE_URL_INSPECCIONES="postgres://postgres:Mineria99*@localhost:5435/curiel_inspecciones?sslmode=disable"
DATABASE_URL_MEDIA="postgres://postgres:Mineria99*@localhost:5436/curiel_media?sslmode=disable"
DATABASE_URL_ADMIN="postgres://postgres:Mineria99*@localhost:5437/curiel_admin?sslmode=disable"
DATABASE_URL_NOTIFICACIONES="postgres://postgres:Mineria99*@localhost:5438/curiel_notificaciones?sslmode=disable"
DATABASE_URL_ALERTAS="postgres://postgres:Mineria99*@localhost:5439/curiel_alertas?sslmode=disable"
DATABASE_URL_AUDITORIA="postgres://postgres:Mineria99*@localhost:5440/curiel_auditoria?sslmode=disable"
```

---

## Enums por Database

| Database | Enums |
|----------|-------|
| curiel_auth | DocumentType (dni, ruc, ce) |
| curiel_inspecciones | InspectionStatus (pendiente, en_proceso, lista_revision, finalizada, cancelada, reprogramada) |
| curiel_media | PhotoType (edificio, plano, area, observacion, general), SignatureType (inspector, client) |
| curiel_admin | (ninguno) |
| curiel_notificaciones | (ninguno) |
| curiel_alertas | AlertStatus (abierta, en_revision, resuelta), SuspensionReason (abandono, rendimiento, conducta, otro), SuspensionStatus (activa, levantada), EvaluationStatus (borrador, confirmada, enviada), ObservationSeverity (leve, media, alta, critica), ObservationType (humedad, electrico, sanitario, acabados, carpinteria, estructura, seguridad, otro), ObservationStatus (pendiente, corregido, requiere_revision), InspectionAreaStatus (pendiente, en_revision, observado, aprobado), ReportStatus (borrador, listo_para_revision, aprobado), InspectionResponseStatus (cumple, no_cumple, no_aplica) |
| curiel_auditoria | (ninguno) |

**Nota sobre ObservationSeverity/Type/Status**: Estos enums se usan en InspectionObservation que pertenece al dominio de inspecciones. Sin embargo, como InspectionObservation se modela junto con InspectionArea en la DB de inspecciones, estos enums van en `curiel_inspecciones`.

**Corrección**: Mover InspectionArea, InspectionObservation, InspectionSummary, InspectionResponse a `curiel_inspecciones` (no a `curiel_alertas`). Los enums de observaciones van en `curiel_inspecciones`.

### Enums Corregidos

| Database | Enums |
|----------|-------|
| curiel_auth | DocumentType |
| curiel_inspecciones | InspectionStatus, InspectionAreaStatus, ObservationSeverity, ObservationType, ObservationStatus, ReportStatus, InspectionResponseStatus |
| curiel_media | PhotoType, SignatureType |
| curiel_admin | (ninguno) |
| curiel_notificaciones | (ninguno) |
| curiel_alertas | AlertStatus, SuspensionReason, SuspensionStatus, EvaluationStatus |
| curiel_auditoria | (ninguno) |

---

## Modelos por Database (Corregido)

### curiel_auth (5 modelos)
- User
- Role
- UserRole
- RefreshToken
- PasswordResetToken

### curiel_inspecciones (6 modelos)
- Inspection
- InspectionStatusHistory
- InspectionArea
- InspectionObservation
- InspectionSummary
- InspectionResponse

### curiel_media (2 modelos)
- Photo
- Signature

### curiel_admin (3 modelos)
- Client
- ChecklistTemplate
- ChecklistItem

### curiel_notificaciones (1 modelo)
- Notification

### curiel_alertas (3 modelos)
- Alert
- Suspension
- Evaluation

### curiel_auditoria (1 modelo)
- AuditLog

**Total: 21 modelos en 7 databases**

---

## Comunicación entre Módulos

### EventBus (en memoria)

```
inspectionService ──emit──> eventBus ──on──> notificationService
  inspection:statusChanged                   (crea notificación)
  inspection:assigned
  inspection:started
  inspection:finalized
  inspection:cancelled

inspectionExecutionService ──emit──> eventBus ──on──> notificationService
  inspection:completed                      (crea notificación de revisión)
```

### Llamadas HTTP internas (futuro: service mesh)

```
evaluationService ──HTTP──> curiel_inspecciones (obtener KPIs)
suspensionService ──HTTP──> curiel_inspecciones (reasignar inspectores)
alertService ──HTTP──> curiel_alertas (consultar suspensiones)
clientService ──HTTP──> curiel_inspecciones (historial de inspecciones)
```

---

## Roadmap de Implementación

### ✅ Fase 0: Análisis y Diseño
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

- [x] Análisis de dependencias entre módulos
- [x] Definición de 7 microservicios
- [x] Asignación de modelos a cada database
- [x] Diseño de comunicación entre módulos
- [x] Documentación completa en MIGRACION_MICROSERVICIOS.md

---

### ✅ Fase A: Estructura + Databases + EventBus
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

- [x] Estructura de directorios `src/modules/` (7 módulos)
- [x] `src/lib/databases.js` — 7 PrismaClients con adapter PrismaPg
- [x] `src/shared/eventBus.js` — EventEmitter para comunicación entre módulos
- [x] `src/shared/errors.js` — AppError + asyncHandler
- [x] `.env` actualizado con 7 URLs de database
- [x] `package.json` actualizado (scripts migrate:all, seed:auth)
- [x] Eliminado `prisma/` global viejo, `prisma.config.js`, `src/lib/prisma.js`
- [x] **TEST:** Las 7 databases conectan correctamente desde databases.js

---

### ✅ Fase B: 7 Schemas Prisma
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase C: Migraciones SQL
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase D: Services
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase E: Controllers + Routes
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase F: Server + App.js
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase G: Seed Auth DB
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase H: Eliminar Código Viejo
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase I: Tests
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

### ✅ Fase J: Deploy
**Estado:** COMPLETADO
**Fecha:** 2026-06-20

---

## Patrones de Código

### PrismaClient Singleton por Módulo

```javascript
// src/lib/databases.js
const { PrismaClient: PrismaAuth } = require('../modules/auth/prisma/generated/client');
const { PrismaClient: PrismaInsp } = require('../modules/inspecciones/prisma/generated/client');
// ... 7 PrismaClients

const prisma = {
    auth: new PrismaAuth({ datasourceUrl: process.env.DATABASE_URL_AUTH }),
    inspecciones: new PrismaInsp({ datasourceUrl: process.env.DATABASE_URL_INSPECCIONES }),
    media: new PrismaMedia({ datasourceUrl: process.env.DATABASE_URL_MEDIA }),
    admin: new PrismaAdmin({ datasourceUrl: process.env.DATABASE_URL_ADMIN }),
    notificaciones: new PrismaNotif({ datasourceUrl: process.env.DATABASE_URL_NOTIFICACIONES }),
    alertas: new PrismaAlert({ datasourceUrl: process.env.DATABASE_URL_ALERTAS }),
    auditoria: new PrismaAudit({ datasourceUrl: process.env.DATABASE_URL_AUDITORIA }),
};

module.exports = { prisma };
```

### Service Pattern

```javascript
// src/modules/auth/auth.service.js
const { prisma } = require('../../lib/databases');
const bcrypt = require('bcryptjs');
const AppError = require('../../shared/errors');

class AuthService {
    get db() { return prisma.auth; }

    async findById(id) {
        const user = await this.db.user.findUnique({
            where: { id },
            include: { roles: { include: { role: true } } }
        });
        return user;
    }

    async findByEmail(email) {
        return this.db.user.findUnique({ where: { email } });
    }

    async create(data) {
        const existing = await this.findByEmail(data.email);
        if (existing) throw new AppError('Email ya registrado', 409);

        const passwordHash = await bcrypt.hash(data.password, 12);
        const user = await this.db.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                passwordHash,
                phone: data.phone,
            }
        });

        // Asignar roles
        if (data.roleIds?.length) {
            await this.db.userRole.createMany({
                data: data.roleIds.map(roleId => ({
                    userId: user.id,
                    roleId,
                }))
            });
        }

        return user;
    }

    // ... más métodos
}

module.exports = new AuthService();
```

### EventBus Pattern

```javascript
// src/shared/eventBus.js
const EventEmitter = require('events');
const eventBus = new EventEmitter();
eventBus.setMaxListeners(20);
module.exports = eventBus;

// Emisor (en inspectionService):
const eventBus = require('../../shared/eventBus');
eventBus.emit('inspection:statusChanged', {
    inspectionId, newStatus, oldStatus, userId, reason
});

// Receptor (en notificationService):
const eventBus = require('../../shared/eventBus');
eventBus.on('inspection:statusChanged', async (data) => {
    await notificationService.createForUser(data.userId, {
        type: `inspection_${data.newStatus}`,
        title: `Inspección ${data.newStatus}`,
        message: `La inspección cambió a ${data.newStatus}`,
    });
});
```

### Error Handler Pattern

```javascript
// src/middlewares/errorHandler.js (actualizado para Prisma)
const { PrismaClientKnownRequestError } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
    // Errores Prisma
    if (err instanceof PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': // Unique constraint
                return res.status(409).json({
                    success: false,
                    error: { code: 'DUPLICATE', message: 'Registro duplicado' }
                });
            case 'P2025': // Not found
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Registro no encontrado' }
                });
            case 'P2003': // FK constraint
                return res.status(400).json({
                    success: false,
                    error: { code: 'FOREIGN_KEY', message: 'Referencia inválida' }
                });
        }
    }

    // AppError (operacional)
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            error: { code: err.code, message: err.message }
        });
    }

    // Error desconocido
    console.error(err);
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL', message: 'Error interno del servidor' }
    });
};
```

---

## Notas Importantes

### Frontend y Mobile NO Cambian
- Mismos endpoints (`/api/v1/...`)
- Mismas respuestas JSON
- Misma URL base del backend

### La DB Original se Mantiene
- `inspecciones` (puerto 5434) se queda como backup
- No se migra data de ahí
- Las 7 DBs nuevas empiezan vacías

### Seguridad de URLs
- Las URLs externas son solo para migración desde máquina local
- En producción, el VPS usa `localhost`
- Después de deploy, cerrar puertos 5435-5440 al exterior

### Future: Separar en Servicios Independientes
Si en el futuro necesitas escalar, los módulos ya están listos para extraerse:
1. Cada módulo tiene su propio PrismaClient
2. La comunicación via eventBus se reemplaza por Redis pub/sub
3. Las llamadas HTTP internas se reemplazan por service mesh
4. Cada módulo se despliega como contenedor Docker separado
