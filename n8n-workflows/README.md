# 🔄 AUTOMATIZACIÓN CON N8N - CURIEL

Este directorio contiene los workflows de n8n para automatizar procesos en CURIEL.

## 📋 Workflows Disponibles

### 1. Inspección Completada (inspection-completed)
**Trigger:** Al finalizar una inspección
**Acciones:**
- Enviar email al cliente con el PDF adjunto
- Notificar al administrador
- Registrar en Google Sheets (opcional)
- Enviar mensaje a Slack (opcional)

### 2. Notificación de Asignación (inspection-assigned)
**Trigger:** Al asignar una inspección a un inspector
**Acciones:**
- Email al inspector
- SMS (opcional)
- Notificación push (futuro)

### 3. Audit Log (audit-log)
**Trigger:** Eventos críticos del sistema
**Acciones:**
- Almacenar en base de datos externa
- Alertas a administradores
- Backups de seguridad

---

## 🚀 INSTALACIÓN DE N8N

### Opción 1: Docker (Recomendado)

```powershell
# Ejecutar n8n en Docker
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  -v C:\Users\TU_USUARIO\.n8n:/home/node/.n8n `
  n8nio/n8n
```

### Opción 2: NPM

```powershell
# Instalar globalmente
npm install -g n8n

# Iniciar
n8n start
```

Acceder a: http://localhost:5678

---

## 📝 CREAR WORKFLOW: INSPECCIÓN COMPLETADA

### Paso 1: Crear Webhook

1. En n8n, crear nuevo workflow
2. Agregar nodo **Webhook**
3. Configurar:
   - Method: POST
   - Path: `inspection-completed`
   - Response: Immediately

4. Copiar la URL del webhook (ej: `http://localhost:5678/webhook/inspection-completed`)

### Paso 2: Agregar Procesamiento

Agregar nodo **Function** para procesar datos:

```javascript
// Extraer datos del webhook
const inspection = $input.all()[0].json;

return [{
  json: {
    to: inspection.clientEmail,
    subject: `Inspección Completada - ${inspection.projectName}`,
    inspectorName: inspection.inspectorName,
    projectName: inspection.projectName,
    completedDate: inspection.completedDate
  }
}];
```

### Paso 3: Enviar Email

Agregar nodo **Send Email**:

**Configuración:**
- To: `{{ $json.to }}`
- Subject: `{{ $json.subject }}`
- Text:
```
Estimado cliente,

La inspección del proyecto {{ $json.projectName }} ha sido completada exitosamente.

Inspector: {{ $json.inspectorName }}
Fecha: {{ $json.completedDate }}

El reporte PDF se adjunta a este correo.

Saludos,
Equipo CURIEL
```

**SMTP Settings:**
- Host: smtp.gmail.com
- Port: 587
- User: tu_email@gmail.com
- Password: tu_app_password

### Paso 4: Notificar Admin

Agregar nodo **Send Email** (segundo):

- To: admin@curiel.com
- Subject: `Nueva Inspección Completada`
- Text: Notificación interna

### Paso 5: Activar

1. Guardar workflow
2. Activar (toggle en la esquina superior derecha)
3. Copiar URL del webhook

---

## ⚙️ CONFIGURAR EN BACKEND

Agregar la URL del webhook en `backend/.env`:

```env
N8N_WEBHOOK_INSPECTION_COMPLETED=http://localhost:5678/webhook/inspection-completed
```

Si n8n está en otro servidor:
```env
N8N_WEBHOOK_INSPECTION_COMPLETED=https://tu-n8n.com/webhook/inspection-completed
```

---

## 📋 EJEMPLO: WORKFLOW COMPLETO (JSON)

Guarda este JSON como `inspection-completed.json` e impórtalo en n8n:

