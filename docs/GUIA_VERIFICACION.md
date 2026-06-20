# Guia de Verificacion Post-Migracion Prisma + 7 DBs

**Backend URL:** `https://aimachristian-curielbackend.ajcxjb.easypanel.host`
**Fecha:** 2026-06-20

---

## 0. Requisitos Previos

- Tienes acceso a la app frontend (`https://aimachristian-curielapp.ajcxjb.easypanel.host`)
- Tienes acceso a la app mobile (Expo)
- Tienes credenciales de admin: `admin@curiel.com` / `Mineria99*` (se actualizara a `Admin123*` en el proximo deploy)

---

## 1. Verificar Backend (Health Check)

Abre en el navegador:

```
https://aimachristian-curielbackend.ajcxjb.easypanel.host/api/v1/health
```

**Esperado:** `"status":"operational"` y las 7 DBs con `"status":"connected"`.

Si alguna DB muestra `"error"` → revisar que los puertos 5434-5440 esten abiertos en el VPS.

---

## 2. Login (Auth)

### 2.1 Login desde la App Web

1. Abre `https://aimachristian-curielapp.ajcxjb.easypanel.host`
2. Ingresa: `admin@curiel.com` / `Mineria99*`
3. **Esperado:** Te redirige al dashboard

**Errores posibles:**
- `Credenciales invalidas` → La password no coincide. Ejecutar el script de fix en la consola del container:

```bash
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_AUTH });
const prisma = new PrismaClient({ adapter });
(async () => {
  const hash = await bcrypt.hash('Admin123*', 12);
  await prisma.user.update({ where: { email: 'admin@curiel.com' }, data: { passwordHash: hash, isMasterAdmin: true } });
  console.log('OK - password actualizada a Admin123*');
  await prisma.\$disconnect();
})();
"
```

- `Network error` → El backend no está corriendo. Revisa los logs del container.

### 2.2 Login desde la App Mobile

1. Abre la app en Expo
2. Ingresa las mismas credenciales
3. **Esperado:** Login exitoso, ves el home

---

## 3. Verificar Cada Modulo

Sigue este orden. Cada paso验证 un dominio de base de datos diferente.

### 3.1 AUTH (DB: curiel_auth :5434)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Login | `POST /api/v1/auth/login` | Token JWT |
| 2 | Ver perfil | `GET /api/v1/auth/me` | Datos del usuario |
| 3 | Cambiar password | `PUT /api/v1/auth/change-password` | Exito |
| 4 | Refresh token | `POST /api/v1/auth/refresh` | Nuevo token |
| 5 | Logout | `POST /api/v1/auth/logout` | Exito |

### 3.2 USERS (DB: curiel_auth :5434)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Listar usuarios | `GET /api/v1/users` | Array de usuarios |
| 2 | Estadisticas | `GET /api/v1/users/stats` | Counts por rol |
| 3 | Ver inspectores | `GET /api/v1/users/inspectors` | Lista de inspectores |
| 4 | Crear usuario | `POST /api/v1/users` | Usuario creado |
| 5 | Ver usuario | `GET /api/v1/users/:id` | Datos del usuario |
| 6 | Actualizar | `PUT /api/v1/users/:id` | Usuario actualizado |
| 7 | Toggle estado | `PATCH /api/v1/users/:id/status` | Activo/Inactivo |

### 3.3 CLIENTS (DB: curiel_admin :5437)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Listar clientes | `GET /api/v1/clients` | Array de clientes |
| 2 | Buscar cliente | `GET /api/v1/clients/search?query=Juan` | Resultados |
| 3 | Crear cliente | `POST /api/v1/clients` | Cliente creado |
| 4 | Ver cliente | `GET /api/v1/clients/:id` | Datos del cliente |
| 5 | Actualizar | `PUT /api/v1/clients/:id` | Cliente actualizado |
| 6 | Historial inspecciones | `GET /api/v1/clients/:id/inspections` | Array |
| 7 | Eliminar | `DELETE /api/v1/clients/:id` | Exito |

