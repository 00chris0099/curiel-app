# Migración Sequelize → Prisma ORM

## Resumen

Migración completa del backend de Sequelize ORM a Prisma ORM. El objetivo es:
- Eliminar dependencia de Sequelize y su complejidad
- Obtener migraciones automáticas al hacer deploy (`prisma migrate deploy`)
- Simplificar queries con el API de Prisma
- Mantener compatibilidad total con el frontend y mobile existentes

**Fecha inicio:** 2026-06-15
**Estado actual:** En progreso

---

## Arquitectura Actual → Objetivo

| Aspecto | Antes (Sequelize) | Después (Prisma) |
|---------|-------------------|------------------|
| ORM | Sequelize 6 | Prisma 5+ |
| Modelos | 21 archivos `.js` en `src/models/` | 1 archivo `prisma/schema.prisma` |
| Conexión | `src/config/database.js` (Sequelize instance) | `src/lib/prisma.js` (PrismaClient singleton) |
| Migraciones | Manual SQL o `sequelize-cli` | `prisma migrate deploy` automático |
| Relaciones | Definidas en `src/models/index.js` | Definidas en schema con `@relation` |
| Transacciones | `sequelize.transaction()` | `prisma.$transaction()` |
| Seed | `src/database/seed.js` (Sequelize models) | `prisma/seed.js` (Prisma Client) |
| Errores | `SequelizeValidationError`, etc. | `PrismaClientKnownRequestError` con codes |

---

## Archivos Afectados

### Eliminar (22 archivos)
```
src/models/Alert.js
src/models/AuditLog.js
src/models/ChecklistItem.js
src/models/ChecklistTemplate.js
src/models/Client.js
src/models/Evaluation.js
src/models/Inspection.js
src/models/InspectionArea.js
src/models/InspectionObservation.js
src/models/InspectionResponse.js
src/models/InspectionStatusHistory.js
src/models/InspectionSummary.js
src/models/Notification.js
src/models/PasswordResetToken.js
src/models/Photo.js
src/models/RefreshToken.js
src/models/Role.js
src/models/Signature.js
src/models/Suspension.js
src/models/User.js
src/models/UserRole.js
src/models/index.js
src/config/database.js
```

### Crear (2 archivos nuevos)
```
prisma/schema.prisma          — Schema completo con 21 modelos
prisma/seed.js                — Seed reescrito con Prisma
src/lib/prisma.js             — PrismaClient singleton
```

### Reescribir (20 archivos)
```
src/middlewares/auth.js               — Prisma para buscar User+Role
src/middlewares/auditLog.js           — Prisma para crear AuditLog
src/middlewares/inspectionPermissions.js — Prisma para buscar Inspection
src/middlewares/errorHandler.js       — Códigos de error Prisma
src/controllers/authController.js     — User, Role, RefreshToken, PasswordResetToken
src/controllers/photoController.js    — Photo, Inspection, ChecklistItem
src/controllers/evaluationController.js — User lookup
src/services/userService.js           — CRUD completo con Prisma
src/services/inspectionService.js     — Queries complejas + transacciones
src/services/inspectionExecutionService.js — El más complejo
src/services/inspectionReportService.js    — Solo lectura
src/services/alertService.js          — CRUD estándar
src/services/suspensionService.js     — CRUD + Op.in/Op.notIn
src/services/evaluationService.js     — Aggregaciones pesadas
src/services/notificationService.js   — bulkCreate, updateMany
src/services/clientService.js         — CRUD + búsqueda
src/services/checklistService.js      — CRUD + bulkCreate
src/cron/weeklyEvaluation.js          — User/Role via Prisma
src/utils/inspectionStatusInfra.js    — Raw SQL via $queryRaw
src/utils/notificationInfra.js        — Eliminar (innecesario con Prisma)
src/server.js                         — Conexión Prisma en vez de Sequelize
src/database/seed.js                  — Reescrito como prisma/seed.js
scripts/change-password.js            — Prisma Client
scripts/verify.js                     — Actualizar checks
```

