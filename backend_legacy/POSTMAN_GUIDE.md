# 📮 Guía de Postman para CURIEL API

## ✅ Estado del Servidor

**Tu servidor está funcionando correctamente** en `http://localhost:4000` ✨

### Verificado:
- ✅ PostgreSQL está corriendo (puertos 14 y 18)
- ✅ El servidor está escuchando en puerto 4000
- ✅ Las rutas raíz y health check están respondiendo

---

## 🔧 Problema Encontrado

### ❌ URL Incorrecta en Postman

Tu request está usando:
```
GET http://localhost:4000/api/v1/auth/profile
```

### ✅ URL Correcta

La ruta debe ser:
```
GET http://localhost:4000/api/v1/auth/me
```

**Nota:** La ruta es `/me`, NO `/profile` según el código en `authRoutes.js` línea 55.

---

## 🧪 Pruebas Paso a Paso

### 1️⃣ **Probar Conectividad Básica** (SIN autenticación)

#### Test 1: Ruta Raíz
```
GET http://localhost:4000/
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "CURIEL API - Sistema de Inspecciones Técnicas",
  "version": "1.0.0",
  "docs": "/api/health"
}
```

#### Test 2: Health Check
```
GET http://localhost:4000/api/v1/health
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2026-02-17T05:02:41.698Z"
}
```

---

### 2️⃣ **Obtener Token JWT** (Login)

#### Request:
```
POST http://localhost:4000/api/v1/auth/login
```

#### Headers:
```
Content-Type: application/json
```

#### Body (raw JSON):
```json
{
  "email": "admin@curiel.com",
  "password": "admin123"
}
```

#### Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-aqui",
      "email": "admin@curiel.com",
      "firstName": "Admin",
      "lastName": "Sistema",
      "role": "admin"
    }
  }
}
```

**⚠️ IMPORTANTE:** Copia el `token` de la respuesta. Lo necesitarás para las siguientes peticiones.

---

### 3️⃣ **Probar Endpoint Protegido** (con token)

#### Request:
```
GET http://localhost:4000/api/v1/auth/me
```

#### Headers:
```
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json
```

**Ejemplo completo:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2MzE1NjcwMDB9.example_signature
```

#### Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "id": "uuid-aqui",
    "email": "admin@curiel.com",
    "firstName": "Admin",
    "lastName": "Sistema",
    "role": "admin",
    "phone": "+1234567890",
    "isActive": true,
    "createdAt": "2026-02-17T...",
    "updatedAt": "2026-02-17T..."
  }
}
```

---

## 👥 Usuarios de Prueba

### Necesitas crear usuarios primero

**IMPORTANTE:** Si no has ejecutado el seed, necesitas hacerlo primero:

```bash
npm run seed
```

Esto creará un usuario **admin** (los demás usuarios deben crearse vía API con token admin):

| Email | Password | Rol |
|-------|----------|-----|
| admin@curiel.com | admin123 | admin |

---

## 🚨 Solución de Problemas

### Error: ECONNREFUSED 127.0.0.1:4000

**Causas:**
1. ❌ El servidor no está corriendo
2. ❌ Puerto incorrecto
3. ❌ Firewall bloqueando conexión

**Soluciones:**

#### 1. Verifica que el servidor esté corriendo
```bash
# En la terminal del backend
npm run dev
```

Deberías ver:
```
🚀 ========================================
   CURIEL API Server
   Entorno: development
   Puerto: 4000
   URL: http://localhost:4000
========================================
```

#### 2. Verifica que el puerto 4000 esté escuchando
```bash
# En PowerShell
netstat -ano | findstr :4000
```

Deberías ver algo como:
```
TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       11424
```

#### 3. Si el servidor falla al iniciar

**Error común:** Base de datos no conectada

Verifica que PostgreSQL esté corriendo:
```bash
Get-Service -Name postgresql*
```

Si no está corriendo, inícialo:
```bash
Start-Service postgresql-x64-18
```

---

## 📝 Colección de Postman

### Rutas Disponibles

#### 🔓 Públicas (sin token)
- `POST /api/v1/auth/login` - Login

#### 🔒 Protegidas (con token)
- `GET /api/v1/auth/me` - Obtener perfil propio
- `PUT /api/v1/auth/me` - Actualizar perfil
- `PUT /api/v1/auth/change-password` - Cambiar contraseña

#### 🔒 Solo Admin
- `POST /api/v1/auth/register` - Crear nuevo usuario

---

## 🎯 Configuración Recomendada en Postman

### Variables de Entorno

Crea un Environment llamado "CURIEL Local" con:

| Variable | Value |
|----------|-------|
| base_url | http://localhost:4000 |
| api_version | v1 |
| token | (se llenará automáticamente después del login) |

### Script Post-Response para Login

En el request de Login, añade este script en la pestaña "Tests":

```javascript
// Guardar el token automáticamente
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.data.token);
    console.log("✅ Token guardado:", response.data.token);
}
```

Así no tendrás que copiar el token manualmente cada vez.

### Uso de Variables

Cambia tus URLs a:
```
{{base_url}}/api/{{api_version}}/auth/me
```

Y el header Authorization:
```
Bearer {{token}}
```

---

## ✅ Checklist de Verificación

Antes de hacer requests con token, asegúrate de:

- [ ] El servidor está corriendo (`npm run dev`)
- [ ] PostgreSQL está activo
- [ ] Has ejecutado el seed (`npm run seed`)
- [ ] Has hecho login y obtenido el token
- [ ] El token está en el header `Authorization: Bearer TOKEN`
- [ ] La URL es `/me` y NO `/profile`
- [ ] El método HTTP es correcto (GET, POST, PUT, etc.)

---

## 🎉 ¡Listo!

Ahora puedes:
1. Hacer login con `admin@curiel.com / admin123`
2. Copiar el token de la respuesta
3. Usar ese token en el header `Authorization: Bearer TOKEN`
4. Llamar a `GET http://localhost:4000/api/v1/auth/me`

**¡Debería funcionar! 🚀**
