# CURIEL - Sistema de Inspecciones Tecnicas

**Aplicacion profesional para gestion de inspecciones tecnicas en obras de construccion, arquitectura e ingenieria.**

## Descripcion

CURIEL es un sistema SaaS completo que digitaliza el proceso de inspecciones tecnicas, eliminando formularios en papel y automatizando la generacion de reportes profesionales con evidencia fotografica, firmas digitales y trazabilidad completa.

## Caracteristicas Principales

### Gestion de Inspecciones
- Crear, editar y finalizar inspecciones
- Asignacion automatica de inspectores
- Estados: Pendiente, En Proceso, Lista Revision, Finalizada, Cancelada, Reprogramada
- Trazabilidad completa (auditoria)

### Sistema de Usuarios
- Autenticacion JWT con refresh tokens
- Roles: Admin, Arquitecto, Supervisor, Inspector
- Permisos granulares por rol
- Multi-empresa (SaaS)
- Sistema de clientes con auto-eliminacion

### Checklists Configurables
- Plantillas por tipo de inspeccion
- Items: Cumple / No cumple / No aplica
- Observaciones por item
- Firmas digitales (inspector + cliente)

### Evidencia Fotografica
- Integracion con camara del dispositivo
- Metadatos: fecha, hora, ubicacion GPS
- Compresion automatica a WebP
- Almacenamiento en Cloudinary

### Reportes Profesionales
- Generacion automatica de PDF con Puppeteer
- Logo de empresa personalizable
- Fotos incrustadas
- Firmas incluidas
- Historial completo

### Dashboard Inteligente
- Metricas en tiempo real
- Graficos de estado
- Vista por rol (admin, supervisor)
- Historial de actividad

### Sistema de Supervisor
- Alertas por inspecciones vencidas
- Evaluaciones de inspectores
- Suspensiones por bajo rendimiento
- Dashboard con KPIs

### Automatizacion (n8n)
- Email automatico al finalizar inspeccion
- Notificaciones a administradores
- Webhooks configurables
- Logs de auditoria

### Modo Offline (Mobile)
- Trabajo sin conexion con SQLite
- Sincronizacion automatica
- Cache inteligente
- Resolucion de conflictos

### PWA (Frontend)
- Service Worker para offline support
- Instalable como app
- Cache de assets estaticos
- Auto-actualizacion

## Arquitectura del Proyecto

```
CURIEL/
├── frontend/                  # Web App (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── api/              # Axios setup, interceptors
│   │   ├── auth/             # PrivateRoute, auth logic
│   │   ├── components/       # Componentes reutilizables
│   │   ├── hooks/            # Custom hooks (offline, prefetch)
│   │   ├── pages/            # Paginas de la app
│   │   ├── services/         # API services
│   │   ├── store/            # Zustand stores
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utilidades
│   └── package.json
│
├── backend_legacy/            # API REST (Node.js + Express + Sequelize)
│   ├── src/
│   │   ├── config/           # Configuracion (DB, JWT, Redis)
│   │   ├── controllers/      # Logica de negocio
│   │   ├── cron/             # Tareas programadas
│   │   ├── middlewares/       # Auth, validacion, errorHandler
│   │   ├── models/           # Modelos de base de datos
│   │   ├── routes/           # Endpoints de API
│   │   ├── services/         # Servicios (PDF, emails, etc.)
│   │   └── utils/            # Utilidades (logger, sentry, cache, cloudinary)
│   └── package.json
│
├── mobile/                    # App movil (React Native + Expo)
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── config/           # Configuracion
│   │   ├── context/          # AuthContext, OfflineContext
│   │   ├── database/         # SQLite repos
│   │   ├── screens/          # Pantallas de la app
│   │   ├── services/         # API client, sync engine
│   │   └── utils/            # Utilidades
│   └── package.json
│
├── n8n-workflows/             # Flujos de automatizacion
├── monitoring/                # Prometheus + Grafana
└── docs/                      # Documentacion
```

## Stack Tecnologico

### Frontend
| Tecnologia | Proposito |
|-----------|-----------|
| React 19 | Framework web |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Estilos |
| Zustand | State management |
| React Router | Navegacion |
| Axios | Cliente HTTP |
| Vitest | Testing |
| Sentry | Error tracking |
| vite-plugin-pwa | PWA support |

### Backend
| Tecnologia | Proposito |
|-----------|-----------|
| Node.js + Express | Framework web |
| PostgreSQL | Base de datos |
| Prisma | ORM |
| JWT | Autenticacion |
| Multer | Upload de archivos |
| Cloudinary | Almacenamiento de imagenes |
| Puppeteer | Generacion de PDFs |
| Nodemailer | Envio de emails |
| Winston | Structured logging |
| Sentry | Error tracking |
| prom-client | Metrics |
| ioredis | Cache Redis |