---

## Fases de Implementación

### ✅ Fase 1: Setup Prisma
**Estado:** COMPLETADO
**Archivos creados:** `prisma/schema.prisma`, `prisma.config.js`, `src/lib/prisma.js`
**Archivos modificados:** `package.json` (scripts, seed config, prisma deps)

**Acciones realizadas:**
1. ✅ `npm install prisma @prisma/client @prisma/adapter-pg`
2. ✅ `npx prisma init` + config `.js` (CommonJS)
3. ✅ `prisma/schema.prisma` con 21 modelos, 14 enums, todas las relaciones
4. ✅ `src/lib/prisma.js` singleton con PrismaPg adapter
5. ✅ `npx prisma generate` — 21 modelos, 14 enums verificados
6. ✅ `package.json` actualizado (scripts prisma, seed config)

**Nota:** Prisma 7 requiere `@prisma/adapter-pg` porque eliminó el motor binario.

**Schema decisions:**
- Usar `@map` y `@@map` para mantener nombres de tablas/columnas existentes
- Enums como `enum` en Prisma con valores exactos
- UUIDs: `@default(uuid())` para PostgreSQL
- Relaciones: `@relation` con `onDelete` donde aplique
- Índices: `@@index`, `@@unique` donde aplique

---

### ⬜ Fase 2: Migration Init
**Estado:** Pendiente
**Depende de:** Fase 1

**Pasos:**
1. Configurar `DATABASE_URL` en `.env` (apuntando a DB local)
2. `npx prisma migrate dev --name init`
3. Verificar que el SQL generado coincide con el schema actual
4. Para producción (DB existente sin datos faltantes): usar `npx prisma db push` o `--create-only`
5. Commit del migration folder

---

### ⬜ Fase 3: Seed
**Estado:** Pendiente
**Depende de:** Fase 1

**Pasos:**
1. Crear `prisma/seed.js` reescrito con Prisma Client
2. Crear roles base (admin, supervisor, arquitecto, inspector)
3. Crear/verificar admin master
4. Crear checklist templates de ejemplo
5. Configurar `package.json` → `"prisma": { "seed": "node prisma/seed.js" }`
6. Test: `npx prisma db seed`

---

### ⬜ Fase 4: Infrastructure Utils
**Estado:** Pendiente
**Depende de:** Fase 1

**Archivos:**
- `src/utils/inspectionStatusInfra.js` → Reescribir con `prisma.$queryRaw`
- `src/utils/notificationInfra.js` → Eliminar (Prisma maneja schema via migrations)

---

### ⬜ Fase 5: Middlewares
**Estado:** Pendiente
**Depende de:** Fase 1

**Archivos y cambios:**

| Archivo | Sequelize Actual | Prisma Nuevo |
|---------|-----------------|--------------|
| `auth.js` | `User.findByPk(id, { include: [Role] })` | `prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } })` |
| `auditLog.js` | `AuditLog.create(data)` | `prisma.auditLog.create({ data })` |
| `inspectionPermissions.js` | `Inspection.findByPk(id)` | `prisma.inspection.findUnique({ where: { id } })` |
| `errorHandler.js` | Match `SequelizeValidationError` etc. | Match `PrismaClientKnownRequestError` con `code` |

**Códigos de error Prisma a manejar:**
- `P2002` → Unique constraint (→ 409 Conflict)
- `P2003` → Foreign key constraint (→ 400 Bad Request)
- `P2025` → Record not found (→ 404 Not Found)
- `P2014` → Required relation missing (→ 400 Bad Request)

---

### ⬜ Fase 6: Controllers
**Estado:** Pendiente
**Depende de:** Fase 5

Solo 3 controllers usan modelos directamente:

| Archivo | Modelos | Cambios |
|---------|---------|---------|
| `authController.js` | User, Role, RefreshToken, PasswordResetToken | CRUD + comparePassword (bcrypt directo) + generateToken (crypto directo) |
| `photoController.js` | Photo, Inspection, ChecklistItem, User | CRUD + includes |
| `evaluationController.js` | User | Solo `findByPk` (1 línea) |

