# Fase 8: Observabilidad

## Resumen

Implementacion completa de observabilidad para CURIEL: logging estructurado con Winston, error tracking con Sentry, health check detallado, metricas Prometheus, y dashboard Grafana.

## 8.1 Winston (Structured Logging)

**Archivo:** `backend_legacy/src/utils/logger.js`

- Logger con niveles: error, warn, info, http, debug
- **Desarrollo:** formato coloreado legible por humanos
- **Produccion:** formato JSON estructurado para ingestion por ELK/Datadog
- **Produccion:** archivos rotativos en `logs/error.log` y `logs/combined.log`
- Integracion con Morgan via `logger.stream`

## 8.2 Reemplazo de console.log

**Archivos modificados:** 17 archivos en `src/`

- Todos los `console.log/error/warn` en el codigo del servidor reemplazados por `logger.info/error/warn`
- Excepciones: `config/index.js` (circular dependency), `scripts/verify.js` (CLI script)
- Se eliminaron emojis de los logs para mejor parsing

## 8.3-8.5 Sentry (Error Tracking)

**Backend:** `backend_legacy/src/utils/sentry.js`
- Inicializacion condicional (solo si `SENTRY_DSN` esta configurado)
- Filtrado de headers sensibles (Authorization)
- Integracion con Express como middleware
- `captureException()` y `captureMessage()` exportados para uso manual
- Hook en `errorHandler.js` para capturar errores no operacionales

**Frontend:** `frontend/src/main.tsx`
- Sentry.init con browser tracing y replay
- Replay en errores (100%) y sesiones (10% en prod)
- Propagacion de trazas al backend
- Filtrado de headers sensibles

**ErrorBoundary:** `frontend/src/components/ErrorBoundary.tsx`
- `console.error` reemplazado por `Sentry.captureException`

**Axios:** `frontend/src/api/axios.ts`
- Errores 5xx automaticamente enviados a Sentry

## 8.6 Health Check Detallado

**Endpoint:** `GET /api/v1/health`

- Status: `operational` o `degraded` (503 si DB no conecta)
- Uptime formateado: `Xd Xh Xm`
- Database: status + latencia
- Memory: RSS, heap used, heap total, external
- System: platform, arch, CPUs, load average, memoria libre/total
- Version desde `npm_package_version`

## 8.7 Metricas Prometheus

**Archivo:** `backend_legacy/src/utils/metrics.js`

| Metrica | Tipo | Descripcion |
|---------|------|-------------|
| `curiel_http_request_duration_seconds` | Histogram | Duracion de requests HTTP |
| `curiel_http_requests_total` | Counter | Total de requests HTTP |
| `curiel_active_connections` | Gauge | Conexiones activas |
| `curiel_db_query_duration_seconds` | Histogram | Duracion de queries DB |
| `curiel_emails_sent_total` | Counter | Emails enviados (status, type) |
| `curiel_webhooks_triggered_total` | Counter | Webhooks disparados (type, status) |
| Default metrics | Various | CPU, memoria, event loop, GC |

**Endpoint:** `GET /api/v1/metrics` (formato Prometheus text)

**Middleware:** Tracking automatico de duration y count por request (excluye `/metrics`)

## 8.8 Dashboard Grafana

**Directorio:** `monitoring/`

```
monitoring/
├── docker-compose.yml          # Prometheus + Grafana
├── prometheus.yml              # Config de scraping
└── grafana/provisioning/
    ├── datasources/prometheus.yml
    └── dashboards/
        ├── dashboard.yml
        └── curiel-dashboard.json
```

**Para iniciar:**
```bash
cd monitoring
docker-compose up -d
```

**Acceso:**
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin / curiel_monitoring_2024)

**Dashboard incluye:**
- Request rate (req/s) por metodo/ruta
- Latencia p50 y p95
- Error rate (5xx)
- Uso de memoria (RSS, heap)
- Uso de CPU
- Emails enviados (24h)
- Webhooks disparados (24h)
- Uptime

**Nota:** Para EasyPanel, actualizar `prometheus.yml` con la URL real del backend:
```yaml
targets: ['backend-curiel:4000']
```

## Variables de Entorno Nuevas

```bash
# Backend
SENTRY_DSN=https://your-sentry-dsn

# Frontend
VITE_SENTRY_DSN=https://your-sentry-dsn
```

## Dependencias Nuevas

| Paquete | Package | Uso |
|---------|---------|-----|
| `winston` | backend | Structured logging |
| `@sentry/node` | backend | Error tracking |
| `@sentry/react` | frontend | Error tracking |
| `prom-client` | backend | Prometheus metrics |

## Verificacion

```bash
# Lint
npm --prefix backend_legacy run lint    # 0 errores

# Logger test
node -e "const l = require('./backend_legacy/src/utils/logger'); l.info('test');"

# Health check (con servidor corriendo)
curl http://localhost:4000/api/v1/health

# Metrics endpoint
curl http://localhost:4000/api/v1/metrics
```
