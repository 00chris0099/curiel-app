# FASE 7 — CI/CD con GitHub Actions

## Resumen

Implementacion de pipelines de integracion continua para los 3 paquetes del proyecto (backend, frontend, mobile). Los pipelines verifican tests, lint y build en cada push y PR a `main` y `develop`.

**Estado**: COMPLETA

**Modelo de deploy**: Manual via EasyPanel (el usuario hace click en "Implementar" para cada servicio).

## Pipelines

### 1. Tests (`.github/workflows/test.yml`)

Trigger: push y PR a `main`/`develop`

| Job | Paquete | Servicio | Descripcion |
|-----|---------|----------|-------------|
| `backend-tests` | `backend_legacy/` | PostgreSQL 16 | `npm test` — 143 tests con coverage |
| `frontend-tests` | `frontend/` | Ninguno | `vitest run` — 125 tests |
| `mobile-tests` | `mobile/` | Ninguno | `jest --forceExit` — 51 tests |

### 2. Lint (`.github/workflows/lint.yml`)

Trigger: push y PR a `main`/`develop`

| Job | Paquete | Comando |
|-----|---------|---------|
| `backend-lint` | `backend_legacy/` | `npm run lint` (ESLint 8) |
| `frontend-lint` | `frontend/` | `npm run lint` (ESLint 9 flat config) |

### 3. Build (`.github/workflows/build.yml`)

Trigger: push y PR a `main`/`develop`

| Job | Paquete | Pasos |
|-----|---------|-------|
| `backend-build` | `backend_legacy/` | Verifica que el servidor arranca (timeout 10s) |
| `frontend-build` | `frontend/` | `tsc -b` (TypeScript check) + `vite build` |

## Configuracion

### Node.js

- Version: **20 LTS** (estable para CI)
- Cache: `npm` con `cache-dependency-path` por paquete

### PostgreSQL (solo backend-tests y backend-build)

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: curiel_db
    ports:
      - 5432:5432
```

### Variables de Entorno para CI

Las variables de entorno necesarias para los tests estan definidas directamente en los workflow files:

```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curiel_db
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=ci-test-secret-for-github-actions-minimum-32-bytes
SMTP_USER=
SMTP_PASSWORD=
```

> **Nota**: No se usan GitHub Secrets porque el deploy es manual via EasyPanel, no automatico desde CI.

## Deploy

### Flujo Actual

1. Developer hace push a `develop`
2. GitHub Actions corre tests + lint + build
3. Si todo pasa, merge `develop` → `main`
4. Developer va a EasyPanel y hace click en "Implementar" para backend y frontend

### EasyPanel Services

| Servicio | URL | Branch |
|----------|-----|--------|
| Backend | `aimachristian-curielbackend.ajcxjb.easypanel.host` | `main` |
| Frontend | `aimachristian-curielapp.ajcxjb.easypanel.host` | `main` |

## Branch Protection (Opcional - Futuro)

Para proteger `main` contra merges sin CI passing:

1. Ir a GitHub > Settings > Branches > Add rule
2. Branch name pattern: `main`
3. Habilitar:
   - Require status checks to pass
   - Require branches to be up to date
   - Seleccionar: Backend Tests, Frontend Tests, Mobile Tests, Backend Lint, Frontend Lint, Frontend Build

## Siguiente

**Fase 8**: Observabilidad (Winston, Sentry, metricas)
