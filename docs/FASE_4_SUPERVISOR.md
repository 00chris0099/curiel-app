# FASE 4: Rol Supervisor - Plan de Implementacion

> **Fecha:** 18 de Junio, 2026
> **Dependencias:** Fase 1 (Seguridad), Fase 2 (Testing), Fase 3 (Cliente)
> **Duracion estimada:** 2 semanas

---

## Resumen

Implementar el rol **supervisor** del sistema: monitoreo de calidad, evaluaciones semanales automaticas, alertas por niveles de gravedad, suspension de inspectores, y dashboard con KPIs.

---

## 4.1 Agregar rol `supervisor` al seed + actualizar frontend types

### Backend
- Verificar que el rol `supervisor` ya existe en la tabla `roles` (ya esta en el validator y auth routes)
- Crear seed script o migracion para garantizar que el rol exista
- No requiere cambios en modelos (el rol se maneja via tabla `roles` + `user_roles`)

### Frontend
- Agregar `'supervisor'` al tipo `UserRole` en `frontend/src/types/index.ts`
- Agregar `supervisor` al array de roles en Sidebar (seccion de navegacion)

---

## 4.2 Actualizar middleware authorize() para supervisor

El middleware `authorize()` en `src/middlewares/auth.js` ya funciona con cualquier rol. Los cambios son:

### Permisos del supervisor (según matriz 3.1-3.6)

| Area | Permiso |
|------|---------|
| **Usuarios** | Ver lista inspectores, ver/editar perfil propio |
| **Inspecciones** | Ver todas, ver una, crear, editar, cambiar estado (segun matriz), ver historial, ver estadisticas |
| **Ejecucion** | Ver ejecucion, crear/editar areas, crear/editar observaciones, subir fotos, editar summary |
| **Checklists** | Ver templates, crear/editar template, agregar/editar item |
| **Clientes** | NO tiene acceso |
| **Alertas** | Crear, ver, gestionar |
| **Evaluaciones** | Crear, ver historial, editar semanas anteriores |
| **Suspensiones** | Crear, ver |

### Archivos a modificar
- `backend_legacy/src/routes/inspectionRoutes.js` — agregar `supervisor` a endpoints de lectura
- `backend_legacy/src/routes/checklistRoutes.js` — agregar `supervisor` a endpoints de template
- `backend_legacy/src/routes/index.js` — montar nuevas rutas de supervisor

---

## 4.3 Crear formularios de suspension

### Modelo `Suspension`

```javascript
Suspension {
    id: UUID (PK)
    inspectorId: UUID (FK -> users, NOT NULL)
    supervisorId: UUID (FK -> users, NOT NULL)
    reason: ENUM('abandono', 'rendimiento', 'conducta', 'otro') NOT NULL
    description: TEXT (min 50 caracteres) NOT NULL
    gravityLevel: INTEGER (1, 2, 3) NOT NULL
    status: ENUM('activa', 'levantada') DEFAULT 'activa'
    evidence: JSON (array de URLs de fotos/documentos)
    createdAt: Date
    updatedAt: Date
}
```

### Reglas de negocio
- Solo supervisor y admin pueden crear suspensiones
- Inspector suspendido NO puede recibir nuevas inspecciones
- Admin puede levantar suspensiones
- Se registra en audit log

### Archivos a crear
- `backend_legacy/src/models/Suspension.js`
- `backend_legacy/src/services/suspensionService.js`
- `backend_legacy/src/controllers/suspensionController.js`
- `backend_legacy/src/routes/suspensionRoutes.js`
- `backend_legacy/src/validators/suspensionValidator.js`

---

## 4.4-4.6 Formularios de cancelacion, eliminacion y rechazo

### Cancelacion (existente parcialmente)
- El sistema ya tiene inspecciones con status `cancelada`
- Falta: formulario formal con motivo, descripcion, solicitante
- Falta: notificacion al admin para aprobar/rechazar

### Eliminacion
- Soft delete (recuperable 48h) → hard delete automatico
- Solo admin puede aprobar
- Modelo: Inspection ya tiene campos de eliminacion? Verificar.

### Rechazo (supervisor)
- Supervisor rechaza inspeccion que NO esta en proceso
- Inspeccion vuelve a `pendiente`
- Sistema notifica al arquitecto
- Nivel de gravedad asociado