### 3.4 CHECKLISTS (DB: curiel_admin :5437)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Listar templates | `GET /api/v1/checklists/templates` | Array |
| 2 | Ver template | `GET /api/v1/checklists/templates/:id` | Template con items |
| 3 | Crear template | `POST /api/v1/checklists/templates` | Template creado |
| 4 | Agregar item | `POST /api/v1/checklists/templates/:id/items` | Item creado |
| 5 | Actualizar item | `PUT /api/v1/checklists/items/:itemId` | Item actualizado |

### 3.5 INSPECTIONS (DB: curiel_inspecciones :5435)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Estadisticas | `GET /api/v1/inspections/stats` | Conteos por status |
| 2 | Listar | `GET /api/v1/inspections` | Array |
| 3 | Crear inspeccion | `POST /api/v1/inspections` | Inspeccion creada (status: pendiente) |
| 4 | Ver inspeccion | `GET /api/v1/inspections/:id` | Datos completos |
| 5 | Actualizar | `PUT /api/v1/inspections/:id` | Actualizada |
| 6 | Cambiar estado | `PATCH /api/v1/inspections/:id/status` | Status cambiado |
| 7 | Ver informe | `GET /api/v1/inspections/:id/report` | PDF o datos |
| 8 | Eliminar | `DELETE /api/v1/inspections/:id` | Exito |

### 3.6 INSPECTION EXECUTION (DB: curiel_inspecciones :5435)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Ver ejecucion | `GET /api/v1/inspections/:id/execution` | Areas, obs, fotos, resumen |
| 2 | Crear area | `POST .../execution/areas` | Area creada |
| 3 | Actualizar area | `PUT .../execution/areas/:areaId` | Area actualizada |
| 4 | Crear observacion | `POST .../execution/observations` | Observacion creada |
| 5 | Actualizar obs | `PUT .../execution/observations/:obsId` | Obs actualizada |
| 6 | Subir foto | `POST .../execution/photos` | Foto subida (Cloudinary) |
| 7 | Actualizar resumen | `PUT .../execution/summary` | Resumen actualizado |
| 8 | Completar | `POST .../execution/complete` | Inspeccion completada |
| 9 | Eliminar area | `DELETE .../execution/areas/:areaId` | Exito |
| 10 | Eliminar obs | `DELETE .../execution/observations/:obsId` | Exito |

### 3.7 PHOTOS (DB: curiel_media :5436)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Subir foto | `POST /api/v1/photos/inspection/:id` | Foto en Cloudinary |
| 2 | Subir multiples | `POST /api/v1/photos/inspection/:id/multiple` | Fotos subidas |
| 3 | Listar fotos | `GET /api/v1/photos/inspection/:id` | Array |
| 4 | Ver foto | `GET /api/v1/photos/:id` | Datos |
| 5 | Actualizar | `PUT /api/v1/photos/:id` | Actualizada |
| 6 | Eliminar | `DELETE /api/v1/photos/:id` | Exito |

### 3.8 NOTIFICATIONS (DB: curiel_notificaciones :5438)

| # | Accion | Endpoint | Esperado |
|---|--------|----------|----------|
| 1 | Listar | `GET /api/v1/notifications` | Array |
| 2 | Conteo no leidas | `GET /api/v1/notifications/unread-count` | Numero |
| 3 | Marcar una leida | `PUT /api/v1/notifications/:id/read` | Exito |
| 4 | Marcar todas | `PUT /api/v1/notifications/read-all` | Exito |

### 3.9 ALERTS (DB: curiel_alertas :5439)

| # | Accion | Endpoint | Esperado | Rol |
|---|--------|----------|----------|-----|
| 1 | Listar | `GET /api/v1/alerts` | Array | supervisor |
| 2 | Por nivel | `GET /api/v1/alerts/level/2` | Alertas nivel 2 | supervisor |
| 3 | Crear | `POST /api/v1/alerts` | Alerta creada | supervisor |
| 4 | Ver | `GET /api/v1/alerts/:id` | Datos | supervisor |
| 5 | Actualizar | `PUT /api/v1/alerts/:id` | Actualizada | supervisor |

