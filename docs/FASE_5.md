# FASE 5 — Sistema Offline/Online

## Resumen

Implementación completa de soporte offline/online para el sistema CURIEL, permitiendo a los inspectores trabajar sin conexión a internet y sincronizar automáticamente cuando se restablezca la conectividad.

**Estado**: ✅ COMPLETA (Mobile + Frontend)

## Arquitectura

### Stack Offline

| Componente | Mobile (React Native) | Frontend (React Web) |
|---|---|---|
| **Almacenamiento local** | `expo-sqlite` (SQLite) | `idb` (IndexedDB) |
| **Detección de red** | `@react-native-community/netinfo` | `navigator.onLine` + eventos window |
| **Cola de sincronización** | SQLite `sync_queue` table | IndexedDB `syncQueue` store |
| **Gestor de conflictos** | SQLite `conflicts` table | Resolución manual en UI |

### Flujo de Datos

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Usuario      │────▶│  Cola Local  │────▶│  Servidor    │
│  (offline)    │     │  (SQLite/IDB)│     │  (API)       │
└──────────────┘     └──────────────┘     └──────────────┘
                           │                      │
                           │   ← syncNow() →      │
                           │                      │
                     ┌─────▼──────┐        ┌──────▼─────┐
                     │  Conflictos │        │  Base de   │
                     │  Detectados │        │  Datos     │
                     └────────────┘        └────────────┘
