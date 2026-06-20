# Guia de Administracion - CURIEL

## Panel de Administracion

Esta guia esta disenada para administradores del sistema CURIEL. Aprenderas a gestionar usuarios, configurar el sistema y monitorear el rendimiento.

---

## 1. Gestion de Usuarios

### 1.1 Crear Usuario

1. Ve a "Usuarios" en el menu lateral
2. Haz clic en "Nuevo Usuario"
3. Completa los campos:
   - **Email:** Correo electronico unico
   - **Contrasena:** Minimo 8 caracteres
   - **Nombre:** Nombre completo
   - **Rol:** Admin, Arquitecto, Supervisor o Inspector
4. Haz clic en "Guardar"

### 1.2 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **Admin** | Acceso total. Gestiona usuarios, configura el sistema |
| **Arquitecto** | Crea inspecciones, realiza inspecciones, ve reportes |
| **Supervisor** | Supervisa inspectores, aprueba reportes, gestiona alertas |
| **Inspector** | Realiza inspecciones asignadas, sube fotos |

### 1.3 Editar Usuario

1. Selecciona el usuario de la lista
2. Haz clic en "Editar"
3. Modifica los campos necesarios
4. Guarda los cambios

### 1.4 Activar/Desactivar Usuario

1. Selecciona el usuario
2. Haz clic en el interruptor de estado
3. Confirma la accion

**Nota:** Un usuario desactivado no puede iniciar sesion pero sus datos se conservan.

### 1.5 Eliminar Usuario

1. Selecciona el usuario
2. Haz clic en "Eliminar"
3. Confirma la accion

**Advertencia:** Esta accion es irreversible.

### 1.6 Master Admin

El master admin tiene permisos especiales:
- Acceso a todos los endpoints
- Puede transferir el rol a otro usuario
- Solo puede haber un master admin

**Para transferir el master admin:**
```bash
POST /api/v1/users/:id/transfer-master
```

---

## 2. Gestion de Inspecciones

### 2.1 Estados de Inspeccion

| Estado | Descripcion | Siguiente Estado |
|--------|-------------|------------------|
| Pendiente | Creada, esperando programacion | En Proceso, Cancelada, Reprogramada |
| En Proceso | Inspector trabajando | Lista Revision, Cancelada, Reprogramada |
| Lista Revision | Esperando aprobacion | Finalizada, En Proceso |
| Finalizada | Completada y aprobada | Ninguno |
| Cancelada | Cancelada | Ninguno |
| Reprogramada | Nueva fecha asignada | En Proceso |

### 2.2 Crear Inspeccion

1. Ve a "Inspecciones" -> "Nueva Inspeccion"
2. Completa los datos:
   - Nombre del proyecto
   - Cliente (seleccionar de la lista)
   - Direccion completa
   - Fecha programada
   - Inspector asignado
   - Tipo de inspeccion
3. Guarda la inspeccion

### 2.3 Asignar Inspector

El inspector es el profesional que realizara la visita. Puedes:
- Asignar al crear la inspeccion
- Cambiar durante la ejecucion
- Ver la carga de trabajo de cada inspector

### 2.4 Monitorear Progreso

En la vista de detalles de una inspeccion:
- **Areas:** Numero de areas completadas
- **Observaciones:** Hallazgos encontrados
- **Fotos:** Evidencia fotografica
- **Firmas:** Inspector y cliente

---

## 3. Gestion de Clientes

### 3.1 Crear Cliente

1. Ve a "Clientes" en el menu lateral
2. Haz clic en "Nuevo Cliente"
3. Completa los campos:
   - **Nombre:** Nombre o razon social
   - **Email:** Correo electronico
   - **Telefono:** Numero de contacto
   - **Direccion:** Direccion completa
   - **RUC/DNI:** Numero de identificacion
4. Guarda el cliente

### 3.2 Editar Cliente

