# FASE 6 — Notificaciones y Email

## Resumen

Implementación completa del sistema de notificaciones por email para CURIEL, incluyendo envío directo vía SMTP, integración con n8n para workflows automatizados, y sistema de recuperación de contraseña. Las notificaciones in-app ya existían de fases anteriores.

**Estado**: ✅ COMPLETA

## Arquitectura

### Stack de Notificaciones

| Componente | Tecnología | Descripción |
|---|---|---|
| **Envío de email** | `nodemailer` | Envío directo vía SMTP (Gmail, etc.) |
| **Templates HTML** | Templates nativos | HTML inline CSS, branding CURIEL |
| **Workflows automatizados** | `n8n` | JSON importables, webhooks + crons |
| **Reset de contraseña** | Token UUID + bcrypt | Tokens con expiración de 1 hora |
| **Notificaciones in-app** | Modelo `Notification` | Ya existente de fases anteriores |

### Flujo de Email

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Evento del      │────▶│  emailService│────▶│  Servidor    │
│  Sistema         │     │  (nodemailer)│     │  SMTP        │
└──────────────────┘     └──────────────┘     └──────────────┘
                               │
                               │  Sin SMTP configurado
                               ▼
                         ┌──────────────┐
                         │  DRY-RUN     │
                         │  (log only)  │
                         └──────────────┘
```

### Configuración de Variables de Entorno

```env
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
FROM_EMAIL=noreply@curiel.com
FROM_NAME=CURIEL Inspecciones

# n8n Webhooks (opcional)
N8N_WEBHOOK_INSPECTION_COMPLETED=https://tu-n8n.com/webhook/inspection-completed
N8N_WEBHOOK_USER_NOTIFICATION=https://tu-n8n.com/webhook/user-notification
N8N_WEBHOOK_AUDIT_LOG=https://tu-n8n.com/webhook/audit-log
N8N_WEBHOOK_EVALUATION_NOTIFICATION=https://tu-n8n.com/webhook/evaluation-notification
N8N_SECRET_TOKEN=tu-token-secreto
```

> **Nota**: Si `SMTP_USER` y `SMTP_PASSWORD` no están configurados, el sistema funciona en modo **dry-run** — los emails se registran en consola pero no se envían.

---

## Backend (`backend_legacy/`)

### Archivos Creados

| Archivo | Descripción |
|---|---|
| `src/services/emailService.js` | Servicio genérico de envío de email con dry-run |
| `src/utils/emailTemplates.js` | Templates HTML para cada tipo de email |
| `src/models/PasswordResetToken.js` | Modelo para tokens de reset de contraseña |
| `src/__tests__/email.test.js` | Tests del servicio y templates (7 tests) |

### Archivos Modificados

| Archivo | Cambios |
|---|---|
| `src/models/index.js` | Import y export de `PasswordResetToken` |
| `src/controllers/authController.js` | `forgotPassword`, `resetPassword`, email de bienvenida en `register` |
| `src/routes/authRoutes.js` | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| `src/controllers/evaluationController.js` | Envío de email de evaluación al crear evaluación |
| `src/services/inspectionService.js` | Trigger de webhook `inspectionCompleted` al finalizar inspección |
| `package.json` | Dependencia `nodemailer` |

### Servicio de Email (`emailService.js`)

```javascript
// Envío estándar
await sendEmail({
  to: 'usuario@example.com',
  subject: 'Asunto del email',
  html: '<p>Contenido HTML</p>',
  text: 'Contenido texto plano (opcional)'
});

// Respuesta exitosa
{ success: true, messageId: 'abc123' }

// Respuesta dry-run (sin SMTP)
{ success: true, dryRun: true }
```

### Templates Disponibles

| Template | Uso | Variables |
|---|---|---|
| `welcomeEmail(user, tempPassword)` | Email de bienvenida al crear usuario | user.fullName, user.email, tempPassword |
| `passwordResetEmail(user, resetUrl)` | Solicitud de reset de contraseña | user.fullName, resetUrl (1 hora de expiración) |
| `evaluationEmail(user, evaluation)` | Notificación de evaluación semanal | user.fullName, evaluation.score/comment/weekStart/weekEnd |

### Endpoints de Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/auth/forgot-password` | No | Solicita reset, envía email con token |
| `POST` | `/api/v1/auth/reset-password` | No | Valida token, actualiza contraseña |
| `POST` | `/api/v1/auth/register` | Admin | Ahora envía email de bienvenida con contraseña temporal |

