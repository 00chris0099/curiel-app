# FASE 2: TESTING - Plan de Implementacion

> **Fecha inicio:** 17 de Junio, 2026
> **Duracion estimada:** 2 semanas
> **Dependencias:** Fase 1 completada

---

## Tabla de Contenidos

1. [Resumen](#1-resumen)
2. [Tarea 2.1: Configurar Jest + Supertest (backend)](#2-tarea-21-configurar-jest--supertest-backend)
3. [Tarea 2.2: Tests de auth](#3-tarea-22-tests-de-auth)
4. [Tarea 2.3: Tests de inspecciones](#4-tarea-23-tests-de-inspecciones)
5. [Tarea 2.4: Tests de ejecucion](#5-tarea-24-tests-de-ejecucion)
6. [Tarea 2.5: Tests de permisos (RBAC)](#6-tarea-25-tests-de-permisos-rbac)
7. [Tarea 2.6: Configurar Vitest (frontend)](#7-tarea-26-configurar-vitest-frontend)
8. [Tarea 2.7: Tests de utils (frontend)](#8-tarea-27-tests-de-utils-frontend)
9. [Tarea 2.8: Tests de componentes (frontend)](#9-tarea-28-tests-de-componentes-frontend)
10. [Tarea 2.9: Configurar Jest (mobile)](#10-tarea-29-configurar-jest-mobile)
11. [Tarea 2.10: Tests de mobile](#11-tarea-210-tests-de-mobile)

---

## 1. Resumen

La Fase 2 establece la infraestructura de testing y crea suites de tests para los modulos criticos del sistema.

| Tarea | Descripcion | Paquete | Archivos afectados |
|-------|-------------|---------|-------------------|
| 2.1 | Configurar Jest + Supertest | backend | jest.config.js, package.json |
| 2.2 | Tests de auth (login, register, refresh, logout) | backend | auth.test.js |
| 2.3 | Tests de inspecciones (CRUD, estados) | backend | inspection.test.js |
| 2.4 | Tests de ejecucion (areas, obs, fotos) | backend | execution.test.js |
| 2.5 | Tests de permisos (role-based access) | backend | permissions.test.js |
| 2.6 | Configurar Vitest | frontend | vitest.config.ts, package.json |
| 2.7 | Tests de utils | frontend | *.test.ts |
| 2.8 | Tests de componentes | frontend | *.test.tsx |
| 2.9 | Configurar Jest (mobile) | mobile | jest.config.js, package.json |
| 2.10 | Tests de mobile | mobile | *.test.js |

### Archivos de test sugeridos

```
backend_legacy/
  src/
    __tests__/
      auth.test.js
      inspection.test.js
      execution.test.js
      permissions.test.js
      user.test.js
      checklist.test.js
    middlewares/
      __tests__/
        auth.test.js
        validateJoi.test.js

frontend/
  src/
    __tests__/
      utils/
        inspectionStatus.test.ts
        permissions.test.ts
      components/
        Login.test.tsx
        CreateInspection.test.tsx
        Users.test.tsx
      hooks/
        useOfflineSync.test.ts

mobile/
  src/
    __tests__/
      context/
        AuthContext.test.js
      services/
        api.test.js
```

---

## 2. Tarea 2.1: Configurar Jest + Supertest (backend)

### Archivos a crear

**`backend_legacy/jest.config.js`** (NUEVO)
```javascript
module.exports = {
    testEnvironment: 'node',
    setupFilesAfterSetup: ['./src/__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetModules: true,
};
```

**`backend_legacy/src/__tests__/setup.js`** (NUEVO)
```javascript
const { sequelize } = require('../config/database');

// Setup: conectar a BD de test antes de todos los tests
beforeAll(async () => {
    await sequelize.authenticate();
    // Sincronizar modelos (crear tablas temporales)
    await sequelize.sync({ force: true });
});

// Cleanup: cerrar conexion despues de todos los tests
afterAll(async () => {
    await sequelize.close();
});
```

### Archivos a modificar

**`backend_legacy/package.json`**
```json
{
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --runInBand --watch",
    "test:coverage": "jest --runInBand --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

### Configuracion de BD de test

Usar la misma BD pero con `sequelize.sync({ force: true })` para crear tablas temporales. Opcionalmente configurar `DB_NAME=test_db_inspecciones` en `.env.test`.

---

## 3. Tarea 2.2: Tests de auth

### Suite: `auth.test.js`

| Test | Metodo | Endpoint | Esperado |
|------|--------|----------|----------|
| Login con credenciales validas | POST | /auth/login | 200 + token + refreshToken |
| Login con email inexistente | POST | /auth/login | 401 |
| Login con password incorrecta | POST | /auth/login | 401 |
| Login con email invalido | POST | /auth/login | 400 (Joi) |
| Login con body vacio | POST | /auth/login | 400 |
| Register nuevo usuario | POST | /auth/register | 201 + user + token |
| Register email duplicado | POST | /auth/register | 409 |
| Register sin campos requeridos | POST | /auth/register | 400 |
| Refresh token valido | POST | /auth/refresh | 200 + nuevo token |
| Refresh token expirado | POST | /auth/refresh | 401 REFRESH_EXPIRED |
| Refresh token revocado | POST | /auth/refresh | 401 REFRESH_EXPIRED |
| Refresh token inexistente | POST | /auth/refresh | 401 |
| Logout con refresh token | POST | /auth/logout | 200 |
| Obtener perfil autenticado | GET | /auth/me | 200 + user |
| Obtener perfil sin token | GET | /auth/me | 401 |
| Actualizar perfil | PUT | /auth/me | 200 + user actualizado |
| Cambiar contrasena | PUT | /auth/change-password | 200 |
| Cambiar contrasena con actual incorrecta | PUT | /auth/change-password | 401 |

---

## 4. Tarea 2.3: Tests de inspecciones

### Suite: `inspection.test.js`

| Test | Metodo | Endpoint | Esperado |
|------|--------|----------|----------|
| Crear inspeccion (admin) | POST | /inspections | 201 |
| Crear inspeccion sin campos requeridos | POST | /inspections | 422 (Joi) |
| Listar inspecciones (admin) | GET | /inspections | 200 + array |
| Obtener inspeccion por ID | GET | /inspections/:id | 200 |
| Obtener inspeccion inexistente | GET | /inspections/:id | 404 |
| Actualizar inspeccion | PUT | /inspections/:id | 200 |
| Cambiar estado | PATCH | /inspections/:id/status | 200 |
| Cambiar estado invalido | PATCH | /inspections/:id/status | 422 (Joi) |
| Eliminar inspeccion (admin) | DELETE | /inspections/:id | 200 |
| Eliminar inspeccion (inspector) | DELETE | /inspections/:id | 403 |
| Obtener estadisticas | GET | /inspections/stats | 200 |
| Crear inspeccion como inspector | POST | /inspections | 403 |

---

## 5. Tarea 2.4: Tests de ejecucion

### Suite: `execution.test.js`

| Test | Metodo | Endpoint | Esperado |
|------|--------|----------|----------|
| Crear area | POST | /inspections/:id/execution/areas | 201 |
| Listar areas | GET | /inspections/:id/execution/areas | 200 |
| Actualizar area | PUT | /inspections/:id/execution/areas/:areaId | 200 |
| Eliminar area | DELETE | /inspections/:id/execution/areas/:areaId | 200 |
| Crear observacion | POST | /inspections/:id/execution/observations | 201 |
| Listar observaciones | GET | /inspections/:id/execution/observations | 200 |
| Actualizar observacion | PUT | /inspections/:id/execution/observations/:obsId | 200 |
| Eliminar observacion | DELETE | /inspections/:id/execution/observations/:obsId | 200 |
| Subir foto | POST | /inspections/:id/execution/photos | 201 |
| Listar fotos | GET | /inspections/:id/execution/photos | 200 |
| Eliminar foto | DELETE | /inspections/:id/execution/photos/:photoId | 200 |
| Actualizar summary | PUT | /inspections/:id/execution/summary | 200 |
| Obtener stats | GET | /inspections/:id/execution/stats | 200 |
| Ejecutar en inspeccion finalizada | POST | /inspections/:id/execution/areas | 403 |

---

## 6. Tarea 2.5: Tests de permisos (RBAC)

### Suite: `permissions.test.js`

| Test | Rol | Accion | Esperado |
|------|-----|--------|----------|
| Inspector ve solo sus inspecciones | inspector | GET /inspections | Solo propias |
| Inspector no puede crear inspeccion | inspector | POST /inspections | 403 |
| Inspector no puede eliminar | inspector | DELETE /inspections/:id | 403 |
| Supervisor no puede finalizar | supervisor | PATCH status→finalizada | 403 |
| Arquitecto puede crear | arquitecto | POST /inspections | 201 |
| Admin puede todo | admin | Cualquier accion | 200/201 |
| masterAdmin bypass total | masterAdmin | Cualquier accion | 200/201 |
| Sin token no accede | - | GET /inspections | 401 |
| Token expirado | - | GET /inspections | 401 TOKEN_EXPIRED |

---

## 7. Tarea 2.6: Configurar Vitest (frontend)

### Archivos a crear

**`frontend/vitest.config.ts`** (NUEVO)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/__tests__/setup.ts',
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            exclude: ['node_modules/', 'src/__tests__/'],
        },
    },
});
```

**`frontend/src/__tests__/setup.ts`** (NUEVO)
```typescript
import '@testing-library/jest-dom';
```

### Archivos a modificar

**`frontend/package.json`**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^24.0.0"
  }
}
```

---

## 8. Tarea 2.7: Tests de utils (frontend)

### Suite: `inspectionStatus.test.ts`

| Test | Funcion | Input | Esperado |
|------|---------|-------|----------|
| Transicion valida | canTransition | pendiente→en_proceso | true |
| Transicion invalida | canTransition | pendiente→finalizada | false |
| Estado terminal | isTerminalState | finalizada | true |
| Estado bloqueado | isStatusLocked | lista_revision | true |
| Formatear estado | formatStatus | en_proceso | "En Proceso" |
| Color de estado | getStatusColor | pendiente | "yellow" |

### Suite: `permissions.test.ts`

| Test | Funcion | Input | Esperado |
|------|---------|-------|----------|
| Admin puede todo | canPerform | admin, create_inspection | true |
| Inspector no puede crear | canPerform | inspector, create_inspection | false |
| Supervisor no puede finalizar | canPerform | supervisor, finalize | false |
| masterAdmin bypass | canPerform | masterAdmin, anything | true |

---

## 9. Tarea 2.8: Tests de componentes (frontend)

### Suite: `Login.test.tsx`

| Test | Descripcion | Esperado |
|------|-------------|----------|
| Renderiza formulario | Login page se renderiza | email + password fields |
| Login exitoso | Credenciales correctas | Redirect a /dashboard |
| Login fallido | Credenciales incorrectas | Error message |
| Validacion de email | Email vacio | Validation error |
| Loading state | Durante login | Spinner visible |

### Suite: `CreateInspection.test.tsx`

| Test | Descripcion | Esperado |
|------|-------------|----------|
| Renderiza formulario | CreateInspection se renderiza | Todos los campos |
| Crear exitoso | Datos validos | Redirect a inspeccion |
| Validacion | Campos requeridos vacios | Validation errors |
| Cancelar | Click en cancelar | Redirect a /inspections |

---

## 10. Tarea 2.9: Configurar Jest (mobile)

### Archivos a crear

**`mobile/jest.config.js`** (NUEVO)
```javascript
module.exports = {
    preset: 'jest-expo',
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'
    ],
    setupFilesAfterSetup: ['./src/__tests__/setup.js'],
    moduleFileExtensions: ['js', 'jsx', 'json'],
    testMatch: ['**/__tests__/**/*.test.js'],
};
```

**`mobile/src/__tests__/setup.js`** (NUEVO)
```javascript
// Mock de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

### Archivos a modificar

**`mobile/package.json`**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-expo": "~50.0.0",
    "@testing-library/react-native": "^12.4.0"
  }
}
```

---

## 11. Tarea 2.10: Tests de mobile

### Suite: `AuthContext.test.js`

| Test | Descripcion | Esperado |
|------|-------------|----------|
| Login guarda tokens | login() exitoso | AsyncStorage tiene token + refreshToken |
| Logout limpia tokens | logout() | AsyncStorage limpio |
| Load user from storage | loadStoredUser() con datos | user state actualizado |
| Login fallido | Credenciales incorrectas | error retornado |

### Suite: `api.test.js`

| Test | Descripcion | Esperado |
|------|-------------|----------|
| Auto-refresh en 401 TOKEN_EXPIRED | Token expirado | Refresh automatico + retry |
| Refresh fallido | Refresh token expirado | Limpieza de tokens |
| Token se agrega al header | Request con token | Authorization header presente |

---

## Orden de Implementacion

```
2.1 (Configurar Jest backend)
  ↓
2.2-2.5 (Tests backend) ← pueden ejecutarse en paralelo
  ↓
2.6 (Configurar Vitest frontend)
  ↓
2.7-2.8 (Tests frontend) ← pueden ejecutarse en paralelo
  ↓
2.9 (Configurar Jest mobile)
  ↓
2.10 (Tests mobile)
```

**Tareas paralelas posibles:**
- 2.2-2.5 entre si
- 2.7-2.8 entre si
- Backend y frontend pueden avanzar en paralelo

---

## Verificacion

### Comandos de ejecucion

```bash
# Backend
cd backend_legacy && npm test

# Frontend
cd frontend && npm test

# Mobile
cd mobile && npm test
```

### Checks de calidad

- [x] Todos los tests pasan (184/184)
- [x] Coverage backend > 60% (60.5%)
- [x] Coverage frontend > 50% (58.7%)
- [x] No tests pendientes (skip)
- [x] Tests de permisos cubren todos los roles (admin, inspector, arquitecto, supervisor)
- [x] Tests de auth cubren todos los endpoints (login, register, refresh, me, change-password, logout)

---

## Estado: COMPLETADA

### Resultados Finales

| Paquete | Archivos de test | Tests | Coverage | Estado |
|---------|-----------------|-------|----------|--------|
| Backend (`backend_legacy/`) | 4 archivos | 76 tests | 60.5% stmts | ✅ Todos pasan |
| Frontend (`frontend/`) | 8 archivos | 120 tests | 58.7% stmts | ✅ Todos pasan |
| Mobile (`mobile/`) | 2 archivos | 11 tests | N/A | ✅ Todos pasan |
| **Total** | **14 archivos** | **207 tests** | — | **✅ Todos pasan** |

### Archivos creados/modificados

**Backend:**
- `jest.config.js` — Configuracion de Jest
- `src/__tests__/setup.js` — Setup de test (bcrypt, DB sync, token helpers)
- `src/__tests__/auth.test.js` — 17 tests de autenticacion
- `src/__tests__/inspection.test.js` — 14 tests de inspecciones
- `src/__tests__/permissions.test.js` — 14 tests de RBAC
- `src/__tests__/execution.test.js` — 31 tests de ejecucion (areas, observaciones, fotos, summary, complete)
- `src/app.js` — App Express separada de server.js (para tests)
- `src/server.js` — Modificado para importar app.js

**Frontend:**
- `vitest.config.ts` — Configuracion de Vitest
- `src/__tests__/setup.ts` — Setup con jest-dom
- `src/__tests__/inspectionPermissions.test.ts` — Tests de permisos
- `src/__tests__/inspectionStatus.test.ts` — Tests de estados
- `src/__tests__/inspectionMetadata.test.ts` — Tests de metadata
- `src/__tests__/axios.test.ts` — Tests de API error utils
- `src/__tests__/Login.test.tsx` — 7 tests de componente Login
- `src/__tests__/CreateInspection.test.tsx` — 6 tests de componente CreateInspection
- `src/__tests__/Users.test.tsx` — 5 tests de componente Users
- `src/__tests__/auth.service.test.ts` — 16 tests de servicio de autenticacion

**Mobile:**
- `jest.config.js` — Configuracion de Jest con Babel
- `babel.config.js` — Preset para transformar ESM en tests
- `src/__tests__/config.test.js` — Tests de configuracion
- `src/__tests__/api.test.js` — Tests de API/AsyncStorage

### Puntos de mejora identificados

1. **Coverage backend 60.5%**: Sobre el minimo de 60%. `checklistService` (5.33%), `inspectionReportService` (9.4%), `userService` (31.2%), `checklistController` (34.28%), `photoController` (17.14%), `cloudinary.js` (24.59%) siguen bajos. Agregar tests unitarios de servicios en Fase 3.
2. **Coverage frontend 58.7%**: Sobre el minimo de 50%. `axios.ts` (25.67%) y `Users.tsx` (29.78%) siguen bajos. `authService.ts` subio de 4.25% a ~80% con tests dedicados.
3. **Tests de mobile limitados**: Solo config y storage keys. AuthContext y API interceptor tests quedan para Fase 3.
4. **`@vitest/coverage-v8` era dependencia faltante**: Instalado durante esta sesion — necesario para medir coverage frontend.

### Lecciones aprendidas

- `bcrypt.hash()` directo funciona mejor que `User.create({ password })` en tests
- `sequelize.sync({ alter: true })` es necesario para crear columnas faltantes (ej: `photos.area_id`)
- `@babel/preset-env` es necesario en mobile para transformar `export default` en tests Jest
- El unico admin en la DB debe ser encontrado via JOIN query, no creado (unique index en `is_master_admin`)
- `jest@29` es mas estable que `jest@30` para este setup
- `jest.config.js` necesita `roots: ['<rootDir>/src']` para evitar escanear directorios externos (`node_modules`, `.bun`, `.codex`)
- `@vitest/coverage-v8` debe instalarse por separado — no viene con `vitest`
- Para tests de servicios (`authService.ts`), mockear `api` y verificar side effects en `localStorage`

> **Siguiente accion:** Fase 3 — Funcionalidad Principal
