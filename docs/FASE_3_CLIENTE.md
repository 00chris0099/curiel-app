# FASE 3: ENTIDAD CLIENTE - Plan de Implementacion

> **Fecha inicio:** 18 de Junio, 2026
> **Duracion estimada:** 1 semana
> **Dependencias:** Fase 2 completada

---

## Tabla de Contenidos

1. [Resumen](#1-resumen)
2. [Tarea 3.1: Modelo Client](#2-tarea-31-modelo-client)
3. [Tarea 3.2: Servicio Client](#3-tarea-32-servicio-client)
4. [Tarea 3.3: Validador Client](#4-tarea-33-validador-client)
5. [Tarea 3.4: Controller Client](#5-tarea-34-controller-client)
6. [Tarea 3.5: Rutas Client](#6-tarea-35-rutas-client)
7. [Tarea 3.6: Relacion Client-Inspection](#7-tarea-36-relacion-client-inspection)
8. [Tarea 3.7: Auto-eliminacion](#8-tarea-37-auto-eliminacion)
9. [Tarea 3.8: Busqueda de clientes](#9-tarea-38-busqueda-de-clientes)
10. [Tarea 3.9: Panel de clientes (frontend)](#10-tarea-39-panel-de-clientes-frontend)
11. [Tarea 3.10: Historial de inspecciones por cliente](#11-tarea-310-historial-de-inspecciones-por-cliente)
12. [Tarea 3.11: Tests](#12-tarea-311-tests)

---

## 1. Resumen

La Fase 3 implementa la entidad Client como componente central del sistema. Un cliente representa la entidad que solicita la inspeccion tecnica.

### Esquema del Cliente

```javascript
Client {
    id: UUID (PK)
    documentType: ENUM('dni', 'ruc', 'ce')
    documentNumber: String (unique, not null)
    firstName: String (nullable)
    lastName: String (nullable)
    razonSocial: String (nullable)
    email: String (unique, not null)
    phone: String (optional)
    address: String (optional)
    isProtected: Boolean (default false)
    createdAt: Date
    updatedAt: Date
}
```

### Reglas de Negocio

| Regla | Descripcion |
|-------|-------------|
| Unicidad | Un cliente es unico por documento (DNI/RUC/CE) y por email |
| Nombre o Razon | Debe tener firstName+lastName O razonSocial (al menos uno) |
| Relacion | Una inspeccion = un cliente. Un cliente = muchas inspecciones |
| Auto-eliminacion | Clientes nuevos sin inspecciones se eliminan a los 15 dias |
| Proteccion | Solo masterAdmin puede marcar `isProtected: true` |
| Eliminacion | Permanente (hard delete), no soft delete |

### Archivos a crear/modificar

| Archivo | Tipo | Paquete |
|---------|------|---------|
| `src/models/Client.js` | NUEVO | backend |
| `src/services/clientService.js` | NUEVO | backend |
| `src/validators/clientValidator.js` | NUEVO | backend |
| `src/controllers/clientController.js` | NUEVO | backend |
| `src/routes/clientRoutes.js` | NUEVO | backend |
| `src/routes/index.js` | MODIFICAR | backend |
| `src/models/index.js` | MODIFICAR | backend |
| `src/models/Inspection.js` | MODIFICAR | backend |
| `src/cron/autoDeleteClients.js` | NUEVO | backend |
| `src/server.js` | MODIFICAR | backend |
| `frontend/src/types/index.ts` | MODIFICAR | frontend |
| `frontend/src/services/client.service.ts` | NUEVO | frontend |
| `frontend/src/pages/Clients.tsx` | NUEVO | frontend |
| `frontend/src/pages/ClientDetail.tsx` | NUEVO | frontend |
| `frontend/src/App.tsx` | MODIFICAR | frontend |
| `frontend/src/components/Sidebar.tsx` | MODIFICAR | frontend |
| `backend_legacy/src/__tests__/client.test.js` | NUEVO | backend |
| `frontend/src/__tests__/Clients.test.tsx` | NUEVO | frontend |

---

## 2. Tarea 3.1: Modelo Client

### Archivo: `backend_legacy/src/models/Client.js` (NUEVO)

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    documentType: {
        type: DataTypes.ENUM('dni', 'ruc', 'ce'),
        allowNull: false,
        field: 'document_type'
    },
    documentNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'document_number'
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'first_name'
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'last_name'
    },
    razonSocial: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'razon_social'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isProtected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_protected'
    }
}, {
    tableName: 'clients',
    timestamps: true,
    underscored: true
});

module.exports = Client;
```

### Validaciones del modelo

- `documentType`: ENUM('dni', 'ruc', 'ce')
- `documentNumber`: requerido, unico
- `email`: requerido, unico, formato email
- Al menos uno de: (firstName + lastName) o razonSocial

---

## 3. Tarea 3.2: Servicio Client

### Archivo: `backend_legacy/src/services/clientService.js` (NUEVO)

Metodos:
- `getAllClients(filters)` — Listar con paginacion y busqueda
- `getClientById(id)` — Obtener uno con conteo de inspecciones
- `createClient(data, creatorId)` — Crear con validaciones
- `updateClient(id, data, updaterId)` — Actualizar
- `deleteClient(id)` — Hard delete (solo sin inspecciones o admin/masterAdmin)
- `searchClients(query)` — Busqueda por documento, nombre, email
- `getClientInspections(id, filters)` — Historial de inspecciones
- `autoDeleteClients()` — Cron job: eliminar sin proteccion y sin inspecciones a los 15 dias

---

## 4. Tarea 3.3: Validador Client

### Archivo: `backend_legacy/src/validators/clientValidator.js` (NUEVO)

```javascript
const createClientSchema = Joi.object({
    documentType: Joi.string().valid('dni', 'ruc', 'ce').required(),
    documentNumber: Joi.string().min(8).max(20).required(),
    firstName: Joi.string().min(2).optional(),
    lastName: Joi.string().min(2).optional(),
    razonSocial: Joi.string().min(3).optional(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional().allow('', null),
    address: Joi.string().optional().allow('', null),
    isProtected: Joi.boolean().optional()
}).or('razonSocial', 'firstName');

const updateClientSchema = Joi.object({
    documentType: Joi.string().valid('dni', 'ruc', 'ce').optional(),
    documentNumber: Joi.string().min(8).max(20).optional(),
    firstName: Joi.string().min(2).optional(),
    lastName: Joi.string().min(2).optional(),
    razonSocial: Joi.string().min(3).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional().allow('', null),
    address: Joi.string().optional().allow('', null),
    isProtected: Joi.boolean().optional()
});
```

---

## 5. Tarea 3.4: Controller Client

### Archivo: `backend_legacy/src/controllers/clientController.js` (NUEVO)

Metodos:
- `getAllClients` — GET /clients (admin/masterAdmin)
- `getClientById` — GET /clients/:id
- `createClient` — POST /clients (admin/masterAdmin)
- `updateClient` — PUT /clients/:id (admin/masterAdmin)
- `deleteClient` — DELETE /clients/:id (admin/masterAdmin)
- `searchClients` — GET /clients/search?query=
- `getClientInspections` — GET /clients/:id/inspections

---

## 6. Tarea 3.5: Rutas Client

### Archivo: `backend_legacy/src/routes/clientRoutes.js` (NUEVO)

```javascript
router.use(authenticate);

router.get('/search', authorize('admin'), clientController.searchClients);
router.get('/', authorize('admin'), clientController.getAllClients);
router.get('/:id', authorize('admin'), clientController.getClientById);
router.post('/', authorize('admin'), validateJoi(createClientSchema), clientController.createClient);
router.put('/:id', authorize('admin'), validateJoi(updateClientSchema), clientController.updateClient);
router.delete('/:id', authorize('admin'), clientController.deleteClient);
router.get('/:id/inspections', authorize('admin'), clientController.getClientInspections);
```

### Modificar: `backend_legacy/src/routes/index.js`

Agregar:
```javascript
const clientRoutes = require('./clientRoutes');
router.use('/clients', clientRoutes);
```

---

## 7. Tarea 3.6: Relacion Client-Inspection

### Modificar: `backend_legacy/src/models/Inspection.js`

Agregar campo `clientId`:
```javascript
clientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'clients', key: 'id' }
}
```

### Modificar: `backend_legacy/src/models/index.js`

Agregar relaciones:
```javascript
// Client - Inspection
Client.hasMany(Inspection, { foreignKey: 'clientId', as: 'inspections', onDelete: 'SET NULL' });
Inspection.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
```

---

## 8. Tarea 3.7: Auto-eliminacion

### Archivo: `backend_legacy/src/cron/autoDeleteClients.js` (NUEVO)

```javascript
// Cada dia a las 2 AM:
// 1. Buscar clientes donde:
//    - createdAt < NOW() - 15 dias
//    - isProtected = false
//    - No tienen inspecciones asociadas
// 2. Eliminar permanentemente
// 3. Registrar en audit log
```

### Modificar: `backend_legacy/src/server.js`

Iniciar cron job despues de DB connect:
```javascript
const { startAutoDeleteClients } = require('./cron/autoDeleteClients');
// Dentro del callback de db connected:
startAutoDeleteClients();
```

---

## 9. Tarea 3.8: Busqueda de clientes

Endpoint: `GET /api/v1/clients/search?query=`

Busca por:
- documentNumber (parcial)
- firstName + lastName (parcial)
- razonSocial (parcial)
- email (parcial)

 Retorna array de clientes coincidentes (max 10).

---

## 10. Tarea 3.9: Panel de clientes (frontend)

### Archivo: `frontend/src/pages/Clients.tsx` (NUEVO)

Componente que incluye:
- Tabla de clientes con busqueda
- Boton "Nuevo Cliente"
- Acciones: Ver, Editar, Eliminar
- Paginacion
- Estadisticas: total, con inspecciones, protegidos

### Archivo: `frontend/src/services/client.service.ts` (NUEVO)

```typescript
const clientService = {
    getAll(filters),
    getById(id),
    create(data),
    update(id, data),
    delete(id),
    search(query),
    getInspections(id, filters),
};
```

---

## 11. Tarea 3.10: Historial de inspecciones por cliente

Dentro de `ClientDetail.tsx`:
- Lista de inspecciones del cliente
- Filtro por estado
- Click en inspeccion → vista detallada

---

## 12. Tarea 3.11: Tests

### Backend: `client.test.js`

| Test | Metodo | Endpoint | Esperado |
|------|--------|----------|----------|
| Crear cliente (admin) | POST | /clients | 201 |
| Crear cliente sin campos requeridos | POST | /clients | 422 |
| Crear cliente con documento duplicado | POST | /clients | 409 |
| Listar clientes (admin) | GET | /clients | 200 + array |
| Obtener cliente por ID | GET | /clients/:id | 200 |
| Obtener cliente inexistente | GET | /clients/:id | 404 |
| Actualizar cliente | PUT | /clients/:id | 200 |
| Eliminar cliente sin inspecciones | DELETE | /clients/:id | 200 |
| Buscar clientes | GET | /clients/search?query= | 200 |
| Obtener historial inspecciones | GET | /clients/:id/inspections | 200 |
| Acceso sin token | GET | /clients | 401 |
| Acceso sin rol admin | GET | /clients | 403 |

### Frontend: `Clients.test.tsx`

| Test | Descripcion | Esperado |
|------|-------------|----------|
| Renderiza tabla | Clients se renderiza | Tabla visible |
| Busqueda funciona | Input de busqueda | Filtrado |
| Crear cliente | Click en boton | Formulario visible |

---

## Verificacion

### Comandos de ejecucion

```bash
# Backend
npm --prefix backend_legacy test

# Frontend
npm --prefix frontend run test
```

### Checks de calidad

- [x] Todos los tests pasan (231 total: 95 backend + 125 frontend + 11 mobile)
- [x] Coverage backend no disminuye (61.9% stmts)
- [x] Coverage frontend se mantiene (56.7% stmts)
- [x] CRUD completo funcional
- [x] Busqueda funciona
- [x] Auto-eliminacion configurada
- [x] Relacion Client-Inspection funciona
- [x] Frontend renderiza correctamente

---

## Estado: COMPLETADA

### Resultados Finales

| Paquete | Archivos de test | Tests | Coverage | Estado |
|---------|-----------------|-------|----------|--------|
| Backend (`backend_legacy/`) | 5 archivos | 95 tests | 61.9% stmts | ✅ Todos pasan |
| Frontend (`frontend/`) | 9 archivos | 125 tests | 56.7% stmts | ✅ Todos pasan |
| Mobile (`mobile/`) | 2 archivos | 11 tests | N/A | ✅ Todos pasan |
| **Total** | **16 archivos** | **231 tests** | — | **✅ Todos pasan** |

### Archivos creados/modificados

**Backend (NUEVOS):**
- `src/models/Client.js` — Modelo Sequelize con validaciones
- `src/services/clientService.js` — CRUD + busqueda + auto-eliminacion
- `src/validators/clientValidator.js` — Joi schemas para crear/actualizar
- `src/controllers/clientController.js` — 7 endpoints
- `src/routes/clientRoutes.js` — Rutas protegidas (admin only)
- `src/cron/autoDeleteClients.js` — Cron job diario a las 2 AM
- `src/__tests__/client.test.js` — 19 tests de la entidad Client

**Backend (MODIFICADOS):**
- `src/models/index.js` — Agregado Client + relacion Client-Inspection
- `src/models/Inspection.js` — Agregado campo clientId
- `src/routes/index.js` — Agregado clientRoutes
- `src/server.js` — Iniciar cron job en produccion
- `package.json` — Agregado node-cron

**Frontend (NUEVOS):**
- `src/services/client.service.ts` — API client para endpoints de clientes
- `src/pages/Clients.tsx` — Pagina de gestion de clientes con tabla, busqueda, CRUD
- `src/pages/ClientDetail.tsx` — Detalle de cliente con historial de inspecciones
- `src/__tests__/Clients.test.tsx` — 5 tests del componente Clients

**Frontend (MODIFICADOS):**
- `src/types/index.ts` — Agregados tipos Client, CreateClientDto, UpdateClientDto, ClientFilters
- `src/App.tsx` — Agregadas rutas /clients y /clients/:id
- `src/components/Sidebar.tsx` — Agregado item "Clientes" en navegacion

### Lecciones aprendidas

- `sequelize.literal()` con raw SQL no funciona bien en tests donde la DB local puede no tener las columnas nuevas. Usar `include` de Sequelize es mas seguro.
- `node-cron` es una dependencia ligera que funciona bien para jobs simples diarios.
- El modelo Client tiene validaciones de unicidad en `documentNumber` y `email`, y una constraint de negocio: al menos uno de (firstName+lastName) o razonSocial.

> **Siguiente accion:** Fase 4 — Rol Supervisor