Los otros 9 controllers solo delegan a services — no cambian.

---

### ⬜ Fase 7: Services (EL MÁS GRANDE)
**Estado:** Pendiente
**Depende de:** Fase 5

**Orden de migración (dependencias):**
1. `emailService.js` → SIN CAMBIOS (no usa Sequelize)
2. `notificationService.js` → Independiente
3. `clientService.js` → Independiente
4. `checklistService.js` → Independiente
5. `alertService.js` → Independiente
6. `userService.js` → Independiente (requiere transacciones)
7. `suspensionService.js` → Depende de User, Alert, Inspection
8. `inspectionService.js` → Depende de User, Inspection, NotificationService
9. `inspectionExecutionService.js` → Depende de Inspection, Areas, Observations, Summary
10. `inspectionReportService.js` → Depende de Inspection, Areas, Photos, Signatures
11. `evaluationService.js` → Depende de User, Inspection, Photo

**Patrones a convertir en cada service:**

| Sequelize Pattern | Prisma Equivalente |
|-------------------|-------------------|
| `Model.findAndCountAll({ where, include, offset, limit })` | `prisma.model.findMany({ where, include, skip, take })` + `prisma.model.count({ where })` |
| `Model.findByPk(id, { include })` | `prisma.model.findUnique({ where: { id }, include })` |
| `Model.findOne({ where })` | `prisma.model.findFirst({ where })` |
| `Model.findAll({ where, include })` | `prisma.model.findMany({ where, include })` |
| `Model.create(data)` | `prisma.model.create({ data })` |
| `Model.update(data, { where })` | `prisma.model.updateMany({ where, data })` |
| `Model.destroy({ where })` | `prisma.model.deleteMany({ where })` |
| `Model.count({ where })` | `prisma.model.count({ where })` |
| `Model.max('field', { where })` | `prisma.model.aggregate({ _max: { field: true }, where })` |
| `Model.bulkCreate(array)` | `prisma.model.createMany({ data: array })` |
| `instance.save()` | `prisma.model.update({ where: { id }, data })` |
| `instance.reload()` | Re-query: `prisma.model.findUnique({ where: { id }, include })` |
| `instance.destroy()` | `prisma.model.delete({ where: { id } })` |
| `Model.build(data)` + `.save()` | `prisma.model.upsert(...)` o `create`/`update` |
| `Op.or` / `Op.iLike` | `OR: [{ field: { contains, mode: 'insensitive' } }]` |
| `Op.between` | `field: { gte, lte }` |
| `Op.in` / `Op.notIn` | `field: { in: [...] }` / `field: { notIn: [...] }` |
| `sequelize.transaction(fn)` | `prisma.$transaction(async (tx) => { ... })` |
| `include: [{ model, as, where }]` | `include: { relationName: { where } }` |
| `through: { attributes: [] }` | No necessário en Prisma (auto-oculto) |
| `attributes: { exclude: [...] }` | `select: { field: true }` (explícito) |
| `required: false` (LEFT JOIN) | Prisma usa LEFT JOIN por defecto en optional relations |
| `addRole()` / `setRoles()` | `prisma.user.update({ data: { roles: { connect/set } } })` |

---

### ⬜ Fase 8: Cron Jobs
**Estado:** Pendiente
**Depende de:** Fase 7

| Archivo | Cambios |
|---------|---------|
| `weeklyEvaluation.js` | Reemplazar `User.findOne` con Prisma |
| `autoDeleteClients.js` | Sin cambios directos (usa clientService) |

---

### ⬜ Fase 9: Server & App
**Estado:** Pendiente
**Depende de:** Fase 5-7

**Pasos:**
1. Reescribir `src/server.js`:
   - Eliminar `require('./config/database')` y `testConnection()`
   - Eliminar `require('./models')` y `sequelize.sync()`
   - Agregar `const { prisma } = require('./lib/prisma')` y `await prisma.$connect()`
   - Graceful shutdown: `await prisma.$disconnect()`