1. Selecciona el cliente
2. Haz clic en "Editar"
3. Modifica los campos
4. Guarda los cambios

### 3.3 Eliminar Cliente

1. Selecciona el cliente
2. Haz clic en "Eliminar"
3. Confirma la accion

**Nota:** Los clientes con inspecciones asociadas no se eliminan automaticamente.

### 3.4 Auto-eliminacion

El sistema ejecuta un cron job diario que elimina clientes:
- Sin inspecciones asociadas
- Creados hace mas de 30 dias
- Que no han sido contactados

---

## 4. Sistema de Supervisor

### 4.1 Dashboard de Supervisor

El dashboard muestra:
- **Inspecciones Pendientes:** Las que necesitan atencion
- **Alertas:** Inspecciones vencidas o con problemas
- **Evaluaciones:** Rendimiento de inspectores
- **Suspensiones:** Inspectores suspendidos

### 4.2 Alertas

Las alertas se crean automaticamente cuando:
- Una inspeccion esta vencida
- Un inspector no ha completado sus tareas
- Hay problemas de calidad

**Tipos de Alertas:**
- `inspeccion_vencida`: La fecha paso sin completar
- `bajo_rendimiento`: Inspector con baja productividad
- `calidad_insuficiente`: Reporte rechazado multiple veces

### 4.3 Evaluaciones

Las evaluaciones se crean semanalmente para cada inspector:
- **Productividad:** Numero de inspecciones completadas
- **Calidad:** Aprobacion de reportes
- **Puntualidad:** Cumplimiento de fechas

### 4.4 Suspensiones

Un inspector puede ser suspendido si:
- Tiene 3+ alertas activas
- Su evaluacion es "muy_bajo"
- Tiene reportes rechazados multiple veces

**Estados de Suspension:**
- `activa`: Inspector no puede recibir inspecciones
- `levantada`: Suspension removida

---

## 5. Configuracion del Sistema

### 5.1 Variables de Entorno

Las principales variables de entorno del backend:

```bash
# Base de datos
DATABASE_URL=postgresql://...
DB_POOL_MAX=10
DB_POOL_MIN=2

# JWT
JWT_SECRET=tu-secreto
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Sentry
SENTRY_DSN=...
```

### 5.2 Configurar Email

1. Configura las variables SMTP
2. Prueba el envio con un usuario de prueba
3. Verifica que los emails lleguen correctamente

### 5.3 Configurar Cloudinary

1. Crea una cuenta en Cloudinary
2. Obtén las credenciales
3. Configura las variables de entorno
4. Las fotos se subiran automaticamente

### 5.4 Configurar n8n

1. Instala n8n (Docker o nube)
2. Importa los workflows de `n8n-workflows/`
3. Configura los webhooks
4. Prueba las automatizaciones

---

## 6. Monitoreo y Observabilidad

### 6.1 Health Check

```bash
GET /api/v1/health
```

Respuesta:
```json
{
  "success": true,
  "status": "operational",
  "database": { "status": "connected", "latency": "5ms" },
  "cache": { "connected": true },
  "memory": { "rss": "128MB", "heapUsed": "64MB" }
}
```

### 6.2 Metricas Prometheus

```bash
GET /api/v1/metrics
```

Metricas disponibles:
- `http_request_duration_seconds`: Latencia de requests
- `http_requests_total`: Total de requests
- `db_connections_active`: Conexiones activas a la BD

### 6.3 Logs con Winston

Los logs se guardan en:
- **Consola:** En desarrollo
- **Archivos:** En produccion (`logs/`)