```json
{
  "name": "CURIEL - Inspección Completada",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "inspection-completed",
        "responseMode": "onReceived"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "const data = $input.all()[0].json;\n\nreturn [{\n  json: {\n    clientEmail: data.clientEmail,\n    clientName: data.clientName,\n    projectName: data.projectName,\n    inspectorName: data.inspectorName,\n    completedDate: new Date(data.completedDate).toLocaleDateString('es-ES')\n  }\n}];"
      },
      "name": "Procesar Datos",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "fromEmail": "noreply@curiel.com",
        "toEmail": "={{ $json.clientEmail }}",
        "subject": "Inspección Completada - {{ $json.projectName }}",
        "text": "Estimado {{ $json.clientName }},\n\nLa inspección del proyecto {{ $json.projectName }} ha sido completada exitosamente.\n\nInspector: {{ $json.inspectorName }}\nFecha: {{ $json.completedDate }}\n\nEl reporte PDF se encuentra disponible.\n\nSaludos,\nEquipo CURIEL"
      },
      "name": "Email Cliente",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2,
      "position": [650, 200]
    },
    {
      "parameters": {
        "toEmail": "admin@curiel.com",
        "subject": "Nueva Inspección Completada",
        "text": "Proyecto: {{ $json.projectName }}\nCliente: {{ $json.clientName }}\nInspector: {{ $json.inspectorName }}"
      },
      "name": "Email Admin",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2,
      "position": [650, 400]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Procesar Datos", "type": "main", "index": 0}]]
    },
    "Procesar Datos": {
      "main": [
        [
          {"node": "Email Cliente", "type": "main", "index": 0},
          {"node": "Email Admin", "type": "main", "index": 0}
        ]
      ]
    }
  }
}
```

---

## 🧪 PROBAR WEBHOOK

Desde PowerShell (con backend corriendo):

```powershell
# Test manual del webhook
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/inspection-completed" `
  -ContentType "application/json" `
  -Body '{
    "inspectionId": "test-123",
    "projectName": "Torre Solar",
    "clientName": "Juan Pérez",
    "clientEmail": "cliente@example.com",
    "inspectorName": "Carlos Inspector",
    "completedDate": "2026-02-15T10:30:00Z"
  }'
```

**Resultado esperado:**
- Email enviado al cliente
- Email enviado al admin
- Respuesta 200 OK

---

## 📊 WORKFLOWS ADICIONALES (Futuro)

### Recordatorio de Inspecciones Pendientes
**Trigger:** Cron (diario a las 9 AM)
**Acción:** Email a inspectores con inspecciones del día

### Backup Automático
**Trigger:** Cron (diario a las 2 AM)
**Acción:** Exportar datos a Google Drive

### Alerta de Inspecciones Vencidas
**Trigger:** Cron (cada hora)
**Acción:** Notificación si hay inspecciones > 7 días en "en_proceso"

---

## 🔐 SEGURIDAD

### Autenticación de Webhooks (Recomendado para Producción)

En n8n, agregar nodo **HTTP Request** antes de procesar:

```javascript
// Verificar secret token
const receivedToken = $input.all()[0].headers.authorization;
const expectedToken = 'TU_SECRET_TOKEN';

if (receivedToken !== `Bearer ${expectedToken}`) {
  throw new Error('Unauthorized');
}

return $input.all();
```

En backend, enviar token:

```javascript
// backend/src/utils/n8n.js
const response = await axios.post(webhookUrl, data, {
  headers: {
    'Authorization': `Bearer ${process.env.N8N_SECRET_TOKEN}`
  }
});
```

---

## 📈 MONITOREO

n8n incluye dashboard de ejecuciones:

- Ver historial de ejecuciones
- Identificar errores
- Tiempo de ejecución
- Datos procesados

Acceder: http://localhost:5678/executions

---

## 🌐 DEPLOY DE N8N EN PRODUCCIÓN

### Railway

```powershell
# Con Railway CLI
railway init
railway add n8n

# O con Docker
railway up
```

### Render

1. Crear Web Service
2. Docker Image: `n8nio/n8n`
3. Environment Variables:
   - `N8N_BASIC_AUTH_ACTIVE=true`
   - `N8N_BASIC_AUTH_USER=admin`
   - `N8N_BASIC_AUTH_PASSWORD=tu_password`

---

## 📞 RECURSOS

- [Documentación n8n](https://docs.n8n.io/)
- [Nodos disponibles](https://docs.n8n.io/integrations/builtin/)
- [Ejemplos de workflows](https://n8n.io/workflows/)

---

**¡Con n8n puedes automatizar todo sin escribir código adicional!** 🚀
