# 📬 COLECCIÓN DE REQUESTS - CURIEL API

Ejemplos de requests listos para usar con Postman, Thunder Client, o cualquier cliente HTTP.

---

## 🔐 AUTENTICACIÓN

### 1. Login
```http
POST http://localhost:4000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@curiel.com",
  "password": "admin123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "uuid...",
      "email": "admin@curiel.com",
      "firstName": "Admin",
      "lastName": "Sistema",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Importante:** Copia el `token` de la respuesta para usarlo en los siguientes requests.

---

### 2. Obtener Mi Perfil
```http
GET http://localhost:4000/api/v1/auth/me
Authorization: Bearer TU_TOKEN_AQUI
```

### 3. Actualizar Mi Perfil
```http
PUT http://localhost:4000/api/v1/auth/me
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "firstName": "Admin",
  "lastName": "Actualizado",
  "phone": "+52 555 9999 9999"
}
```

### 4. Cambiar Contraseña
```http
PUT http://localhost:4000/api/v1/auth/change-password
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "currentPassword": "admin123",
  "newPassword": "nuevaPassword123"
}
```

---

## 👥 USUARIOS (Solo Admin)

### 1. Listar Usuarios
```http
GET http://localhost:4000/api/v1/users
Authorization: Bearer TU_TOKEN_AQUI
```

**Con filtros:**
```http
GET http://localhost:4000/api/v1/users?role=inspector&isActive=true&page=1&limit=10
Authorization: Bearer TU_TOKEN_AQUI
```

### 2. Crear Usuario
```http
POST http://localhost:4000/api/v1/users
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "email": "nuevo@curiel.com",
  "password": "password123",
  "firstName": "Nuevo",
  "lastName": "Usuario",
  "role": "inspector",
  "phone": "+52 555 1234 5678"
}
```

### 3. Obtener Usuario por ID
```http
GET http://localhost:4000/api/v1/users/UUID_DEL_USUARIO
Authorization: Bearer TU_TOKEN_AQUI
```

### 4. Actualizar Usuario
```http
PUT http://localhost:4000/api/v1/users/UUID_DEL_USUARIO
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "firstName": "Nombre",
  "lastName": "Actualizado",
  "phone": "+52 555 9999 8888"
}
```

### 5. Cambiar Estado (Activar/Desactivar)
```http
PATCH http://localhost:4000/api/v1/users/UUID_DEL_USUARIO/status
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "isActive": false
}
```

### 6. Eliminar Usuario
```http
DELETE http://localhost:4000/api/v1/users/UUID_DEL_USUARIO
Authorization: Bearer TU_TOKEN_AQUI
```

### 7. Estadísticas de Usuarios
```http
GET http://localhost:4000/api/v1/users/stats
Authorization: Bearer TU_TOKEN_AQUI
```

---

## 📋 INSPECCIONES

### 1. Listar Inspecciones
```http
GET http://localhost:4000/api/v1/inspections
Authorization: Bearer TU_TOKEN_AQUI
```

**Con filtros:**
```http
GET http://localhost:4000/api/v1/inspections?status=pendiente&search=torre&page=1&limit=10
Authorization: Bearer TU_TOKEN_AQUI
```

### 2. Crear Inspección
```http
POST http://localhost:4000/api/v1/inspections
Authorization: Bearer TU_TOKEN_ADMIN_O_ARQUITECTO
Content-Type: application/json

{
  "projectName": "Torre Reforma 500",
  "clientName": "Constructora ABC S.A.",
  "clientEmail": "contacto@constructora.com",
  "clientPhone": "+52 555 1234 5678",
  "address": "Av. Paseo de la Reforma 500",
  "city": "Ciudad de México",
  "state": "CDMX",
  "zipCode": "06600",
  "inspectionType": "estructural",
  "scheduledDate": "2026-02-20T10:00:00.000Z",
  "inspectorId": "UUID_DEL_INSPECTOR",
  "notes": "Inspección de fase 1 - Cimientos",
  "latitude": 19.4326,
  "longitude": -99.1332
}
```

### 3. Obtener Inspección por ID
```http
GET http://localhost:4000/api/v1/inspections/UUID_DE_INSPECCION
Authorization: Bearer TU_TOKEN_AQUI
```

### 4. Actualizar Inspección
```http
PUT http://localhost:4000/api/v1/inspections/UUID_DE_INSPECCION
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "notes": "Notas actualizadas de la inspección",
  "scheduledDate": "2026-02-21T14:00:00.000Z"
}
```

### 5. Cambiar Estado de Inspección
```http
PATCH http://localhost:4000/api/v1/inspections/UUID_DE_INSPECCION/status
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "status": "en_proceso"
}
```

**Estados válidos:** `pendiente`, `en_proceso`, `finalizada`, `cancelada`

### 6. Eliminar Inspección (Solo Admin)
```http
DELETE http://localhost:4000/api/v1/inspections/UUID_DE_INSPECCION
Authorization: Bearer TU_TOKEN_ADMIN
```

### 7. Estadísticas de Inspecciones
```http
GET http://localhost:4000/api/v1/inspections/stats
Authorization: Bearer TU_TOKEN_AQUI
```

---

## ✅ CHECKLISTS

### 1. Listar Templates
```http
GET http://localhost:4000/api/v1/checklists/templates
Authorization: Bearer TU_TOKEN_AQUI
```

### 2. Crear Template
```http
POST http://localhost:4000/api/v1/checklists/templates
Authorization: Bearer TU_TOKEN_ADMIN_O_ARQUITECTO
Content-Type: application/json