**Niveles de log:**
- `error`: Errores criticos
- `warn**: Advertencias
- `info`: Informacion general
- `debug`: Detalles de depuracion

### 6.4 Sentry

Sentry captura automaticamente:
- Errores no manejados
- Excepciones en el backend
- Errores del frontend
- Performance issues

### 6.5 Grafana

Dashboard disponible en `monitoring/`:
- Graficos de latencia
- Uso de memoria
- Conexiones a la BD
- Requests por minuto

---

## 7. Seguridad

### 7.1 Autenticacion

- JWT con refresh tokens
- Tokens expiran en 7 dias
- Refresh tokens expiran en 30 dias
- Rotacion automatica de tokens

### 7.2 Autorizacion

- RBAC (Role-Based Access Control)
- Permisos por rol
- Master admin bypass

### 7.3 Headers de Seguridad

El backend incluye:
- Helmet.js para headers HTTP seguros
- CSP (Content Security Policy)
- Rate limiting
- CORS configurado

### 7.4 Rate Limiting

```javascript
// Configuracion por defecto
{
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 100           // 100 requests por ventana
}
```

### 7.5 Auditoria

Todas las acciones importantes quedan registradas:
- Login/logout
- Crear/editar/eliminar
- Cambios de estado
- Subida de archivos

---

## 8. Mantenimiento

### 8.1 Backup de Base de Datos

```bash
# Backup completo
pg_dump -U postgres db_inspecciones > backup.sql

# Backup con timestamp
pg_dump -U postgres db_inspecciones > backup_$(date +%Y%m%d).sql
```

### 8.2 Restaurar Backup

```bash
# Restaurar
psql -U postgres db_inspecciones < backup.sql
```

### 8.3 Actualizar Sistema

```bash
# 1. Pull ultimos cambios
git pull origin main

# 2. Instalar dependencias
npm install

# 3. Ejecutar migraciones
npm run migrate

# 4. Reiniciar servidor
pm2 restart curiel-backend
```

### 8.4 Limpiar Datos Antiguos

El sistema ejecuta automaticamente:
- Eliminacion de clientes inactivos (30 dias)
- Limpieza de tokens expirados
- Archivos temporales

---

## 9. Solucion de Problemas

### 9.1 Errores Comunes

| Error | Causa | Solucion |
|-------|-------|----------|
| TOKEN_EXPIRED | Token JWT expiro | Refrescar token |
| UNAUTHORIZED | No tiene permisos | Verificar rol |
| VALIDATION_ERROR | Datos invalidos | Revisar payload |
| DATABASE_ERROR | Error de conexion | Verificar DATABASE_URL |
| CLOUDINARY_ERROR | Error al subir foto | Verificar credenciales |

### 9.2 Logs de Error

```bash
# Ver ultimos errores
tail -f logs/error.log

# Buscar errores especificos
grep "DATABASE_ERROR" logs/error.log
```

### 9.3 Reiniciar Servicios

```bash
# Backend
pm2 restart curiel-backend

# Frontend (si usa PM2)
pm2 restart curiel-frontend

# Base de datos
sudo systemctl restart postgresql
```

---

## 10. Comandos Utiles

### 10.1 Desarrollo

```bash
# Iniciar backend en desarrollo
npm run dev

# Iniciar frontend
npm run dev

# Ejecutar tests
npm test

# Linting
npm run lint
```

### 10.2 Base de Datos

```bash
# Migraciones
npm run migrate

# Seed (datos de prueba)
npm run seed

# Verificar conexion
npm run verify
```

### 10.3 Produccion

```bash
# Build frontend
npm run build

# Iniciar en produccion
npm start

# Verificar health
curl https://aimachristian-curielbackend.ajcxjb.easypanel.host/api/v1/health
```

---

## 11. Contacto y Soporte

### Soporte Tecnico
- Email: soporte@curiel.com
- Horario: Lunes a Viernes, 9am - 6pm

### Emergencias
- Email: emergencias@curiel.com
- WhatsApp: +XX XXX XXX XXXX

### Documentacion
- API: `docs/API.md`
- Deployment: `docs/DEPLOYMENT.md`
- Changelog: `CHANGELOG.md`

---

**Ultima actualizacion:** 2026
