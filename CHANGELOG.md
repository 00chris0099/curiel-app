# Changelog - CURIEL

Todas las versiones notables del sistema CURIEL estan documentadas en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [1.0.0] - 2026-06-22

### Fase 10 - Performance y Pulido

#### Added
- React.lazy code splitting para 16 rutas de pagina
- PWA con service worker (vite-plugin-pwa)
- Offline support via service worker con Workbox
- DNS prefetch para backend API
- Hook de prefetch de datos criticos
- React.memo para PhotoCard y EmptyPanel
- FlatList optimization en 3 pantallas mobile
- Componente CachedImage con react-native-fast-image
- Utilidad de compresion de imagenes (expo-image-manipulator)
- Redis cache utility con ioredis (graceful degradation)
- 22 indices de base de datos para mejorar performance
- Connection pooling configurable via variables de entorno
- WebP format enforcement en uploads de Cloudinary
- Presets de transformacion de imagenes (thumbnail, small, medium, large)

---

### Fase 9 - Mobile MVP

#### Added
- Pantalla AreaDetail para gestion de areas
- Pantalla ObservationForm para crear observaciones
- Pantalla Profile para ver/editar perfil
- Pantalla Settings con configuracion
- ErrorBoundary para manejo de errores globales
- Boton de logout en navegacion
- eas.json para builds de Expo
- babel.config.js actualizado para Expo

---

### Fase 8 - Observabilidad

#### Added
- Winston para structured logging
- Sentry para error tracking (backend y frontend)
- Health check endpoint detallado (/api/v1/health)
- Prometheus metrics con prom-client
- Dashboard de Grafana para monitoreo
- Grafana + Prometheus via Docker Compose

---

### Fase 7 - CI/CD

#### Added
- GitHub Actions: pipeline de tests (backend, frontend, mobile)
- GitHub Actions: pipeline de lint
- GitHub Actions: pipeline de build
- CI para los 3 paquetes del proyecto

---

### Fase 6 - Notificaciones y Email

#### Added
- Servicio de envio de emails (nodemailer)
- Templates HTML para emails (bienvenida, evaluacion, inspeccion)
- Flujo de forgotPassword y resetPassword
- Paginas ForgotPassword y ResetPassword en frontend
- 7 workflows de n8n (inspeccion completada, asignacion, etc.)
- PasswordResetToken model con expiracion

---

### Fase 5 - Offline/Online

#### Added
- Sistema offline-first en mobile (SQLite)
- Cola de operaciones offline
- Sincronizacion automatica
- Deteccion y resolucion de conflictos
- IndexedDB en frontend para offline
- Hook useOfflineSync
- Hook useOnlineStatus
- 51 tests de mobile offline
- 125 tests de frontend offline

---

### Fase 4 - Rol Supervisor

#### Added
- Dashboard de supervisor con KPIs
- Sistema de alertas (alertService, alertRoutes)
- Sistema de evaluaciones (evaluationService)
- Sistema de suspensiones (suspensionService)
- Webhooks de n8n para notificaciones
- RBAC (Role-Based Access Control)
- 40 tests de supervisor

---

### Fase 3 - Entidad Cliente

#### Added
- Modelo Client con asociaciones
- Servicio CRUD de clientes
- Controlador de clientes
- Rutas de clientes con validacion
- Pagina Clients en frontend
- Pagina ClientDetail en frontend
- Auto-eliminacion de clientes via cron

---

### Fase 2 - Testing

#### Added
- Suite de tests backend (Jest + Supertest)
- Suite de tests frontend (Vitest + React Testing Library)
- Suite de tests mobile (Jest)
- Tests de autenticacion
- Tests de autorizacion
- Tests de validacion
- Tests de offline/online

---

### Fase 1 - Seguridad Base

#### Added
- Refresh tokens con rotacion
- CSP headers (Helmet)
- Rate limiting (express-rate-limit)
- Headers de seguridad HTTP
- Validacion de input con Joi

---

### Fase 0 - Preparacion

#### Added
- Estructura del proyecto (frontend, backend_legacy, mobile)
- Configuracion de JWT
- Configuracion de CORS
- Configuracion de base de datos
- Variables de entorno

---

## [0.1.0] - 2024-01-01

### Added
- Commit inicial del proyecto
- README basico
- Estructura de carpetas