{
  "name": "Inspección de Acabados",
  "description": "Checklist para verificar calidad de acabados",
  "category": "acabados",
  "items": [
    {
      "description": "Verificar pintura en muros - sin manchas",
      "category": "pintura",
      "isRequired": true,
      "orderNumber": 1,
      "requiresPhoto": true,
      "requiresComment": false
    },
    {
      "description": "Revisar instalación de pisos",
      "category": "pisos",
      "isRequired": true,
      "orderNumber": 2,
      "requiresPhoto": true,
      "requiresComment": true
    },
    {
      "description": "Inspeccionar cancelería",
      "category": "canceleria",
      "isRequired": false,
      "orderNumber": 3,
      "requiresPhoto": false,
      "requiresComment": false
    }
  ]
}
```

### 3. Obtener Template por ID
```http
GET http://localhost:4000/api/v1/checklists/templates/UUID_DEL_TEMPLATE
Authorization: Bearer TU_TOKEN_AQUI
```

### 4. Actualizar Template
```http
PUT http://localhost:4000/api/v1/checklists/templates/UUID_DEL_TEMPLATE
Authorization: Bearer TU_TOKEN_ADMIN_O_ARQUITECTO
Content-Type: application/json

{
  "name": "Inspección de Acabados Actualizada",
  "description": "Nueva descripción",
  "isActive": true
}
```

### 5. Agregar Ítem a Template
```http
POST http://localhost:4000/api/v1/checklists/templates/UUID_DEL_TEMPLATE/items
Authorization: Bearer TU_TOKEN_ADMIN_O_ARQUITECTO
Content-Type: application/json

{
  "description": "Verificar instalaciones eléctricas en acabados",
  "category": "electricidad",
  "isRequired": true,
  "orderNumber": 4,
  "requiresPhoto": true,
  "requiresComment": true
}
```

### 6. Actualizar Ítem
```http
PUT http://localhost:4000/api/v1/checklists/items/UUID_DEL_ITEM
Authorization: Bearer TU_TOKEN_ADMIN_O_ARQUITECTO
Content-Type: application/json

{
  "description": "Descripción actualizada",
  "isRequired": false
}
```

### 7. Eliminar Ítem
```http
DELETE http://localhost:4000/api/v1/checklists/items/UUID_DEL_ITEM
Authorization: Bearer TU_TOKEN_ADMIN_O_ARQUITECTO
```

### 8. Eliminar Template
```http
DELETE http://localhost:4000/api/v1/checklists/templates/UUID_DEL_TEMPLATE
Authorization: Bearer TU_TOKEN_ADMIN
```

---

## 📷 FOTOS

### 1. Subir Foto Individual
```http
POST http://localhost:4000/api/v1/photos/inspection/UUID_DE_INSPECCION
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: multipart/form-data

photo: [Selecciona archivo de imagen]
description: Vista general de la estructura
checklistItemId: UUID_DEL_ITEM (opcional)
```

### 2. Subir Múltiples Fotos
```http
POST http://localhost:4000/api/v1/photos/inspection/UUID_DE_INSPECCION/multiple
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: multipart/form-data

photos: [Selecciona múltiples archivos]
```

### 3. Obtener Fotos de Inspección
```http
GET http://localhost:4000/api/v1/photos/inspection/UUID_DE_INSPECCION
Authorization: Bearer TU_TOKEN_AQUI
```

### 4. Obtener Foto por ID
```http
GET http://localhost:4000/api/v1/photos/UUID_DE_FOTO
Authorization: Bearer TU_TOKEN_AQUI
```

### 5. Actualizar Descripción de Foto
```http
PUT http://localhost:4000/api/v1/photos/UUID_DE_FOTO
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "description": "Nueva descripción de la foto"
}
```

### 6. Eliminar Foto
```http
DELETE http://localhost:4000/api/v1/photos/UUID_DE_FOTO
Authorization: Bearer TU_TOKEN_AQUI
```

---

## 🏥 UTILIDAD

### Health Check
```http
GET http://localhost:4000/api/v1/health
```

**Respuesta:**
```json
{
  "success": true,
  "status": "operational",
  "timestamp": "2026-02-17T14:35:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "latency": "15ms"
  },
  "memory": {
    "used": "120MB",
    "total": "512MB"
  },
  "version": "1.0.0"
}
```

---

## 📝 NOTAS IMPORTANTES

### Headers Comunes
Todos los requests autenticados deben incluir:
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

### Formato de Fechas
Usar formato ISO 8601:
```
"2026-02-20T10:00:00.000Z"
```

### UUIDs
Todos los IDs son UUIDs version 4:
```
"550e8400-e29b-41d4-a716-446655440000"
```

### Respuestas Estándar
**Éxito:**
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```

---

## 🔄 FLUJO TÍPICO DE USO

1. **Login** → Obtener token
2. **Crear Inspección** → Retorna ID de inspección
3. **Subir Fotos** → Asociar fotos a la inspección
4. **Cambiar Estado** → Marcar como "en_proceso"
5. **Completar** → Cambiar estado a "finalizada"

---

## 🔗 RECURSOS ADICIONALES

- **Swagger UI:** http://localhost:4000/api/docs
- **Documentación Completa:** `API_DOCUMENTATION.md`
- **Guía Rápida:** `QUICKSTART.md`

---

_Última actualización: 17 de febrero de 2026_