### 3.10 SUSPENSIONS (DB: curiel_alertas :5439)

| # | Accion | Endpoint | Esperado | Rol |
|---|--------|----------|----------|-----|
| 1 | Listar | `GET /api/v1/suspensions` | Array | supervisor |
| 2 | Suspendidos | `GET /api/v1/suspensions/suspended` | Inspectores suspendidos | supervisor |
| 3 | Crear | `POST /api/v1/suspensions` | Suspension creada | supervisor |
| 4 | Ver | `GET /api/v1/suspensions/:id` | Datos | supervisor |
| 5 | Levantar | `PUT /api/v1/suspensions/:id/lift` | Levantada | admin |

### 3.11 EVALUATIONS (DB: curiel_alertas :5439)

| # | Accion | Endpoint | Esperado | Rol |
|---|--------|----------|----------|-----|
| 1 | Listar | `GET /api/v1/evaluations` | Array | supervisor |
| 2 | Crear | `POST /api/v1/evaluations` | Evaluacion creada | supervisor |
| 3 | Ver | `GET /api/v1/evaluations/:id` | Datos | supervisor |
| 4 | Actualizar | `PUT /api/v1/evaluations/:id` | Actualizada | supervisor |
| 5 | Bulk | `POST /api/v1/evaluations/bulk` | Evaluaciones generadas | supervisor |
| 6 | Ranking insp. | `GET /api/v1/evaluations/ranking/inspectors` | Ranking | supervisor |
| 7 | Ranking arq. | `GET /api/v1/evaluations/ranking/architects` | Ranking | supervisor |
| 8 | KPIs | `GET /api/v1/evaluations/dashboard-kpis` | KPIs | supervisor |

### 3.12 AUDIT LOG (DB: curiel_auditoria :5440)

No tiene endpoints directos. Se genera automaticamente cuando:
- Un usuario hace login
- Se crea/edita un usuario
- Se cambia password

**Verificar:** Despues de hacer login y CRUD de usuarios, ejecuta en la consola del container:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_AUDITORIA });
const prisma = new PrismaClient({ adapter });
prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } }).then(r => {
  console.log(JSON.stringify(r, null, 2));
  prisma.\$disconnect();
});
"
```

**Esperado:** Varios registros con acciones como `login`, `create`, `update`.

---

## 4. Flujo Completo de Inspeccion (E2E)

Este es el flujo mas critico — una inspeccion de principio a fin:

1. **Login** como admin → obtener token
2. **Crear cliente** → `POST /api/v1/clients` → obtener clientId
3. **Crear inspeccion** → `POST /api/v1/inspections` con clientId → obtener inspectionId
4. **Cambiar a en_proceso** → `PATCH /api/v1/inspections/:id/status` con `status: "en_proceso"`
5. **Ver ejecucion** → `GET /api/v1/inspections/:id/execution`
6. **Crear areas** → `POST .../execution/areas` (varias veces)
7. **Crear observaciones** → `POST .../execution/observations` (en cada area)
8. **Subir fotos** → `POST .../execution/photos` (en cada obs/area)
9. **Actualizar resumen** → `PUT .../execution/summary`
10. **Completar** → `POST .../execution/complete`
11. **Generar informe** → `GET /api/v1/inspections/:id/report`
12. **Verificar notificacion** → `GET /api/v1/notifications`
13. **Verificar audit log** → query directa a curiel_auditoria

---

## 5. Verificar Frontend (App Web)

1. Abre `https://aimachristian-curielapp.ajcxjb.easypanel.host`
2. Login con admin
3. Navega por:
   - Dashboard (debe cargar stats)
   - Inspecciones (debe listar)
   - Clientes (debe listar)
   - Usuarios (debe listar)
   - Notificaciones (debe mostrar badge)
