# AUTOMATIZACION CON N8N - CURIEL

Este directorio contiene los workflows de n8n para automatizar procesos en CURIEL.

## Workflows Disponibles

### Webhooks (triggered por el backend)

| # | Archivo | Trigger | Descripcion |
|---|---------|---------|-------------|
| 1 | `inspection-completed.json` | Webhook POST | Email a cliente + admin al finalizar inspeccion |
| 2 | `inspection-assigned.json` | Webhook POST | Email al inspector al ser asignado |
| 3 | `user-notification.json` | Webhook POST | Email al cambiar estado de usuario |
| 4 | `evaluation-notification.json` | Webhook POST | Email al evaluado con score semanal |

### Cron Jobs (automaticos)

| # | Archivo | Schedule | Descripcion |
|---|---------|----------|-------------|
| 5 | `reminder-pending.json` | 8am weekdays | Email a admin con inspecciones pendientes |
| 6 | `overdue-inspections.json` | 9am Monday | Email a admin con inspecciones vencidas |
| 7 | `database-backup.json` | 3am daily | Backup automatico de PostgreSQL via pg_dump |

### Seguridad

Todos los webhooks validan el header `X-CURIEL-SECRET` contra la variable de entorno `CURIEL_SECRET_TOKEN`. Si no coincide, el request es rechazado.

Los cron jobs usan credenciales `httpHeaderAuth` de n8n para autenticar contra la API backend.

---

## Instalacion de n8n

### Opcion 1: Docker (Recomendado)

```powershell
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  -v C:\Users\TU_USUARIO\.n8n:/home/node/.n8n `
  n8nio/n8n
```

### Opcion 2: NPM

```powershell
npm install -g n8n
n8n start
```

Acceder a: http://localhost:5678

---

## Importar Workflows

1. En n8n, ir a **Menu > Import from File**
2. Seleccionar el archivo JSON de este directorio
3. Configurar credenciales SMTP en n8n (Settings > Credentials)
4. Configurar variables de entorno en n8n:
   - `CURIEL_SECRET_TOKEN` = el mismo token del backend
   - `SMTP_FROM_EMAIL` = noreply@curiel.com
   - `FRONTEND_URL` = URL del frontend
   - `BACKEND_URL` = URL del backend
   - `ADMIN_EMAIL` = email del admin
   - `DB_HOST`, `DB_USER`, `DB_NAME` (para backup)
5. Activar el workflow

---

## Variables de Entorno Requeridas

### En n8n (Settings > Environment Variables)

```env
CURIEL_SECRET_TOKEN=tu-token-secreto-mismo-que-backend
SMTP_FROM_EMAIL=noreply@curiel.com
FRONTEND_URL=https://aimachristian-curielapp.ajcxjb.easypanel.host
BACKEND_URL=https://aimachristian-curielbackend.ajcxjb.easypanel.host
ADMIN_EMAIL=admin@curiel.com
DB_HOST=localhost
DB_USER=postgres
DB_NAME=curiel_db
```

### En backend (.env)

```env
N8N_WEBHOOK_INSPECTION_COMPLETED=https://tu-n8n.com/webhook/inspection-completed
N8N_WEBHOOK_USER_NOTIFICATION=https://tu-n8n.com/webhook/user-notification
N8N_WEBHOOK_AUDIT_LOG=https://tu-n8n.com/webhook/audit-log
N8N_WEBHOOK_EVALUATION_NOTIFICATION=https://tu-n8n.com/webhook/evaluation-notification
N8N_SECRET_TOKEN=tu-token-secreto
```

---

## Probar Webhooks

Desde PowerShell (con backend corriendo):

```powershell
# Test inspection-completed
Invoke-RestMethod -Method Post `
  -Uri "https://tu-n8n.com/webhook/inspection-completed" `
  -ContentType "application/json" `
  -Headers @{ "X-CURIEL-SECRET" = "tu-token-secreto" } `
  -Body '{
    "inspection": {
      "id": "test-123",
      "projectName": "Torre Solar",
      "clientName": "Juan Perez",
      "clientEmail": "cliente@example.com",
      "status": "finalizada"
    }
  }'

# Test inspection-assigned
Invoke-RestMethod -Method Post `
  -Uri "https://tu-n8n.com/webhook/inspection-assigned" `
  -ContentType "application/json" `
  -Headers @{ "X-CURIEL-SECRET" = "tu-token-secreto" } `
  -Body '{
    "inspection": {
      "id": "test-456",
      "projectName": "Torre Solar",
      "clientName": "Juan Perez",
      "scheduledDate": "2026-07-15"
    },
    "inspector": {
      "fullName": "Carlos Inspector",
      "email": "inspector@curiel.com"
    }
  }'
```

---

## Deploy en Produccion

### EasyPanel (VPS)

1. Crear servicio Docker en EasyPanel
2. Imagen: `n8nio/n8n`
3. Puerto: 5678
4. Variables de entorno configuradas
5. Persistir volumen `/home/node/.n8n`

### Railway

```powershell
railway init
railway add n8n
railway up
```

### Render

1. Crear Web Service
2. Docker Image: `n8nio/n8n`
3. Environment Variables configuradas

---

## Monitoreo

n8n incluye dashboard de ejecuciones:
- Ver historial de ejecuciones
- Identificar errores
- Tiempo de ejecucion
- Datos procesados

Acceder: http://localhost:5678/executions

---

## Recursos

- [Documentacion n8n](https://docs.n8n.io/)
- [Nodos disponibles](https://docs.n8n.io/integrations/builtin/)
- [Ejemplos de workflows](https://n8n.io/workflows/)
