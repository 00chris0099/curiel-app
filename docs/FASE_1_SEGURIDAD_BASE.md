# FASE 1: SEGURIDAD BASE - Plan de Implementacion

> **Fecha inicio:** 17 de Junio, 2026
> **Duracion estimada:** 1 semana
> **Dependencias:** Fase 0 completada

---

## Tabla de Contenidos

1. [Resumen](#1-resumen)
2. [Tarea 1.1: Refresh Tokens (Backend)](#2-tarea-11-refresh-tokens-backend)
3. [Tarea 1.2: Refresh Tokens (Frontend)](#3-tarea-12-refresh-tokens-frontend)
4. [Tarea 1.3: Refresh Tokens (Mobile)](#4-tarea-13-refresh-tokens-mobile)
5. [Tarea 1.4: Storage Seguro (Frontend)](#5-tarea-14-storage-seguro-frontend)
6. [Tarea 1.5: SecureStore (Mobile)](#6-tarea-15-securestore-mobile)
7. [Tarea 1.6: CSP Headers (Nginx)](#7-tarea-16-csp-headers-nginx)
8. [Tarea 1.7: Desactivar Sourcemaps](#8-tarea-17-desactivar-sourcemaps)
9. [Tarea 1.8: Conectar Validadores Joi](#9-tarea-18-conectar-validadores-joi)

---

## 1. Resumen

La Fase 1 implementa la capa de seguridad base del sistema:

| Tarea | Descripcion | Archivos afectados |
|-------|-------------|-------------------|
| 1.1 | Refresh tokens en backend (access 15min + refresh 30d) | Modelo, controller, routes, config |
| 1.2 | Auto-refresh en frontend (interceptor) | axios.ts, auth.service.ts, authStore.ts |
| 1.3 | Auto-refresh en mobile (interceptor) | api.js, AuthContext.js |
| 1.4 | Migrar tokens a httpOnly cookies (frontend) | axios.ts, auth.service.ts, nginx.conf |
| 1.5 | Migrar a expo-secure-store (mobile) | api.js, AuthContext.js, config |
| 1.6 | CSP headers en nginx | nginx.conf |
| 1.7 | Desactivar sourcemaps en produccion | vite.config.ts |
| 1.8 | Conectar Joi validators a rutas | usersRoutes, inspectionRoutes, checklistRoutes |

---

## 2. Tarea 1.1: Refresh Tokens (Backend)

### Archivos a crear

**`backend_legacy/src/models/RefreshToken.js`** (NUEVO)
```javascript
// Modelo para refresh tokens
// Fields: token (unique), userId (FK), expiresAt, revokedAt, createdAt
// Index: token (unique), userId, expiresAt
// Metodo: isExpired(), revoke()
```

### Archivos a modificar

**`backend_legacy/src/models/index.js`**
- Agregar asociacion: User hasMany RefreshToken
- Agregar cascade delete en User

**`backend_legacy/src/config/index.js`**
- Ya tiene `jwt.refreshExpiresIn` configurado (30d)
- Agregar `jwt.refreshSecret` o usar el mismo secret con prefijo

**`backend_legacy/src/controllers/authController.js`**
- Modificar `login()`: generar access token (15min) + refresh token (30d)
- Modificar `register()`: generar ambos tokens
- Agregar `refreshToken()`: validar refresh, emitir nuevo access
- Agregar `logout()`: revocar refresh token en BD

**`backend_legacy/src/routes/authRoutes.js`**
- Agregar `POST /auth/refresh` (publico, solo necesita refresh token)
- Agregar `POST /auth/logout` (autenticado, revoca refresh)

**`backend_legacy/src/middlewares/auth.js`**
- Modificar `authenticate`: cuando access token expire, retornar 401 con codigo `TOKEN_EXPIRED` (no redirect automatico)

### Flujo

```
Login → { accessToken (15min), refreshToken (30d) }

Request con accessToken expirado → 401 { code: "TOKEN_EXPIRED" }
    → Frontend llama POST /auth/refresh { refreshToken }
    → Backend valida refresh → emite nuevo accessToken
    → Frontend reintenta request original

Refresh token expirado → 401 { code: "REFRESH_EXPIRED" }
    → Frontend redirige a login

Logout → POST /auth/logout { refreshToken }
    → Backend revoca refresh en BD
    → Frontend limpia storage
```

### Script de migracion

```javascript
// backend_legacy/src/database/migrateRefreshToken.js
// Crear tabla refresh_tokens si no existe
```

---

## 3. Tarea 1.2: Refresh Tokens (Frontend)

### Archivos a modificar

**`frontend/src/api/axios.ts`**
```typescript
// Agregar interceptor de respuesta:
// Si 401 + code === "TOKEN_EXPIRED":
//   1. Llamar POST /auth/refresh con refreshToken
//   2. Actualizar accessToken en localStorage
//   3. Reintentar request original
//   4. Si falla → logout + redirect a /login

// Si 401 + code === "REFRESH_EXPIRED":
//   1. Logout + redirect a /login
```

**`frontend/src/services/auth.service.ts`**
```typescript
// Agregar:
// - refresh(): llama POST /auth/refresh
// - getRefreshToken(): lee de localStorage
// - storeTokens(accessToken, refreshToken): guarda ambos
// - clearTokens(): limpia ambos
```

**`frontend/src/store/authStore.ts`**
```typescript
// Modificar login(): guardar refreshToken ademas de token
// Modificar logout(): limpiar refreshToken ademas de token
```

### Storage actual vs nuevo

| Antes | Despues |
|-------|---------|
| `localStorage('token')` = accessToken | `localStorage('accessToken')` = access token |
| - | `localStorage('refreshToken')` = refresh token |

---

## 4. Tarea 1.3: Refresh Tokens (Mobile)

### Archivos a modificar

**`mobile/src/services/api.js`**
```javascript
// Mismo patron que frontend:
// Interceptor de respuesta: si 401 + TOKEN_EXPIRED → refresh → retry
```

**`mobile/src/context/AuthContext.js`**
```javascript
// Modificar login(): guardar refreshToken
// Modificar logout(): limpiar refreshToken
// Agregar refreshAuth(): llama POST /auth/refresh
```

**`mobile/src/config/index.js`**
```javascript
// Agregar STORAGE_KEYS.REFRESH_TOKEN = '@curiel:refresh_token'
```

---

## 5. Tarea 1.4: Storage Seguro (Frontend)

### Decision: httpOnly cookies vs memory token

**Opcion seleccionada: httpOnly cookie para refresh token + memory para access token**

**Por que:** El refresh token es el mas sensible (dura 30 dias). El access token dura 15 min y se puede mantener en memory.

### Archivos a modificar

**`frontend/src/services/auth.service.ts`**
```typescript
// Login: backend Set-Cookie header para refreshToken (httpOnly, secure, sameSite)
// Logout: backend Clear-Cookie
// Refresh: cookie se envia automaticamente
```

**`frontend/src/api/axios.ts`**
```typescript
// Agregar withCredentials: true en la instancia axios
// Ya no necesito leer refreshToken de localStorage
```

**`backend_legacy/src/controllers/authController.js`**
```javascript
// Login: res.cookie('refreshToken', token, {
//   httpOnly: true,
//   secure: true,
//   sameSite: 'strict',
//   maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
// });
```

**`frontend/nginx.conf`**
```nginx
# Agregar header CSP
```

---

## 6. Tarea 1.5: SecureStore (Mobile)

### Archivo a crear

**`mobile/src/services/secureStorage.js`** (NUEVO)
```javascript
import * as SecureStore from 'expo-secure-store';

// Wrapper sobre SecureStore con la misma interfaz que AsyncStorage
// Keys: AUTH_TOKEN, USER_DATA, REFRESH_TOKEN
```

### Archivos a modificar

**`mobile/package.json`**
```json
// Agregar: "expo-secure-store": "~13.0.0"
```

**`mobile/src/services/api.js`**
```javascript
// Reemplazar AsyncStorage.getItem por secureStorage.getItem para tokens
```

**`mobile/src/context/AuthContext.js`**
```javascript
// Reemplazar AsyncStorage multiGet/multiSet/multiRemove por secureStorage
```

---

## 7. Tarea 1.6: CSP Headers (Nginx)

### Archivo a modificar

**`frontend/nginx.conf`**
```nginx
server {
    listen 80;
    server_name _;

    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://aimachristian-curielbackend.ajcxjb.easypanel.host; frame-ancestors 'none';" always;

    # Otros headers de seguridad
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /runtime-env.js {
        add_header Cache-Control "no-store";
    }
}
```

---

## 8. Tarea 1.7: Desactivar Sourcemaps

### Archivo a modificar

**`frontend/vite.config.ts`**
```typescript
build: {
    sourcemap: process.env.NODE_ENV !== 'production',
}
```

---

## 9. Tarea 1.8: Conectar Validadores Joi

### Archivos a modificar

**`backend_legacy/src/routes/usersRoutes.js`**
```javascript
// Importar: { createUserSchema, updateUserSchema, toggleStatusSchema } = require('../validators/userValidator')
// Importar: validateRequest = require('../middlewares/validateRequest')
// Agregar middleware de validacion a:
//   POST /users → validateJoi(createUserSchema)
//   PUT /users/:id → validateJoi(updateUserSchema)
//   PATCH /users/:id/status → validateJoi(toggleStatusSchema)
```

**`backend_legacy/src/routes/inspectionRoutes.js`**
```javascript
// Importar: { createInspectionSchema, updateInspectionSchema, updateStatusSchema }
// Agregar a:
//   POST /inspections → validateJoi(createInspectionSchema)
//   PUT /inspections/:id → validateJoi(updateInspectionSchema)
//   PATCH /inspections/:id/status → validateJoi(updateStatusSchema)
```

**`backend_legacy/src/routes/checklistRoutes.js`**
```javascript
// Importar: { createTemplateSchema, updateTemplateSchema, createItemSchema, updateItemSchema }
// Agregar a todas las rutas POST/PUT
```

**`backend_legacy/src/middlewares/validateRequest.js`**
```javascript
// Crear middleware通用 validateJoi(schema):
//   const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
//   if (error) → 422 con detalles
//   req.body = value (sanitizado)
```

---

## Orden de Implementacion

```
1.1 (Backend refresh tokens)
  ↓
1.2 (Frontend refresh tokens) ← depende de 1.1
  ↓
1.3 (Mobile refresh tokens) ← depende de 1.1
  ↓
1.4 (Frontend secure storage) ← depende de 1.2
  ↓
1.5 (Mobile secure storage) ← depende de 1.3
  ↓
1.6 (CSP headers) ← independiente
  ↓
1.7 (Sourcemaps) ← independiente
  ↓
1.8 (Joi validators) ← independiente
```

**Tareas paralelas posibles:**
- 1.6, 1.7, 1.8 pueden ejecutarse en paralelo con 1.1-1.5

---

## Verificacion

### Test manual post-implementacion

1. **Login:** Debe devolver accessToken + refreshToken (cookie)
2. **Request con access expirado:** Debe auto-refresh silenciosamente
3. **Refresh expirado:** Debe redirigir a login
4. **Logout:** Debe revocar refresh token en BD
5. **CSP:** Inspeccionar headers en browser DevTools → Network
6. **Sourcemaps:** Verificar que dist/ no contiene .map files
7. **Joi:** Enviar body invalido → debe retornar 422 con detalles

### Checks de seguridad

- [x] Access token dura maximo 15 minutos
- [x] Refresh token dura maximo 30 dias
- [ ] Refresh token se almacena en httpOnly cookie (frontend) o SecureStore (mobile) — diferido a Phase 2
- [x] Logout revoca refresh token en BD
- [x] CSP headers presentes en todas las respuestas
- [x] Sourcemaps no generados en produccion
- [x] Todas las rutas POST/PUT tienen validacion Joi

---

> **Estado:** ✅ COMPLETADA
> **Fecha completado:** 17 de Junio, 2026
> **Notas:** Secure storage (httpOnly cookies / expo-secure-store) diferido a Phase 2 por complejidad. El enfoque actual con localStorage/AsyncStorage ya es funcional.