4. Crea una inspeccion nueva desde la UI
5. Edita una inspeccion existente

---

## 6. Verificar Mobile (Expo)

1. Abre la app en Expo
2. Login
3. Navega por las pantallas principales
4. Crea una inspeccion
5. Ejecuta una inspeccion (areas, obs, fotos)

---

## 7. Troubleshooting

| Error | Causa | Solucion |
|-------|-------|----------|
| `Network error` | Backend caido | Revisar logs del container en EasyPanel |
| `Credenciales invalidas` | Password incorrecta | Ejecutar script de fix de password (seccion 2.1) |
| `403 Forbidden` | Rol incorrecto | Verificar que el usuario tiene el rol correcto en curiel_auth |
| `404 Not Found` | Endpoint no existe | Verificar que la URL es `/api/v1/...` |
| `500 Internal Server Error` | Error en el servidor | Revisar logs, buscar el stack trace |
| `429 Too Many Requests` | Rate limit | Esperar 15 min o reiniciar el container |
| `P2002` Prisma error | Constraint unico duplicado | Datos duplicados (email, documento, etc.) |
| `P2025` Prisma error | Registro no encontrado | ID no existe en la DB |
| `P2003` Prisma error | Foreign key invalida | Referencia a un registro que no existe en otra DB |

---

## 8. Comandos Utiles (Consola del Container)

```bash
# Ver todos los usuarios
node -e "
const {PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
const a=new PrismaPg({connectionString:process.env.DATABASE_URL_AUTH});
const p=new PrismaClient({adapter:a});
p.user.findMany().then(r=>{console.log(JSON.stringify(r,null,2));p.\$disconnect()});
"

# Ver todas las inspecciones
node -e "
const{PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
const a=new PrismaPg({connectionString:process.env.DATABASE_URL_INSPECCIONES});
const p=new PrismaClient({adapter:a});
p.inspection.findMany().then(r=>{console.log(JSON.stringify(r,null,2));p.\$disconnect()});
"

# Ver todos los clientes
node -e "
const{PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
const a=new PrismaPg({connectionString:process.env.DATABASE_URL_ADMIN});
const p=new PrismaClient({adapter:a});
p.client.findMany().then(r=>{console.log(JSON.stringify(r,null,2));p.\$disconnect()});
"

# Reset password del admin
node -e "
const bcrypt=require('bcryptjs');
const{PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
const a=new PrismaPg({connectionString:process.env.DATABASE_URL_AUTH});
const p=new PrismaClient({adapter:a});
(async()=>{
  const h=await bcrypt.hash('Admin123*',12);
  await p.user.update({where:{email:'admin@curiel.com'},data:{passwordHash:h,isMasterAdmin:true}});
  console.log('OK');
  await p.\$disconnect();
})();
"

# Contar registros por tabla
node -e "
const{PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
(async()=>{
  const dbs=[
    {name:'auth',url:process.env.DATABASE_URL_AUTH},
    {name:'inspecciones',url:process.env.DATABASE_URL_INSPECCIONES},
    {name:'media',url:process.env.DATABASE_URL_MEDIA},
    {name:'admin',url:process.env.DATABASE_URL_ADMIN},
    {name:'notificaciones',url:process.env.DATABASE_URL_NOTIFICACIONES},
    {name:'alertas',url:process.env.DATABASE_URL_ALERTAS},
    {name:'auditoria',url:process.env.DATABASE_URL_AUDITORIA}
  ];
  for(const db of dbs){
    const a=new PrismaPg({connectionString:db.url});
    const p=new PrismaClient({adapter:a});
    const tables=await p.\$queryRawUnsafe(\`SELECT tablename FROM pg_tables WHERE schemaname='public'\`);
    console.log('\\n'+db.name+':');
    for(const t of tables){
      const r=await p.\$queryRawUnsafe('SELECT count(*)::int as n FROM '+t.tablename);
      console.log('  '+t.tablename+': '+r[0].n);
    }
    await p.\$disconnect();
  }
})();
"
```