### Modelo `PasswordResetToken`

```javascript
{
  id: UUID (PK),
  userId: UUID (FK → User),
  token: String(64) (único),
  expiresAt: Date,
  usedAt: Date (nullable)
}
```

Métodos estáticos:
- `generateToken(userId)` — Genera token con 1 hora de expiración
- `findByToken(token)` — Busca token válido (no expirado, no usado)
- `isExpired()` / `isUsed()` — Verificación de estado

### Webhooks n8n

| Evento | Webhook | Descripción |
|---|---|---|
| `inspectionCompleted` | `N8N_WEBHOOK_INSPECTION_COMPLETED` | Inspección cambiada a `finalizada` |
| `inspectionAssigned` | (JSON en n8n-workflows/) | Inspector asignado a inspección |
| `userNotification` | `N8N_WEBHOOK_USER_NOTIFICATION` | Cambio de estado de usuario |
| `evaluationNotification` | `N8N_WEBHOOK_EVALUATION_NOTIFICATION` | Evaluación semanal creada |

---

## Frontend (`frontend/`)

### Archivos Creados

| Archivo | Descripción |
|---|---|
| `src/pages/ForgotPassword.tsx` | Página de "Olvidé mi contraseña" (email input) |
| `src/pages/ResetPassword.tsx` | Página de reset con token desde URL |

### Archivos Modificados

| Archivo | Cambios |
|---|---|
| `src/App.tsx` | Rutas `/forgot-password` y `/reset-password` |
| `src/pages/Login.tsx` | Link "Olvidé mi contraseña" debajo del formulario |

### Flujo de Recuperación de Contraseña

```
1. Usuario hace click en "Olvidé mi contraseña" → /forgot-password
2. Ingresa email → POST /auth/forgot-password
3. Si el email existe → email con link de reset enviado
4. Usuario hace click en link → /reset-password?token=abc123
5. Ingresa nueva contraseña → POST /auth/reset-password
6. Contraseña actualizada → redirect a /login
```

---

## Workflows n8n (`n8n-workflows/`)

### Archivos JSON (importar en n8n)

| Archivo | Trigger | Descripción |
|---|---|---|
| `inspection-completed.json` | Webhook | Email a cliente + admin al finalizar inspección |
| `inspection-assigned.json` | Webhook | Email al inspector al ser asignado |
| `user-notification.json` | Webhook | Email al cambiar estado de usuario |
| `evaluation-notification.json` | Webhook | Email al evaluado con score |
| `reminder-pending.json` | Cron 8am weekdays | Email a admin con inspecciones pendientes |
| `overdue-inspections.json` | Cron 9am Monday | Email a admin con inspecciones vencidas |
| `database-backup.json` | Cron 3am daily | Backup automático de PostgreSQL |

### Configuración en n8n

1. Importar el JSON en n8n: **Menu → Import from File**
2. Configurar credenciales SMTP en n8n
3. Ajustar el webhook URL según tu dominio
4. Activar el workflow

---

## Tests

### Resultados

| Paquete | Tests | Pasaron | Fallaron |
|---|---|---|---|
| Backend | 143 | 141 | 2* |
| Frontend | 125 | 125 | 0 |
| Mobile | 51 | 51 | 0 |
| **Total** | **319** | **317** | **2** |

*Los 2 failures del backend son pre-existentes (no relacionados con Fase 6):
- `inspection.test.js` — Formato de respuesta `data.id` no encontrado
- `supervisor.test.js` — Deadlock conocido con `Client.sync`

### Tests de Email (7 tests)

```
Email Service
  sendEmail
    ✓ should send email successfully when SMTP is configured
    ✓ should return dry-run when SMTP is not configured
Email Templates
  welcomeEmail
    ✓ should generate welcome email with temp password
  passwordResetEmail
    ✓ should generate reset email with valid URL
  evaluationEmail
    ✓ should generate evaluation email with score
    ✓ should handle missing comment gracefully
    ✓ should handle null score gracefully
```

---

## Siguiente

**Fase 7**: CI/CD con GitHub Actions