2. Eliminar `src/config/database.js`
3. Eliminar directorio `src/models/` completo (22 archivos)

---

### ⬜ Fase 10: Scripts
**Estado:** Pendiente
**Depende de:** Fase 1

| Archivo | Cambios |
|---------|---------|
| `scripts/change-password.js` | Reescribir con Prisma Client |
| `scripts/verify.js` | Actualizar checks de dependencias (quitar sequelize, agregar prisma) |

---

### ⬜ Fase 11: Tests
**Estado:** Pendiente
**Depende de:** Fase 5-7

**Archivos a actualizar:**
- `src/__tests__/setup.js` — Mock de prisma en vez de models
- `src/__tests__/auth.test.js` — Mocks de prisma.user, prisma.role, etc.
- `src/__tests__/permissions.test.js` — Mock de prisma.inspection
- `src/__tests__/supervisor.test.js` — Mocks de prisma
- `src/__tests__/client.test.js` — Mock de prisma.client
- `src/__tests__/inspection.test.js` — Mocks de prisma
- `src/__tests__/execution.test.js` — Mocks de prisma

**Estrategia de mocking:**
```javascript
// jest.mock('../../lib/prisma', () => ({
//   prisma: {
//     user: { findUnique: jest.fn(), findMany: jest.fn(), ... },
//     inspection: { findUnique: jest.fn(), findMany: jest.fn(), ... },
//     ...
//   }
// }));
```

---

### ⬜ Fase 12: Deploy Prep
**Estado:** Pendiente
**Depende de:** Todas las anteriores

**Pasos:**
1. Actualizar `Dockerfile`:
   - Agregar `npx prisma generate` en build stage
   - Agregar `npx prisma migrate deploy` en CMD/entrypoint
2. Actualizar `package.json`:
   - Quitar scripts `migrate` y `seed` (o re-apuntar a Prisma)
   - Agregar `"prisma": { "seed": "node prisma/seed.js" }`
3. Verificar `npm ci` funciona
4. Test build completo
5. Push a `develop`, merge a `main`, deploy en EasyPanel

---

## Variables de Entorno Requeridas

```env
# Prisma (reutiliza la misma DATABASE_URL de Sequelize)
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Para SSL en producción (EasyPanel)
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&sslmode=require"
```

## Prisma 7 - Notas Importantes

**Prisma 7.8.0** eliminó el motor binario. Usa un adapter para PostgreSQL:
- `@prisma/adapter-pg` con `pg` (ya instalado)
- `prisma.config.js` (CommonJS, no `.ts`)
- `PrismaPg` adapter en `src/lib/prisma.js`
- `prisma-client-js` generator (no el nuevo `prisma-client` que es TypeScript-only)

---

## Rollback Plan

Si algo falla en producción:
1. El código anterior (con Sequelize) está en el commit previo
2. Revertir el merge a `main`
3. Redesplegar en EasyPanel (el botón "Implementar" usa el commit de `main`)
4. La DB no se pierde (Prisma migrations son aditivas)

---

## Notas de Implementación

- **No renombrar tablas ni columnas** — Usar `@map` y `@@map` para mantener compatibilidad con DB existente
- **UUIDs** — Prisma soporta `@default(uuid())` nativo en PostgreSQL
- **Transacciones** — Prisma `$transaction` recibe un client `tx` que se pasa a cada operación
- **M2M (User-Role)** — Prisma maneja la tabla pivote automáticamente con `roles: { connect: [{ id }] }`
- **Operadores_case_insensitive** — En PostgreSQL con Prisma: `{ contains: 'text', mode: 'insensitive' }`
- **Sequelize `include` anidados** → Prisma `include: { relation: { include: { ... } } }`
- **Sequelize `attributes.exclude`** → Prisma usa `select` explícito (campos a incluir, no excluir)