```

### Orden de Sincronización

Las entidades se sincronizan en orden estricto para respetar dependencias:

1. **Áreas** → primero crear/actualizar áreas
2. **Observaciones** → dependen de áreas existentes
3. **Fotos** → dependen de áreas u observaciones
4. **Resumen** → upsert del resumen técnico
5. **Estado** → cambio de estado de inspección

---

## Mobile (`mobile/`)

### Archivos Creados

#### Base de Datos (`src/database/`)

| Archivo | Descripción |
|---|---|
| `schema.js` | Inicialización de SQLite, 7 tablas, migraciones |
| `inspections.repo.js` | CRUD inspecciones, upsertMany, markSynced, getReadyToComplete |
| `areas.repo.js` | CRUD áreas, softDelete, markSynced |
| `observations.repo.js` | CRUD observaciones, softDelete, markSynced |
| `photos.repo.js` | CRUD fotos, getPendingUpload, updateUploadStatus |
| `syncQueue.repo.js` | Cola: add, getPending, markProcessing/Completed/Failed |
| `conflicts.repo.js` | Gestión de conflictos: getPending, create, resolve |

#### Tablas SQLite

```sql
-- inspecciones
CREATE TABLE inspections (
  id TEXT PRIMARY KEY,
  project_name TEXT,
  client_name TEXT,
  status TEXT,
  scheduled_date TEXT,
  ready_to_complete INTEGER DEFAULT 0,
  last_synced_at TEXT,
  is_dirty INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

-- areas, observations, photos (similares con softDelete)
-- sync_queue (operación FIFO)
-- conflicts (detección y resolución)
```

#### Contexto (`src/context/OfflineContext.js`)

- **NetInfo listener**: Detecta cambios de conectividad
- **Auto-sync cada 30s**: Ejecuta `syncNow()` si hay items pendientes
- **Auto-sync al reconectar**: Sincroniza inmediatamente al恢复 conexión
- **processAutoComplete**: Completa inspecciones marcadas offline

#### Servicios

| Archivo | Funciones |
|---|---|
| `syncEngine.js` | `runSync()`, `syncInspection()`, `syncArea()`, `syncObservation()`, `syncPhoto()`, `detectConflicts()` |
| `offlineQueue.js` | `saveInspection()`, `createInspection()`, `saveArea()`, `saveObservation()`, `savePhoto()` (offline-aware) |
| `api.js` | Interceptor de requests: lanza `OFFLINE_QUEUED` para mutaciones offline |

#### Componentes UI

| Componente | Descripción |
|---|---|
| `OfflineBadge.js` | Badge de conectividad (online/offline/syncing) con contador de pendientes |
| `SyncButton.js` | Botón de sincronización manual con contador |
| `ConflictCard.js` | Tarjeta de conflicto: muestra datos local vs servidor, botones de resolución |

#### Pantallas

| Pantalla | Funcionalidad |
|---|---|
| `InspectionDetailScreen.js` | Offline-first: lee SQLite primero, refresca de API si online |
| `ExecutionScreen.js` | Ejecución completa: áreas, observaciones, auto-save 30s, guardado en background, barra de sync, auto-completado offline |
| `PhotoCaptureScreen.js` | Cámara + galería, guarda localmente con expo-file-system |
| `ConflictResolutionScreen.js` | Lista de conflictos pendientes, resolver con datos local/servidor |
| `OfflineStatusScreen.js` | Estado de sincronización, cola de items, botón sync |

#### Modificaciones

| Archivo | Cambios |
|---|---|
| `App.js` | Envuelto con `OfflineProvider`, 5 nuevas rutas de pantalla |
| `AuthContext.js` | `getDB()`/`closeDB()` en login/logout |
| `HomeScreen.js` | Offline-first, `OfflineBadge`, `SyncButton`, barra de sync |
| `config/index.js` | `DB_NAME`, `SYNC_INTERVAL_MS`, `AUTO_SAVE_INTERVAL_MS`, `MAX_RETRY_ATTEMPTS` |

### Funcionalidades Clave Mobile

#### Auto-save
- **Intervalo**: Cada 30 segundos via `setInterval`
- **Background**: Guarda al pasar a segundo plano (`AppState`)
- **Datos guardados**: Formularios de área, observación, resumen, fotos

#### Sincronización
- **FIFO**: Procesa la cola en orden de creación
- **Retry 3 veces**: Marca como `failed` después de 3 intentos
- **Detección de conflictos**: Compara `last_synced_at` local vs `updatedAt` del servidor
- **Resolución manual**: Inspector elige entre datos locales o del servidor

#### Estados de Conectividad
- **Online**: Conexión activa, sincronización automática
- **Offline**: Sin conexión, todo se guarda localmente
- **Syncing**: Sincronización en progreso, botones deshabilitados

---

## Frontend (`frontend/`)

### Archivos Existentes (ya implementados)

| Archivo | Descripción |
|---|---|
| `utils/offlineDb.ts` | IndexedDB completo con 6 stores, merge logic, 451 líneas |
| `hooks/useOnlineStatus.ts` | `navigator.onLine` + toggle manual |
| `hooks/useOfflineSync.ts` | Auto-sync cuando online + pending items |
| `services/offlineQueue.service.ts` | Queue CRUD (enqueue, markSynced, markFailed, clearSynced) |
| `services/sync.service.ts` | Sync engine: procesa cola en orden area→observation→photo→summary→status |
| `components/ConnectionStatus.tsx` | Componente con toggle online/offline, sync button, pending count |

### Stores IndexedDB

| Store | Propósito |
|---|---|
| `cached_inspections` | Lista de inspecciones cacheada |
| `cached_inspection_details` | Detalle individual de inspección |
| `cached_execution_data` | Datos de ejecución completos |
| `executionDrafts` | Borradores de formularios |
| `syncQueue` | Cola de sincronización (con índices) |
| `localIdMappings` | Mapeo de IDs locales a IDs del servidor |

### Integración en Páginas

#### Inspections.tsx
- Cache de inspecciones en IndexedDB
- Fallback a datos cacheados cuando offline
- Badge "Datos offline" visible

#### InspectionDetail.tsx
- Cache de detalle de inspección
- Fallback a datos cacheados cuando offline
- Badge "Datos offline" visible

#### InspectionExecution.tsx
- **Cola de mutaciones**: Todas las operaciones (crear área, observación, foto, resumen) pasan por `addSyncQueueItem`
- **Auto-save de borradores**: Cada 30s guarda formularios en `executionDrafts`
- **Merge con cola**: `mergeExecutionWithQueue()` aplica cambios pendientes sobre datos del servidor
- **Snapshot**: Guarda execution data como fallback offline
- **Sync automático**: Cuando online + pending, ejecuta syncNow()
- **Indicador de estado**: `ConnectionStatus` con pending count y botón sync

#### Navbar.tsx
- `ConnectionStatus` en variante `navbar` siempre visible

### Funcionalidades Clave Frontend

#### Detección de Red
- Escucha eventos `online`/`offline` del navegador
- Toggle manual para forzar modo offline (persiste en localStorage)
- `effectiveOnline = isOnline && manualOnlineEnabled`

#### Sincronización
- Auto-sync cuando `effectiveOnline` es true y hay pending items
- Sync manual via botón "Sincronizar ahora"
- Toast notifications para éxito/error
- Procesamiento FIFO en orden de dependencias

---

## Tests

### Mobile (51 tests)

| Archivo | Tests | Cobertura |
|---|---|---|
| `config.test.js` | 6 | Config offline |
| `uuid.test.js` | 2 | Generador de IDs |
| `database-repos.test.js` | 26 | Todos los repos (inspections, areas, observations, photos, syncQueue, conflicts) |
| `syncEngine.test.js` | 6 | Motor de sincronización |
| `offlineQueue.test.js` | 9 | Cola offline |

### Frontend (125 tests)

Los tests existentes del frontend continúan pasando (125/125). No se requirieron cambios en tests existentes ya que la infraestructura offline ya estaba implementada.

---

## Comandos Útiles

### Desarrollo Mobile
```bash
npm --prefix mobile run start
```

### Desarrollo Frontend
```bash
npm --prefix frontend run dev
```

### Tests Mobile
```bash
npm --prefix mobile run test
```

### Tests Frontend
```bash
npm --prefix frontend run test -- --run
```

---

## Decisiones Técnicas

### ¿Por qué SQLite en mobile?
- Mejor rendimiento en dispositivos móviles
- Soporte nativo de Expo via `expo-sqlite`
- Transacciones ACID para la cola de sincronización
- Consultas SQL para reportes locales

### ¿Por qué IndexedDB en frontend?
- API nativa del navegador, sin dependencias externas (excepto `idb`)
- Soporte para grandes volúmenes de datos (fotos como Blobs)
- Transacciones y índices para consultas eficientes
- Compatible con todos los navegadores modernos

### ¿Por qué resolución manual de conflictos?
- Los inspectores conocen mejor el contexto local
- Evita pérdida de datos por merging automático incorrecto
- Simplifica la lógica del sistema
- Permite decidesión granular por campo

### ¿Por qué FIFO para la cola?
- Respeta dependencias entre entidades (área → observación → foto)
- Evita errores de foreign key
- Simplifica el debugging
- Orden predecible y controlable

---

## Pendiente / Notas

- **Auto-complete offline**: Las inspecciones completadas offline se sincronizan automáticamente al reconectar
- **Fotos offline**: Se guardan localmente y se suben en la siguiente sincronización
- **Conflictos manuales**: El inspector decide entre datos locales o del servidor para cada conflicto
- **Sync automático**: Cada 30 segundos si hay items pendientes y conexión disponible

---

## Estado de las Fases

| Fase | Estado |
|---|---|
| Fase 0: Preparación | ✅ Completa |
| Fase 1: Seguridad Base | ✅ Completa |
| Fase 2: Testing | ✅ Completa (312 tests) |
| Fase 3: Entidad Cliente | ✅ Completa |
| Fase 4: Rol Supervisor | ✅ Completa |
| **Fase 5: Offline/Online** | **✅ Completa** |
| Fase 6: Notificaciones | 🔄 Pendiente |
| Fase 7: CI/CD | 📋 Planificada |
| Fase 8: Observabilidad | 📋 Planificada |
| Fase 9: Mobile MVP | 📋 Planificada |
| Fase 10: Performance | 📋 Planificada |
| Fase 11: Documentación | 📋 Planificada |