### Archivos a modificar/crear
- `backend_legacy/src/services/inspectionService.js` — agregar logica de cancelacion formal
- `backend_legacy/src/services/alertService.js` — nuevo servicio de alertas
- Frontend: formularios de cancelacion/eliminacion/rechazo

---

## 4.7 Implementar niveles de gravedad (1, 2, 3)

### Modelo `Alert`

```javascript
Alert {
    id: UUID (PK)
    inspectionId: UUID (FK -> inspections, nullable)
    suspensionId: UUID (FK -> suspensions, nullable)
    supervisorId: UUID (FK -> users, NOT NULL)
    gravityLevel: INTEGER (1, 2, 3) NOT NULL
    title: STRING NOT NULL
    description: TEXT NOT NULL
    status: ENUM('abierta', 'en_revision', 'resuelta') DEFAULT 'abierta'
    notifiedUsers: JSON (array de userIds notificados)
    createdAt: Date
    updatedAt: Date
}
```

### Reglas de negocio
| Nivel | Color | Cuanda | Contacto | Accion |
|-------|-------|--------|----------|--------|
| 1 - Bajo | Verde | Antes de inspeccion | Arquitecto + Inspector | Indicaciones |
| 2 - Medio | Amarillo | Dia de inspeccion | Admin + Arquitecto | Decide suspension |
| 3 - Alto | Rojo | Durante inspeccion | Admin + Arquitecto + Supervisor | Suspension inmediata |

### Archivos a crear
- `backend_legacy/src/models/Alert.js`
- `backend_legacy/src/services/alertService.js`
- `backend_legacy/src/controllers/alertController.js`
- `backend_legacy/src/routes/alertRoutes.js`
- `backend_legacy/src/validators/alertValidator.js`

---

## 4.8-4.10 Dashboard del supervisor + KPIs + Ranking

### KPIs Inspector (calculados automaticamente)

| KPI | Formula | Meta |
|-----|---------|------|
| Inspecciones completadas/mes | Count(finalizadas) | 15-20/mes |
| Tiempo promedio por inspeccion | Sum(duracion) / count | < 2 horas |
| Tasa de puntualidad | Completadas a tiempo / Total | > 90% |
| Fotos promedio por inspeccion | Total fotos / inspecciones | 20-30 |
| Observaciones criticas | Count(criticas) | Tracking |
| Tasa de rechazo | Rechazadas / Total | < 10% |
| Tasa de finalizacion | Completadas / Asignadas | > 85% |

### KPIs Arquitecto

| KPI | Formula | Meta |
|-----|---------|------|
| Inspecciones creadas/mes | Count(creadas) | 10-15/mes |
| Tiempo promedio de revision | Promedio(playlist_revision → finalizada) | < 24h |
| Tasa de aprobacion | Aprobadas / Total | > 80% |

### KPIs Generales (Dashboard)
- Total inspecciones activas
- Inspecciones vencidas
- Tiempo promedio general
- Tasa de cancelacion
- Productividad por dia
- Ranking de inspectores/arquitectos

### Score compuesto
```
Score = (completadas * 0.3) + (puntualidad * 0.25) + (fotos * 0.15) + (baja_rechazo * 0.2) + (satisfaccion * 0.1)
```

### Archivos a crear
- `backend_legacy/src/services/kpiService.js`
- `backend_legacy/src/services/rankingService.js`
- `backend_legacy/src/controllers/supervisorDashboardController.js`
- `backend_legacy/src/routes/supervisorRoutes.js`
- Frontend: `SupervisorDashboard.tsx`

---

## 4.11-4.12 Evaluacion semanal (cron sabado 9AM)

### Modelo `Evaluation`