### Mobile
| Tecnologia | Proposito |
|-----------|-----------|
| React Native | Framework movil |
| Expo | Toolchain |
| React Navigation | Navegacion |
| expo-sqlite | Base de datos local |
| expo-camera | Camara |
| expo-location | GPS |
| react-native-fast-image | Image caching |
| expo-image-manipulator | Image compression |
| Axios | Cliente HTTP |

### Infraestructura
| Tecnologia | Proposito |
|-----------|-----------|
| GitHub Actions | CI/CD |
| Docker | Containerization |
| EasyPanel | Deployment |
| n8n | Workflows |
| Prometheus | Metrics |
| Grafana | Dashboards |

## Instalacion y Configuracion

### Requisitos Previos
- Node.js 18+
- PostgreSQL 14+
- Expo CLI (mobile)
- Redis (opcional, para cache)

### 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con la URL del backend
npm run dev
```

### 2. Backend

```bash
cd backend_legacy
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run migrate
npm run seed
npm run dev
```

### 3. Mobile App

```bash
cd mobile
npm install
cp .env.example .env
# Editar .env con la URL del backend
npm start
```

### 4. Base de Datos

```bash
# Crear base de datos
createdb db_inspecciones

# Ejecutar migraciones
npm run migrate

# Datos de prueba (opcional)
npm run seed
```

## Variables de Entorno

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db_inspecciones
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_inspecciones
DB_USER=postgres
DB_PASSWORD=postgres123
DATABASE_SSL=false

# JWT
JWT_SECRET=tu-secreto-aqui
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-password
FROM_EMAIL=noreply@curiel.com
FROM_NAME=CURIEL Inspecciones

# n8n Webhooks
N8N_WEBHOOK_INSPECTION_COMPLETED=https://tu-n8n.com/webhook/...
N8N_WEBHOOK_USER_NOTIFICATION=https://tu-n8n.com/webhook/...

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Sentry
SENTRY_DSN=https://tu-sentry-dsn

# Pool (opcional)
DB_POOL_MAX=10
DB_POOL_MIN=2
```

### Frontend (.env)

```bash
VITE_API_URL=https://aimachristian-curielbackend.ajcxjb.easypanel.host
VITE_SENTRY_DSN=https://tu-sentry-dsn
```

### Mobile (src/config/index.js)

```javascript
API_URL: 'https://aimachristian-curielbackend.ajcxjb.easypanel.host'
```

## Uso de la Aplicacion

### Login
1. Abrir la app o ir a la URL del frontend
2. Ingresar email y contrasena
3. El sistema asigna permisos segun el rol

### Crear Inspeccion (Admin/Arquitecto/Supervisor)
1. Dashboard -> Nueva Inspeccion
2. Completar datos del proyecto
3. Asignar inspector
4. Seleccionar tipo de inspeccion
5. Guardar

### Realizar Inspeccion (Inspector)
1. Ver inspecciones asignadas
2. Seleccionar inspeccion
3. Completar checklist por areas
4. Tomar fotos (con compresion automatica)
5. Firmar
6. Finalizar -> genera PDF automaticamente

### Generar Reporte
- Al finalizar inspeccion, el PDF se genera automaticamente
- Se envia por email al cliente (via n8n)
- Disponible en historial

## Roles y Permisos

| Funcionalidad | Admin | Arquitecto | Supervisor | Inspector |
|--------------|-------|------------|------------|-----------|
| Crear usuarios | Si | No | No | No |
| Crear inspecciones | Si | Si | Si | No |
| Realizar inspecciones | Si | Si | Si | Si |
| Ver todas las inspecciones | Si | Si | Si | No |
| Ver inspecciones asignadas | Si | Si | Si | Si |
| Dashboard completo | Si | Si | Si | No |
| Dashboard supervisor | Si | No | Si | No |
| Alertas y evaluaciones | Si | No | Si | No |
| Configurar checklists | Si | Si | No | No |
| Descargar reportes | Si | Si | Si | Si |

## API Endpoints

### Autenticacion
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro (solo admin)
- `POST /api/v1/auth/refresh` - Refrescar token
- `POST /api/v1/auth/logout` - Cerrar sesion
- `POST /api/v1/auth/forgot-password` - Olvide contrasena
- `POST /api/v1/auth/reset-password` - Restablecer contrasena

