# SISTEMA COMPLETO - CURIEL Inspecciones Tecnicas

> **Fecha:** 17 de Junio, 2026
> **Version:** 1.0
> **Alcance:** Definicion completa de roles, permisos, flujos y roadmap de implementacion

---

## TABLA DE CONTENIDOS

1. [Roles del Sistema](#1-roles-del-sistema)
2. [Entidad Cliente](#2-entidad-cliente)
3. [Matrices de Permisos](#3-matrices-de-permisos)
4. [Transiciones de Estado](#4-transiciones-de-estado)
5. [Supervision y Evaluaciones](#5-supervision-y-evaluaciones)
6. [Sistema Offline/Online](#6-sistema-offlineonline)
7. [Notificaciones](#7-notificaciones)
8. [Auditoria de Acciones](#8-auditoria-de-acciones)
9. [Flujos Completos](#9-flujos-completos)
10. [Roadmap de Implementacion](#10-roadmap-de-implementacion)

---

## 1. ROLES DEL SISTEMA

### 1.1 Roles Definitivos

| Rol | Nivel | Descripcion | Creado por |
|-----|-------|-------------|------------|
| `masterAdmin` | 0 | Acceso total al sistema. Puede crear admins, proteger clientes, transferir masterAdmin (1 vez/mes) | Configuracion inicial |
| `admin` | 1 | Gestion de usuarios, inspecciones, clientes. Aprueba cancelaciones, rechazos, eliminaciones, reasignaciones | masterAdmin |
| `supervisor` | 2 | Calidad y monitoreo. Evaluaciones, suspensiones, alertas de gravedad (3 niveles), checklists | admin |
| `arquitecto` | 3 | Crea y edita inspecciones asignadas. Gestiona inspectores asignados. Revisa checklists | admin |
| `inspector` | 4 | Ejecuta inspecciones asignadas. Toma fotos, llena checklists, agrega observaciones | admin |

### 1.2 Jerarquia de Permisos

```
masterAdmin (acceso total, bypass de todos los permisos)
    │
    ├── admin (gestion general)
    │       │
    │       ├── supervisor (calidad y monitoreo)
    │       │       │
    │       │       ├── arquitecto (crea/edita inspecciones)
    │       │       │       │
    │       │       │       └── inspector (ejecuta inspecciones)
    │       │       │
    │       │       └── inspector (ejecuta inspecciones)
    │       │
    │       └── arquitecto (crea/edita inspecciones)
    │               │
    │               └── inspector (ejecuta inspecciones)
    │
    └── (masterAdmin puede hacer todo lo que cualquier rol hace)
```

### 1.3 Comportamiento del masterAdmin

- **Bypass total:** El `isMasterAdmin` permite saltarse TODOS los checks de `authorize()`
- **Puede:** Hacer cualquier accion en el sistema sin restricciones
- **Unico:** Solo hay UN masterAdmin en el sistema (enforced por indice unico parcial)
- **Transferencia:** Puede transferir el flag a otro admin, pero pierde el suyo (1 vez/mes)
- **Proteccion:** No puede ser desactivado ni eliminado

---

## 2. ENTIDAD CLIENTE

### 2.1 Esquema

```javascript
Client {
    id: UUID (PK)
    documentType: ENUM('dni', 'ruc', 'ce')     // Tipo de documento
    documentNumber: String (unique, not null)    // Numero de documento
    firstName: String (nullable)                 // Nombre (requerido si no razonSocial)
    lastName: String (nullable)                  // Apellido (requerido si no razonSocial)
    razonSocial: String (nullable)               // Razon social (requerido si no nombre)
    email: String (unique, not null)             // Correo electronico
    phone: String (optional)                     // Telefono de contacto
    address: String (optional)                   // Direccion
    isProtected: Boolean (default false)         // Protegido de auto-eliminacion
    createdAt: Date
    updatedAt: Date
}
```

### 2.2 Reglas de Negocio

| Regla | Descripcion |
|-------|-------------|
| Unicidad | Un cliente es unico por documento (DNI/RUC/CE) y por email |
| Nombre o Razon | Debe tener firstName+lastName O razonSocial (al menos uno) |
| Relacion | Una inspeccion = un cliente. Un cliente = muchas inspecciones |
| Auto-eliminacion | Clientes nuevos sin inspecciones se eliminan a los 15 dias |
| Proteccion | Solo masterAdmin puede marcar `isProtected: true` |
| Eliminacion | Permanente (hard delete), no soft delete |
| Sin subclientes | No jerarquia, cada cliente es una entidad independiente |

### 2.3 Auto-eliminacion

```
Cada dia a las 2 AM:
1. Buscar clientes donde:
   - createdAt < NOW() - 15 dias
   - isProtected = false
   - No tienen inspecciones asociadas (ni activas ni completadas)
2. Enviar email de aviso 7 dias antes de eliminar
3. Si pasan 7 dias y sigue sin inspecciones → eliminar permanentemente
4. Registrar en audit log
```

---

## 3. MATRICES DE PERMISOS

### 3.1 Gestion de Usuarios

| Accion | masterAdmin | admin | supervisor | arquitecto | inspector |
|--------|:-----------:|:-----:|:----------:|:----------:|:---------:|
| Ver usuarios | SI | SI | NO | NO | NO |
| Crear usuario | SI | SI | NO | NO | NO |
| Editar usuario | SI | SI | NO | NO | NO |
| Eliminar usuario | SI | SI | NO | NO | NO |
| Activar/desactivar | SI | SI | NO | NO | NO |
| Transferir masterAdmin | SI (1 vez/mes) | NO | NO | NO | NO |
| Ver stats usuarios | SI | SI | NO | NO | NO |
| Ver lista inspectores | SI | SI | SI | SI | NO |
| Ver perfil propio | SI | SI | SI | SI | SI |
| Editar perfil propio | SI | SI | SI | SI | SI |
| Cambiar contraseña | SI | SI | SI | SI | SI |

### 3.2 Inspecciones

| Accion | masterAdmin | admin | supervisor | arquitecto | inspector (propia) |
|--------|:-----------:|:-----:|:----------:|:----------:|:------------------:|
| Ver todas | SI | SI | SI | SI | Solo propias |
| Ver una | SI | SI | SI | SI | Solo propias |
| Crear | SI | SI | SI | SI | NO |
| Editar | SI | SI | SI | SI | Solo si no en proceso del dia |
| Eliminar | SI | SI (aprueba) | Solicita | NO | Solicita |
| Cambiar estado | SI | SI | Segun matriz | Segun matriz | Segun matriz |
| Descargar PDF | SI | SI | SI | SI | Solo propias (lista_revision, finalizada) |
| Ver historial estados | SI | SI | SI | SI | Solo propias |
| Ver estadisticas | SI | SI | SI | SI | Solo propias |

### 3.3 Ejecucion (Areas, Observaciones, Fotos, Summary)

| Accion | masterAdmin | admin | supervisor | arquitecto | inspector (propia) |
|--------|:-----------:|:-----:|:----------:|:----------:|:------------------:|
| Ver ejecucion | SI | SI | SI | SI | Solo propias |
| Crear areas | SI | SI | SI | SI | Solo si status desbloqueado |
| Editar areas | SI | SI | SI | SI | Solo si status desbloqueado |
| Eliminar areas | SI | SI | NO | SI | Solo si status desbloqueado |
| Crear observaciones | SI | SI | SI | SI | Solo si status desbloqueado |
| Editar observaciones | SI | SI | SI | SI | Solo si status desbloqueado |
| Eliminar observaciones | SI | SI | NO | SI | Solo si status desbloqueado |
| Subir fotos | SI | SI | SI | SI | Solo propias |
| Editar fotos | SI | SI | NO | Solo propias | Solo propias |
| Eliminar fotos | SI | SI | NO | Solo propias | Solo propias |
| Editar summary | SI | SI | SI | SI | Solo si status desbloqueado |
| Aprobar reporte (aprobado) | SI | SI | NO | SI | NO |
| Completar (lista_revision) | SI | SI | SI | SI | Solo con signal |

**Status desbloqueado para inspector:** pendiente, en_proceso, reprogramada
**Status bloqueado para inspector:** lista_revision, finalizada, cancelada

### 3.4 Checklists

| Accion | masterAdmin | admin | supervisor | arquitecto | inspector |
|--------|:-----------:|:-----:|:----------:|:----------:|:---------:|
| Ver templates | SI | SI | SI | SI | SI |
| Crear template | SI | SI | SI | SI | NO |
| Editar template | SI | SI | SI | SI | NO |
| Eliminar template | SI | SI | NO | NO | NO |
| Agregar item | SI | SI | SI | SI | NO |
| Editar item | SI | SI | SI | SI | NO |
| Eliminar item | SI | SI | NO | SI | NO |

### 3.5 Clientes

| Accion | masterAdmin | admin | supervisor | arquitecto | inspector |
|--------|:-----------:|:-----:|:----------:|:----------:|:---------:|
| Ver clientes | SI | SI | NO | NO | NO |
| Crear cliente | SI | SI | NO | NO | NO |
| Editar cliente | SI | SI | NO | NO | NO |
| Eliminar cliente | SI | SI | NO | NO | NO |
| Buscar por documento | SI | SI | NO | NO | NO |
| Ver historial inspecciones | SI | SI | NO | NO | NO |
| Proteger de auto-eliminacion | SI | NO | NO | NO | NO |
| Ver panel de clientes | SI | SI | NO | NO | NO |

### 3.6 Notificaciones

| Accion | masterAdmin | admin | supervisor | arquitecto | inspector |
|--------|:-----------:|:-----:|:----------:|:----------:|:---------:|
| Ver notificaciones propias | SI | SI | SI | SI | SI |
| Marcar como leida | SI | SI | SI | SI | SI |
| Marcar todas como leidas | SI | SI | SI | SI | SI |
| Ver count no leidas | SI | SI | SI | SI | SI |

---

## 4. TRANSICIONES DE ESTADO

### 4.1 Maquina de Estados

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

### 4.2 Matriz de Transiciones

| Transicion | masterAdmin | admin | supervisor | arquitecto | inspector (propia) |
|------------|:-----------:|:-----:|:----------:|:----------:|:------------------:|
| pendiente → en_proceso | SI | SI | SI | SI | SI |
| pendiente → cancelada | SI | SI | Recomienda | Recomienda | Recomienda |
| pendiente → reprogramada | SI | SI | SI | SI | SI |
| en_proceso → lista_revision | SI | SI | SI | SI | SI |
| en_proceso → cancelada | SI | SI | Recomienda | Recomienda | Recomienda |
| en_proceso → reprogramada | SI | SI | SI | SI | SI |
| lista_revision → en_proceso | SI | SI | SI | SI | SI |
| lista_revision → finalizada | SI | SI | NO | SI | NO |
| lista_revision → cancelada | SI | SI | Recomienda | Recomienda | NO |
| reprogramada → pendiente | SI | SI | SI | SI | NO |
| reprogramada → cancelada | SI | SI | Recomienda | Recomienda | NO |
| finalizada → (terminal) | SI | NO | NO | NO | NO |
| cancelada → (terminal) | SI | NO | NO | NO | NO |

### 4.3 Definiciones

| Termino | Significado |
|---------|-------------|
| **SI** | Puede realizar la transicion directamente |
| **NO** | No puede realizar la transicion bajo ninguna circunstancia |
| **Recomienda** | Envia solicitud de cancelacion al admin con motivo. Solo admin aprueba |

### 4.4 Reglas Adicionales

- **Inspector solo puede:** Pendiente→EnProceso, EnProceso→ListaRevision, y corregir de ListaRevision→EnProceso
- **Supervisor no puede:** Finalizar inspecciones (solo admin o arquitecto)
- **Arquitecto puede:** Hacer todo excepto eliminar y finalizar (el admin finaliza)
- **Admin puede:** Todo excepto las transiciones terminales (finalizada/cancelada no se revierten)

---

## 5. SUPERVISION Y EVALUACIONES

### 5.1 Niveles de Gravedad

| Nivel | Color | Cuando | Ejemplos | Contacto | Accion |
|-------|-------|--------|----------|----------|--------|
| **1 - Bajo** | Verde | Antes de la inspeccion | Inspector no confirmo llegada, arquitecto no reviso checklist | Arquitecto + Inspector | Indicaciones, sin escalacion |
| **2 - Medio** | Amarillo | Dia de la inspeccion o por comenzar | Cliente se quejo, fotos no estan bien, faltan fotos | Admin + Arquitecto | Admin tiene constancia, decide suspension |
| **3 - Alto** | Rojo | Durante la inspeccion, incidente grave | Inspector abandono, dano en inmueble, conflicto grave, integridad | Admin + Arquitecto + Supervisor | Suspension inmediata + evaluacion |

### 5.2 Formulario de Suspension

```
CAMPOS REQUERIDOS:
- Inspector afectado (select)
- Motivo de suspension (select: abandono, rendimiento, conducta, otro)
- Descripcion detallada (textarea, min 50 caracteres)
- Nivel de gravedad (1, 2, 3)
- Evidencia (opcional: fotos, documentos)

FLUJO:
1. Supervisor llena formulario
2. SISTEMA notifica a Admin + Arquitecto asignado
3. SISTEMA busca inspectores disponibles para reasignacion
4. Admin ve recomendacion del sistema
5. Admin puede comunicarse con supervisor/suspendido
6. Admin aprueba reasignacion (puede ser mismo o otro inspector)
7. Inspector suspendido NO puede recibir nuevas inspecciones
8. Se registra en audit log
```

### 5.3 Formulario de Cancelacion

```
CAMPOS REQUERIDOS:
- Inspeccion a cancelar (select o busqueda)
- Motivo de cancelacion (select: cliente solicito, inspector indisponible, clima, otro)
- Descripcion detallada (textarea, min 50 caracteres)
- Solicitante (automatico: quien llena el formulario)

FLUJO:
1. Solicitante llena formulario
2. SISTEMA envia alerta al Admin
3. Admin revisa → aprueba o rechaza
4. Si aprueba: inspeccion → "cancelada"
5. Si rechaza: notifica al solicitante con razon
6. Se registra en audit log
```

### 5.4 Formulario de Eliminacion

```
CAMPOS REQUERIDOS:
- Inspeccion a eliminar (select o busqueda)
- Motivo de eliminacion (select: duplicada, error de carga, cliente lo solicito, otro)
- Descripcion (textarea)

FLUJO:
1. Solicitante llena formulario
2. SISTEMA envia alerta al Admin
3. Admin revisa → aprueba o rechaza
4. Si aprueba: soft delete (recuperable 48h)
5. Despues de 48h: hard delete automatico
6. Admin puede ver eliminadas en apartado especial
7. Se registra en audit log
```

### 5.5 Formulario de Rechazo (Supervisor)

```
CAMPOS REQUERIDOS:
- Inspeccion a rechazar
- Motivo del rechazo (textarea)
- Nivel de gravedad (1, 2, 3)

FLUJO:
1. Supervisor rechaza (solo si NO esta en proceso)
2. Inspeccion vuelve a "pendiente"
3. SISTEMA notifica al arquitecto
4. Arquitecto revisa que paso
5. Se reagenda (misma inspector u otra)
6. Si es el mismo dia: supervisor solicita reprogramar al cliente
   (primero inspector contacta, luego arquitecto, luego supervisor)
7. Se registra en audit log
```

### 5.6 Evaluaciones Semanales

**Automatica (el sistema calcula):**
- Se genera cada sabado a las 9:00 AM
- Calcula todos los KPIs automaticamente
- Compara con semana anterior
- Genera ranking de inspectores y arquitectos

**Manual (el supervisor completa):**
- Notas sobre incidentes ocurridos
- Acciones tomadas por el supervisor
- Cambios de estado de evaluacion
- Observaciones cualitativas

**Previa:**
- Supervisor puede generar borrador en cualquier momento
- Muestra KPIs en tiempo real (incompleto hasta sabado)

**Historial:**
- Se guarda en dashboard del supervisor
- Historial por cada inspector y arquitecto
- Cada evaluacion tiene sello de tiempo

**Edicion:**
- Puede editar semanas anteriores
- Siempre con sello: "Actualizado el [fecha]: [que cambio]"
- No es recomendable actualizar, pero se permite

**Envio:**
- Sabado noche por email + panel
- Solo confirmada por supervisor
- Se envia al inspector/arquitecto evaluado

### 5.7 KPIs por Rol

#### KPIs Inspector (lo ve el supervisor)

| KPI | Formula | Meta |
|-----|---------|------|
| Inspecciones completadas/mes | Count(finalizadas) | 15-20/mes |
| Tiempo promedio por inspeccion | Sum(duracion) / count | < 2 horas |
| Tasa de puntualidad | Completadas a tiempo / Total | > 90% |
| Fotos promedio por inspeccion | Total fotos / inspecciones | 20-30 |
| Observaciones criticas encontradas | Count(criticas) | Tracking |
| Tasa de rechazo | Rechazadas / Total enviadas | < 10% |
| Satisfaccion del cliente | Encuesta (1-5) | > 4.0 |
| Tasa de finalizacion | Completadas / Asignadas | > 85% |

#### KPIs Arquitecto (lo ve el supervisor)

| KPI | Formula | Meta |
|-----|---------|------|
| Inspecciones creadas/mes | Count(creadas) | 10-15/mes |
| Tiempo promedio de revision | Promedio(playlist_revision → finalizada) | < 24 horas |
| Tasa de aprobacion | Aprobadas / Total revisiones | > 80% |
| Inspecciones por inspector asignado | Count por inspector | Balanceado |
| Observaciones resueltas | Corregidas / Total | > 70% |
| Satisfaccion del cliente | Encuesta (1-5) | > 4.0 |

#### KPIs Generales (Dashboard del supervisor)

| KPI | Descripcion |
|-----|-------------|
| Total inspecciones activas | en_proceso + pendientes |
| Inspecciones vencidas | scheduledDate < hoy y status = en_proceso |
| Tiempo promedio general | De creacion a finalizacion |
| Tasa de cancelacion | Canceladas / Total |
| Productividad por dia | Completadas por dia |
| Ranking de inspectores | Score compuesto de sus KPIs |
| Ranking de arquitectos | Score compuesto de sus KPIs |

### 5.8 Encuestas

| Tipo | Destinatario | Frecuencia | Preguntas | Canal |
|------|-------------|------------|-----------|-------|
| Satisfaccion del inspector | Cliente (al inspector) | De vez en cuando, cuando se solicita | 2-3 preguntas | Email |
| Satisfaccion del servicio | Cliente (a la empresa) | Post-inspeccion | Preguntas generales | Email |
| Calificacion del inspector | Cliente (desde panel) | Post-inspeccion | Panel + email | Panel + Email |

---

## 6. SISTEMA OFFLINE/ONLINE

### 6.1 Funcionamiento General

| Caracteristica | Descripcion |
|----------------|-------------|
| Guardado local automatico | Cada 30 segundos |
| Guardado al cerrar app | Automatico, incluso en segundo plano |
| Boton "Guardar" manual | Siempre funciona (local) |
| Boton "Sincronizar" manual | Requiere todo guardado previamente |
| Intento de sync automatico | Cada 30 segundos |
| Boton "Completar" | Deshabilitado sin signal |
| Auto-completar | Cuando vuelve signal, se completa automaticamente |
| Inspector en campo | NO debe irse hasta confirmar guardado completo |
| Limite de almacenamiento | 128GB (penalizacion si no hay espacio) |
| Bloqueo durante sync | Nadie puede tocar la inspeccion mientras sincroniza |
| Conflicto de sync | Se notifica, inspector asignado es quien completa |

### 6.2 Indicadores de UI

```
┌─────────────────────────────────────────┐
│  [Online/Offline Badge]  [Sync: 3 items]│
│  ─────────────────────────────────────  │
│  [Contenido de la inspeccion]           │
│                                         │
│  [Guardar]  [Sincronizar]  [Completar]  │
│                                         │
│  Toast: "Sincronizando..."              │
│  Toast: "Sincronizado exitosamente"     │
│  Toast: "Error de sincronizacion"       │
└─────────────────────────────────────────┘
```

### 6.3 Flujo de Sincronizacion

```
1. Inspector toma fotos / llena checklist (offline o online)
2. Cada 30s se guarda localmente (auto-save)
3. Inspector puede darle "Guardar" manualmente
4. Cuando hay signal:
   a. Boton "Sincronizar" se habilita
   b. Inspector da click en "Sincronizar"
   c. SISTEMA bloquea la inspeccion (locked = true)
   d. SISTEMA envia todos los datos locales al servidor
   e. Servidor procesa y responde OK
   f. SISTEMA desbloquea la inspeccion
   g. SISTEMA habilita boton "Completar"
5. Inspector da click en "Completar"
6. Inspeccion pasa a "lista_revision"
```

### 6.4 Manejo de Errores

| Error | Accion |
|-------|--------|
| Sin espacio en dispositivo | Notificacion: "Elimine archivos para continuar. Penalizacion aplicada." |
| Sync fallida | Reintentar 3 veces. Si falla, notificar y guardar local. |
| Conflicto (alguien editando) | Notificar a ambos. Inspector asignado tiene prioridad. |
| Datos corruptos | Notificar. Inspector debe rehacer desde donde falte. |
| Signal perdida durante sync | Cancelar sync, mantener datos locales, reintentar. |

---

## 7. NOTIFICACIONES

### 7.1 Tabla de Notificaciones

| Evento | Destinatarios | Canal | Urgencia |
|--------|---------------|-------|----------|
| Inspeccion creada | Inspector asignado | Email + Panel | Normal |
| Inspeccion creada | Admin + Arquitecto + Supervisor | Panel | Normal |
| Cambio de estado | Admin + Arquitecto + Supervisor | Panel | Normal |
| Inspeccion completada | Admin + Arquitecto + Supervisor + Cliente | Email + Panel | Alta |
| Reporte listo | Cliente | Email | Normal |
| Suspension de inspector | Admin + Arquitecto asignado | Email + Panel | Alta |
| Solicitud de cancelacion | Admin | Panel + Email | Urgente |
| Solicitud de eliminacion | Admin | Panel + Email | Urgente |
| Evaluacion semanal | Inspector/Arquitecto evaluado | Email + Panel | Normal |
| Olvide contraseña | Usuario | Email | Urgente |
| Cliente nuevo sin inspeccion (15 dias) | Cliente | Email | Baja |
| Alerta nivel 1 | Arquitecto + Inspector | Panel | Baja |
| Alerta nivel 2 | Admin + Arquitecto | Panel + Email | Media |
| Alerta nivel 3 | Admin + Arquitecto + Supervisor | Panel + Email + WhatsApp | Critica |
| Reasignacion automatica | Nuevo inspector + Arquitecto | Email + Panel | Alta |

### 7.2 Canales

| Canal | Uso |
|-------|-----|
| **Email** | Confirmaciones, reportes, evaluaciones, olvido contraseña |
| **Panel** | Notificaciones internas, alertas, actualizaciones de estado |
| **WhatsApp** | Solo emergencias criticas (nivel 3) |

---

## 8. AUDITORIA DE ACCIONES

### 8.1 Acciones Criticas (siempre se registran)

| Accion | Entidad | Datos registrados |
|--------|---------|-------------------|
| Login | User | userId, email, ip, timestamp |
| Logout | User | userId, timestamp |
| Crear usuario | User | actorId, nuevoUserId, datos |
| Editar usuario | User | actorId, userId, cambios |
| Eliminar usuario | User | actorId, userId |
| Activar/desactivar usuario | User | actorId, userId, estado |
| Transferir masterAdmin | User | actorId, nuevoMasterAdminId |
| Crear inspeccion | Inspection | actorId, inspectionId, datos |
| Editar inspeccion | Inspection | actorId, inspectionId, cambios |
| Eliminar inspeccion | Inspection | actorId, inspectionId, motivo |
| Cambio de estado | Inspection | actorId, inspectionId, de, a, motivo |
| Suspension | User | actorId, inspectorId, motivo, gravedad |
| Aprobacion/rechazo cancelacion | Inspection | actorId, inspectionId, decision, motivo |
| Subir foto | Photo | actorId, photoId, inspectionId |
| Eliminar foto | Photo | actorId, photoId, inspectionId |
| Generar reporte PDF | Inspection | actorId, inspectionId |
| Cambio de contraseña | User | userId (si fue forzado: actorId) |
| Solicitud eliminacion | Inspection | actorId, inspectionId, motivo |
| Crear cliente | Client | actorId, clientId, datos |
| Editar cliente | Client | actorId, clientId, cambios |
| Eliminar cliente | Client | actorId, clientId |

### 8.2 Acciones Moderadas

| Accion | Entidad | Datos registrados |
|--------|---------|-------------------|
| Ver inspeccion | Inspection | userId, inspectionId (solo admin/masterAdmin) |
| Exportar datos | Varios | userId, tipo, filtros |
| Buscar cliente | Client | userId, criterio |
| Cambiar configuracion | System | userId, setting, valorAnterior, valorNuevo |
| Crear/editar checklist | ChecklistTemplate | actorId, templateId, datos |

### 8.3 Estructura del Audit Log

```javascript
AuditLog {
    id: UUID
    userId: UUID (nullable)          // Quien hizo la accion
    action: String                   // Tipo de accion
    entityType: String               // Tabla afectada
    entityId: UUID                   // Registro afectado
    changes: JSONB                   // Cambios realizados
    ipAddress: String                // IP del actor
    userAgent: Text                  // Browser/dispositivo
    details: JSONB                   // Datos adicionales
    createdAt: Date                  // Cuando ocurrio
}
```

---

## 9. FLUJOS COMPLETOS

### 9.1 Flujo Completo de Inspeccion

```
1.  ADMIN crea cliente → se registra en BD
2.  ADMIN/ARQUITECTO crea inspeccion → asigna inspector
3.  SISTEMA envia email al inspector + notificacion al supervisor
4.  INSPECTOR acepta → cambia a "en_proceso"
5.  INSPECTOR va al campo → mode offline si no hay signal
6.  INSPECTOR toma fotos, llena checklist, agrega observaciones
7.  INSPECTOR guarda localmente (auto cada 30s + boton manual)
8.  INSPECTOR tiene signal → sincroniza automaticamente
9.  INSPECTOR completa → cambia a "lista_revision"
10. SISTEMA notifica a admin + arquitecto + supervisor
11. SUPERVISOR revisa calidad → genera evaluacion semanal
12. ARQUITECTO revisa → aprueba o pide correcciones
13. Si aprueba → ADMIN finaliza → cambia a "finalizada"
14. SISTEMA envia email al cliente + reporte PDF
15. CLIENTE recibe email con encuesta de satisfaccion
16. SUPERVISOR genera evaluacion del inspector
```

### 9.2 Flujo de Suspension

```
1.  SUPERVISOR llena formulario de suspension
    → Motivo (requerido)
    → Descripcion detallada
    → Nivel de gravedad (1, 2, 3)
    → Inspector afectado
2.  SISTEMA notifica a Admin + Arquitecto asignado
3.  SISTEMA busca inspectores disponibles para reasignacion
4.  Admin ve recomendacion del sistema
5.  Admin puede comunicarse con supervisor/suspendido
6.  Admin aprueba reasignacion (puede ser mismo o otro inspector)
7.  Inspector suspendido NO puede recibir nuevas inspecciones
8.  Se registra en audit log
```

### 9.3 Flujo de Cancelacion

```
1.  Quien solicita (supervisor/arquitecto/inspector) llena formulario
    → Motivo de cancelacion (requerido)
    → Descripcion
    → Inspeccion a cancelar
2.  SISTEMA envia alerta al Admin
3.  Admin revisa → aprueba o rechaza
4.  Si aprueba: inspeccion → "cancelada"
5.  Si rechaza: notifica al solicitante con razon
6.  Se registra en audit log
```

### 9.4 Flujo de Eliminacion

```
1.  Solicitante llena formulario
    → Motivo de eliminacion (requerido)
    → Inspeccion a eliminar
2.  SISTEMA envia alerta al Admin
3.  Admin revisa → aprueba o rechaza
4.  Si aprueba: soft delete (recuperable 48h)
5.  Despues de 48h: hard delete automatico
6.  Admin puede ver eliminadas en apartado especial
7.  Se registra en audit log
```

### 9.5 Flujo de Rechazo por Supervisor

```
1.  Supervisor rechaza inspeccion (solo si NO esta en proceso)
    → Motivo del rechazo
2.  Inspeccion vuelve a "pendiente"
3.  SISTEMA notifica al arquitecto
4.  Arquitecto revisa que paso
5.  Se reagenda (misma inspector u otra)
6.  Si es el mismo dia: supervisor solicita reprogramar al cliente
   (primero inspector contacta, luego arquitecto, luego supervisor)
7.  Se registra en audit log
```

### 9.6 Flujo de Contraseña

```
CREACION:
1.  Admin crea usuario → contraseña aleatoria segura generada
2.  SISTEMA envia email: usuario + contraseña
3.  Inspector/arquitecto recibe y puede cambiar despues

CAMBIO:
1.  Usuario solicita cambio desde perfil
2.  SISTEMA envia codigo de confirmacion al correo registrado
3.  Usuario ingresa codigo
4.  Usuario ingresa contraseña actual + nueva + confirmacion
5.  Requisitos: 8+ caracteres, mayuscula, numero, simbolo
6.  SISTEMA confirma cambio

OLVIDE CONTRASEÑA:
1.  Pantalla de login → "Olvide contraseña"
2.  Usuario ingresa email
3.  SISTEMA envia link de reset (expira en 2.5 horas)
4.  Link lleva a pantalla: nueva contraseña + confirmacion
5.  SISTEMA muestra: "Su contraseña anterior era: ****"
6.  Requisitos: 8+ caracteres, mayuscula, numero, simbolo
7.  SISTEMA confirma cambio
```

### 9.7 Flujo de Reasignacion Automatica

```
1.  Inspector es desactivado/suspendido
2.  SISTEMA busca inspecciones pendientes/en_proceso del inspector
3.  SISTEMA busca inspectores disponibles:
    - Mismo arquitecto asignado
    - Misma zona/sector si esta disponible
    - Menor carga de trabajo actual
4.  SISTEMA genera recomendacion
5.  Admin aprueba o ajusta la reasignacion
6.  SISTEMA notifica:
    - Nuevo inspector asignado (email + panel)
    - Arquitecto asignado (email + panel)
    - Supervisor (panel)
7.  Se registra en audit log
```

---

## 10. ROADMAP DE IMPLEMENTACION

### FASE 0: Preparacion (Semana 1)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 0.1 | Rotar JWT_SECRET y credenciales de DB | Ninguna | Nuevo secret en produccion |
| 0.2 | Eliminar .env del historial de git (BFG) | 0.1 | Historial limpio |
| 0.3 | Configurar variables de entorno en proveedor de deploy | 0.1 | Secrets fuera del repo |
| 0.4 | Crear rama `develop` desde `main` | Ninguna | Branch estructurada |

---

### FASE 1: Seguridad Base (Semana 2)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 1.1 | Implementar refresh tokens (backend) | 0.1 | Modelo RefreshToken + endpoints |
| 1.2 | Implementar refresh tokens (frontend) | 1.1 | Interceptor auto-refresh |
| 1.3 | Implementar refresh tokens (mobile) | 1.1 | Interceptor auto-refresh |
| 1.4 | Migrar tokens a storage seguro (frontend) | 1.2 | httpOnly cookies o memory token |
| 1.5 | Migrar tokens a expo-secure-store (mobile) | 1.3 | SecureStore en vez de AsyncStorage |
| 1.6 | Agregar CSP headers (nginx) | Ninguna | Content-Security-Policy |
| 1.7 | Desactivar sourcemaps en produccion | Ninguna | build.sourcemap = false |
| 1.8 | Conectar validadores Joi a todas las rutas | Ninguna | userValidator, inspectionValidator, checklistValidator |

---

### FASE 2: Testing (Semana 3-4)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 2.1 | Configurar Jest + Supertest (backend) | Ninguna | jest.config.js + script test |
| 2.2 | Tests de auth (login, register, refresh, password) | 2.1, 1.1 | Suite de tests auth |
| 2.3 | Tests de inspecciones (CRUD, estados, permisos) | 2.1 | Suite de tests inspecciones |
| 2.4 | Tests de ejecucion (areas, obs, fotos, summary) | 2.1 | Suite de tests ejecucion |
| 2.5 | Tests de permisos (role-based access) | 2.1 | Suite de tests RBAC |
| 2.6 | Configurar Vitest (frontend) | Ninguna | vitest.config.ts + script test |
| 2.7 | Tests de utils (inspectionStatus, permissions, iconSystem) | 2.6 | Suite de tests utils |
| 2.8 | Tests de componentes (Login, CreateInspection, Users) | 2.6 | Suite de tests componentes |
| 2.9 | Configurar Jest (mobile) | Ninguna | jest.config.js + script test |
| 2.10 | Tests de AuthContext y pantallas | 2.9 | Suite de tests mobile |

---

### FASE 3: Entidad Cliente (Semana 5)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 3.1 | Crear modelo Client (Sequelize) | Ninguna | Modelo con validaciones |
| 3.2 | Crear migracion de Client | 3.1 | Tabla clients en BD |
| 3.3 | Crear servicio Client (CRUD) | 3.1 | clientService.js |
| 3.4 | Crear controller Client | 3.3 | clientController.js |
| 3.5 | Crear rutas Client | 3.4 | clientRoutes.js |
| 3.6 | Conectar Client a Inspection (FK) | 3.1, 3.5 | Relacion 1:N |
| 3.7 | Implementar auto-eliminacion (cron job) | 3.3 | Job diario a las 2 AM |
| 3.8 | Crear endpoint de busqueda de clientes | 3.5 | GET /clients?search=&documentType= |
| 3.9 | Crear panel de clientes (frontend) | 3.8 | Pagina Clients.tsx |
| 3.10 | Crear historial de inspecciones por cliente | 3.9 | Vista detallada por cliente |
| 3.11 | Tests de Client | 3.3, 2.1 | Suite de tests |

---

### FASE 4: Rol Supervisor (Semana 6-7)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 4.1 | Agregar rol `supervisor` al seed | Ninguna | Rol en BD |
| 4.2 | Actualizar middleware authorize() para supervisor | 4.1 | Permisos de supervisor |
| 4.3 | Crear formularios de suspension | 4.2 | UI + backend |
| 4.4 | Crear formularios de cancelacion | 4.2 | UI + backend |
| 4.5 | Crear formularios de eliminacion | 4.2 | UI + backend |
| 4.6 | Crear formularios de rechazo | 4.2 | UI + backend |
| 4.7 | Implementar niveles de gravedad (1, 2, 3) | 4.2 | Logica de niveles |
| 4.8 | Crear dashboard del supervisor | 4.2 | Pagina SupervisorDashboard.tsx |
| 4.9 | Implementar KPIs automaticos | 4.8 | Calculo de metricas |
| 4.10 | Implementar ranking de inspectores/arquitectos | 4.9 | Sistema de scoring |
| 4.11 | Crear historial de evaluaciones | 4.10 | Pagina de historial |
| 4.12 | Implementar evaluacion semanal (cron sabado 9AM) | 4.10 | Job automatico |
| 4.13 | Implementar envio de evaluacion por email | 4.12 | Email con evaluacion |
| 4.14 | Implementar reasignacion automatica | 4.2 | Algoritmo de reasignacion |
| 4.15 | Tests de supervisor | 4.2, 2.1 | Suite de tests |

---

### FASE 5: Sistema Offline/Online (Semana 8-9)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 5.1 | Implementar guardado local en mobile (AsyncStorage/SQLite) | Ninguna | Storage local |
| 5.2 | Implementar auto-save cada 30 segundos | 5.1 | Timer de guardado |
| 5.3 | Implementar guardado al cerrar app | 5.1 | AppState listener |
| 5.4 | Implementar indicador online/offline | Ninguna | Badge en UI |
| 5.5 | Implementar boton "Guardar" manual | 5.1 | Funcion de guardado |
| 5.6 | Implementar sincronizacion automatica (30s) | 5.1 | Timer de sync |
| 5.7 | Implementar boton "Sincronizar" manual | 5.6 | Funcion de sync |
| 5.8 | Implementar bloqueo durante sync | 5.6 | Lock de inspeccion |
| 5.9 | Implementar auto-complecion con signal | 5.6 | Deteccion de signal |
| 5.10 | Implementar manejo de errores de sync | 5.6 | Retry + notificacion |
| 5.11 | Implementar manejo de conflictos | 5.6 | Resolucion de conflictos |
| 5.12 | Migrar frontend a sistema offline (IndexedDB ya existe) | 5.1 | Frontend offline |
| 5.13 | Tests de offline | 5.1, 2.9 | Suite de tests |

---

### FASE 6: Notificaciones y Email (Semana 10)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 6.1 | Configurar n8n (Docker o nube) | Ninguna | Instancia n8n |
| 6.2 | Crear workflow: Inspeccion Completada | 6.1 | Workflow n8n |
| 6.3 | Crear workflow: Asignacion de Inspeccion | 6.1 | Workflow n8n |
| 6.4 | Crear workflow: Cambio de Estado | 6.1 | Workflow n8n |
| 6.5 | Crear workflow: Auditoria Critica | 6.1 | Workflow n8n |
| 6.6 | Crear workflow: Recordatorio Pendientes | 6.1 | Workflow n8n |
| 6.7 | Crear workflow: Inspecciones Vencidas | 6.1 | Workflow n8n |
| 6.8 | Crear workflow: Backup BD | 6.1 | Workflow n8n |
| 6.9 | Agregar triggers faltantes en backend | 6.2-6.5 | Codigo backend |
| 6.10 | Configurar variables de entorno n8n | 6.1 | URLs + tokens |
| 6.11 | Implementar envio de contraseña por email | Ninguna | Email de bienvenida |
| 6.12 | Implementar "Olvide contraseña" | 6.11 | Flujo completo |
| 6.13 | Implementar envio de evaluacion por email | 4.13 | Email de evaluacion |
| 6.14 | Tests de notificaciones | 6.2, 2.1 | Suite de tests |

---

### FASE 7: CI/CD (Semana 11)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 7.1 | Crear GitHub Actions: test pipeline | 2.1, 2.6, 2.9 | .github/workflows/test.yml |
| 7.2 | Crear GitHub Actions: lint pipeline | Ninguna | .github/workflows/lint.yml |
| 7.3 | Crear GitHub Actions: build pipeline | Ninguna | .github/workflows/build.yml |
| 7.4 | Crear GitHub Actions: deploy backend | 7.1 | .github/workflows/deploy-backend.yml |
| 7.5 | Crear GitHub Actions: deploy frontend | 7.3 | .github/workflows/deploy-frontend.yml |
| 7.6 | Configurar环境 variables en GitHub | 7.4, 7.5 | Secrets configurados |
| 7.7 | Crear branch protection rules | 7.1 | Reglas en GitHub |

---

### FASE 8: Observabilidad (Semana 12)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 8.1 | Implementar Winston (structured logging) | Ninguna | logger.js |
| 8.2 | Reemplazar console.log por logger | 8.1 | Todos los archivos |
| 8.3 | Implementar Sentry (error tracking) | Ninguna | Configuracion Sentry |
| 8.4 | Integrar Sentry en backend | 8.3 | Error reporting |
| 8.5 | Integrar Sentry en frontend | 8.3 | Error reporting |
| 8.6 | Mejorar health check endpoint | Ninguna | /api/v1/health detallado |
| 8.7 | Implementar metricas basicas (prom-client) | Ninguna | Metricas Prometheus |
| 8.8 | Dashboard de metricas | 8.7 | Grafana o similar |

---

### FASE 9: Mobile MVP (Semana 13-15)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 9.1 | Crear assets/ (icon, splash, adaptive-icon) | Ninguna | Imagenes |
| 9.2 | Crear eas.json | Ninguna | Perfiles de build |
| 9.3 | Crear babel.config.js | Ninguna | Configuracion Babel |
| 9.4 | Crear .gitignore para mobile | Ninguna | Gitignore |
| 9.5 | Implementar pantalla InspectionDetail | 4.2 | Screen |
| 9.6 | Implementar pantalla InspectionExecution | 5.1 | Screen offline-first |
| 9.7 | Implementar pantalla PhotoCapture | 9.6 | Camara + galeria |
| 9.8 | Implementar pantalla AreaDetail | 9.6 | Detalle de area |
| 9.9 | Implementar pantalla ObservationForm | 9.6 | Formulario de observacion |
| 9.10 | Implementar pantalla Profile | Ninguna | Ver/editar perfil |
| 9.11 | Implementar pantalla Settings | Ninguna | Configuracion |
| 9.12 | Implementar pantalla OfflineSync | 5.7 | Gestion de cola offline |
| 9.13 | Implementar boton de logout | Ninguna | UI de logout |
| 9.14 | Implementar ErrorBoundary | Ninguna | Manejo de errores |
| 9.15 | Tests de mobile | 2.9, 9.5-9.14 | Suite completa |

---

### FASE 10: Performance y Pulido (Semana 16-17)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 10.1 | Code splitting por rutas (frontend) | Ninguna | React.lazy |
| 10.2 | Optimizacion de imagenes (WebP) | Ninguna | Compresion automatica |
| 10.3 | Service Worker para PWA | Ninguna | offline support |
| 10.4 | Prefetch de datos criticos | Ninguna | Performance |
| 10.5 | Memoizacion de componentes pesados | Ninguna | React.memo |
| 10.6 | FlatList optimization (mobile) | Ninguna | Virtualizacion |
| 10.7 | Image caching (mobile) | Ninguna | react-native-fast-image |
| 10.8 | Connection pooling tuning (backend) | Ninguna | Max conexiones |
| 10.9 | Query optimization (N+1) | Ninguna | Includes optimizados |
| 10.10 | Redis para cache | Ninguna | Cache de sesiones |

---

### FASE 11: Documentacion y Lanzamiento (Semana 18)

| # | Tarea | Dependencias | Entregable |
|---|-------|-------------|------------|
| 11.1 | Crear LICENSE.txt | Ninguna | Licencia proprietaria |
| 11.2 | Crear CHANGELOG.md | Ninguna | Historial de cambios |
| 11.3 | Actualizar README.md | Ninguna | Documentacion completa |
| 11.4 | Crear guia de usuario | Ninguna | Manual de usuario |
| 11.5 | Crear guia de admin | Ninguna | Manual de administracion |
| 11.6 | Configurar git tags | Ninguna | v1.0.0 |
| 11.7 | Deploy a produccion | 7.4, 7.5 | Sistema en produccion |
| 11.8 | Smoke tests en produccion | 11.7 | Verificacion |

---

### RESUMEN DEL ROADMAP

| Fase | Semanas | Dependencias Criticas |
|------|---------|----------------------|
| 0. Preparacion | 1 | Ninguna |
| 1. Seguridad Base | 2 | Fase 0 |
| 2. Testing | 3-4 | Fase 1 |
| 3. Entidad Cliente | 5 | Fase 2 |
| 4. Rol Supervisor | 6-7 | Fase 3 |
| 5. Offline/Online | 8-9 | Fase 4 |
| 6. Notificaciones | 10 | Fase 5 |
| 7. CI/CD | 11 | Fase 2 |
| 8. Observabilidad | 12 | Fase 7 |
| 9. Mobile MVP | 13-15 | Fase 5 |
| 10. Performance | 16-17 | Fase 9 |
| 11. Lanzamiento | 18 | Todas |

**Tiempo total estimado: 18 semanas (4.5 meses) con 1 desarrollador senior**

---

> **Nota:** Este documento es la fuente unica de verdad para la implementacion del sistema. Toda decision de desarrollo debe referenciar este documento.