```javascript
Evaluation {
    id: UUID (PK)
    evaluatedUserId: UUID (FK -> users, NOT NULL)  // inspector o arquitecto
    supervisorId: UUID (FK -> users, NOT NULL)
    weekStart: Date NOT NULL  // lunes de la semana evaluada
    weekEnd: Date NOT NULL    // domingo de la semana evaluada
    // KPIs automaticos
    inspectionsCompleted: INTEGER DEFAULT 0
    avgTimePerInspection: FLOAT DEFAULT 0
    punctualityRate: FLOAT DEFAULT 0
    avgPhotosPerInspection: FLOAT DEFAULT 0
    criticalObservations: INTEGER DEFAULT 0
    rejectionRate: FLOAT DEFAULT 0
    completionRate: FLOAT DEFAULT 0
    compositeScore: FLOAT DEFAULT 0
    // Manuales del supervisor
    notes: TEXT
    actions: TEXT
    status: ENUM('borrador', 'confirmada', 'enviada') DEFAULT 'borrador'
    // Meta
    createdAt: Date
    updatedAt: Date
}
```

### Flujo automatico
1. Cada sabado a las 9:00 AM, cron job ejecuta
2. Calcula KPIs de todos los inspectores y arquitectos activos
3. Genera borradores de evaluacion
4. Supervisor revisa y confirma
5. Se envia por email + panel

### Archivos a crear
- `backend_legacy/src/models/Evaluation.js`
- `backend_legacy/src/services/evaluationService.js`
- `backend_legacy/src/controllers/evaluationController.js`
- `backend_legacy/src/routes/evaluationRoutes.js`
- `backend_legacy/src/cron/weeklyEvaluation.js`

---

## 4.14 Reasignacion automatica

### Logica
Cuando un inspector es suspendido o rechazado:
1. Sistema busca inspectores disponibles (activos, no suspendidos)
2. Filtra por: zona geografica, disponibilidad, carga actual
3. Sugiere al admin el mejor candidato
4. Admin aprueba la reasignacion

### Archivos a modificar
- `backend_legacy/src/services/inspectionService.js` — agregar logica de reasignacion
- `backend_legacy/src/services/suspensionService.js` — trigger reasignacion al suspender

---

## 4.15 Tests de supervisor

### Backend (estimado: ~25 tests)
- CRUD de alertas con niveles de gravedad
- Crear/levantar suspensiones
- KPIs calculados correctamente
- Evaluaciones semanales (generacion + confirmacion)
- Permisos del supervisor (ver inspecciones, NO ver clientes)
- Reasignacion automatica

### Frontend (estimado: ~10 tests)
- SupervisorDashboard renderiza KPIs
- Alert forms validan campos requeridos
- Evaluation history muestra datos

---

## Archivos a crear (resumen)

### Backend nuevos
1. `src/models/Alert.js`
2. `src/models/Suspension.js`
3. `src/models/Evaluation.js`
4. `src/services/alertService.js`
5. `src/services/suspensionService.js`
6. `src/services/evaluationService.js`
7. `src/services/kpiService.js`
8. `src/services/rankingService.js`
9. `src/controllers/alertController.js`
10. `src/controllers/suspensionController.js`
11. `src/controllers/evaluationController.js`
12. `src/controllers/supervisorDashboardController.js`
13. `src/routes/alertRoutes.js`
14. `src/routes/suspensionRoutes.js`
15. `src/routes/evaluationRoutes.js`
16. `src/routes/supervisorRoutes.js`
17. `src/validators/alertValidator.js`
18. `src/validators/suspensionValidator.js`
19. `src/validators/evaluationValidator.js`
20. `src/cron/weeklyEvaluation.js`
21. `src/__tests__/supervisor.test.js`

### Backend a modificar
1. `src/models/index.js` — agregar associations
2. `src/routes/index.js` — montar nuevas rutas
3. `src/server.js` — iniciar cron job
4. `src/routes/inspectionRoutes.js` — agregar supervisor a permisos
5. `src/routes/checklistRoutes.js` — agregar supervisor a permisos

### Frontend nuevos
1. `src/pages/SupervisorDashboard.tsx`
2. `src/pages/Alerts.tsx`
3. `src/pages/Evaluations.tsx`
4. `src/services/alert.service.ts`
5. `src/services/suspension.service.ts`
6. `src/services/evaluation.service.ts`
7. `src/services/kpi.service.ts`
8. `src/__tests__/SupervisorDashboard.test.tsx`

### Frontend a modificar
1. `src/types/index.ts` — agregar tipos
2. `src/App.tsx` — agregar rutas
3. `src/components/Sidebar.tsx` — agregar navegacion supervisor