### Usuarios (Admin)
- `GET /api/v1/users` - Listar usuarios
- `POST /api/v1/users` - Crear usuario
- `PUT /api/v1/users/:id` - Actualizar usuario
- `PATCH /api/v1/users/:id/status` - Activar/desactivar
- `DELETE /api/v1/users/:id` - Eliminar usuario

### Inspecciones
- `GET /api/v1/inspections` - Listar inspecciones
- `POST /api/v1/inspections` - Crear inspeccion
- `GET /api/v1/inspections/:id` - Ver inspeccion
- `PUT /api/v1/inspections/:id` - Actualizar inspeccion
- `DELETE /api/v1/inspections/:id` - Eliminar inspeccion
- `POST /api/v1/inspections/:id/complete` - Finalizar inspeccion
- `POST /api/v1/inspections/:id/cancel` - Cancelar inspeccion
- `POST /api/v1/inspections/:id/reschedule` - Reprogramar inspeccion

### Ejecucion de Inspeccion
- `GET /api/v1/inspections/:id/execution` - Obtener datos de ejecucion
- `POST /api/v1/inspections/:id/execution/areas` - Crear area
- `PUT /api/v1/inspections/:id/execution/areas/:areaId` - Actualizar area
- `POST /api/v1/inspections/:id/execution/observations` - Crear observacion
- `POST /api/v1/inspections/:id/execution/photos` - Subir foto

### Checklists
- `GET /api/v1/checklists` - Listar checklists
- `POST /api/v1/checklists` - Crear checklist
- `PUT /api/v1/checklists/:id` - Actualizar checklist

### Fotos
- `POST /api/v1/photos/upload` - Subir foto
- `GET /api/v1/photos/:id` - Obtener foto
- `DELETE /api/v1/photos/:id` - Eliminar foto

### Clientes (Admin)
- `GET /api/v1/clients` - Listar clientes
- `POST /api/v1/clients` - Crear cliente
- `PUT /api/v1/clients/:id` - Actualizar cliente
- `DELETE /api/v1/clients/:id` - Eliminar cliente

### Supervisor
- `GET /api/v1/alerts` - Listar alertas
- `GET /api/v1/evaluations` - Listar evaluaciones
- `GET /api/v1/suspensions` - Listar suspensiones
- `GET /api/v1/supervisor/dashboard` - Dashboard de supervisor

### Salud y Monitoreo
- `GET /api/v1/health` - Health check detallado
- `GET /api/v1/metrics` - Metricas Prometheus

Ver documentacion completa en `docs/API.md` (proximamente)

## CI/CD

### GitHub Actions
- **test.yml**: Tests para los 3 paquetes
- **lint.yml**: ESLint para frontend y backend
- **build.yml**: Build verification

### Deployment (EasyPanel)
```bash
# 1. Push a GitHub
git push origin main

# 2. En EasyPanel, ir a cada servicio y clickear "Implementar"
# - backend: https://aimachristian-curielbackend.ajcxjb.easypanel.host
# - frontend: https://aimachristian-curielapp.ajcxjb.easypanel.host
```

## Testing

```bash
# Backend tests (143 tests)
cd backend_legacy
npm test

# Frontend tests (125 tests)
cd frontend
npm test

# Mobile tests (54 tests)
cd mobile
npm test
```

## Roadmap

### Fase 0-10: COMPLETADAS
- [x] Preparacion y seguridad base
- [x] Testing (322+ tests)
- [x] Entidad Cliente
- [x] Rol Supervisor
- [x] Offline/Online
- [x] Notificaciones y Email
- [x] CI/CD con GitHub Actions
- [x] Observabilidad (Winston, Sentry, Prometheus, Grafana)
- [x] Mobile MVP
- [x] Performance y Pulido (PWA, code splitting, Redis cache)

### Fase 11: Documentacion y Lanzamiento (EN PROGRESO)
- [x] LICENSE.txt
- [x] CHANGELOG.md
- [x] README.md actualizado
- [ ] Guia de usuario
- [ ] Guia de admin
- [ ] Git tags v1.0.0
- [ ] Deploy a produccion
- [ ] Smoke tests

### Futuro
- [ ] Multi-empresa (tenants)
- [ ] Plantillas de checklist avanzadas
- [ ] Reportes con graficos
- [ ] Notificaciones push
- [ ] Exportacion a Excel
- [ ] IA para deteccion de anomalias en fotos

## Licencia

Propietario - Todos los derechos reservados (c) 2026

## Soporte

Para soporte tecnico o consultas comerciales:
- Email: soporte@curiel.com

---

**CURIEL** - Digitaliza tus inspecciones tecnicas
