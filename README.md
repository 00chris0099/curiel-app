# 🏗️ CURIEL - Sistema de Inspecciones Técnicas

**Aplicación profesional para gestión de inspecciones técnicas en obras de construcción, arquitectura e ingeniería.**

## 📋 Descripción

CURIEL es un sistema SaaS completo que digitaliza el proceso de inspecciones técnicas, eliminando formularios en papel y automatizando la generación de reportes profesionales con evidencia fotográfica, firmas digitales y trazabilidad completa.

## 🎯 Características Principales

### ✅ Gestión de Inspecciones
- Crear, editar y finalizar inspecciones
- Asignación automática de inspectores
- Estados: Pendiente, En Proceso, Finalizada
- Trazabilidad completa (auditoría)

### 👥 Sistema de Usuarios
- Autenticación JWT
- Roles: Admin, Arquitecto, Inspector
- Permisos granulares por rol
- Multi-empresa (SaaS)

### 📝 Checklists Configurables
- Plantillas por tipo de inspección
- Ítems: Cumple / No cumple / No aplica
- Observaciones por ítem
- Firmas digitales (inspector + cliente)

### 📸 Evidencia Fotográfica
- Integración con cámara del dispositivo
- Metadatos: fecha, hora, ubicación GPS
- Asociación a ítems específicos
- Almacenamiento en la nube

### 📄 Reportes Profesionales
- Generación automática de PDF
- Logo de empresa personalizable
- Fotos incrustadas
- Firmas incluidas
- Historial completo

### 📊 Dashboard Inteligente
- Métricas en tiempo real
- Gráficos de estado
- Vista por rol
- Historial de actividad

### 🔄 Automatización (n8n)
- Email automático al finalizar inspección
- Notificaciones a administradores
- Webhooks configurables
- Logs de auditoría

### 📱 Modo Offline
- Trabajo sin conexión
- Sincronización automática
- Caché inteligente
- Resolución de conflictos

## 🏗️ Arquitectura del Proyecto

```
CURIEL/
├── backend/                 # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Configuración (DB, JWT, etc.)
│   │   ├── models/         # Modelos de base de datos
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── routes/         # Endpoints de API
│   │   ├── middlewares/    # Auth, validación, etc.
│   │   ├── services/       # Servicios (PDF, emails, etc.)
│   │   └── utils/          # Utilidades
│   ├── uploads/            # Almacenamiento temporal
│   └── package.json
│
├── mobile/                  # App móvil (React Native + Expo)
│   ├── src/
│   │   ├── screens/        # Pantallas de la app
│   │   ├── components/     # Componentes reutilizables
│   │   ├── navigation/     # Navegación
│   │   ├── services/       # API client, storage, etc.
│   │   ├── context/        # State management
│   │   ├── utils/          # Utilidades
│   │   └── assets/         # Imágenes, fuentes, etc.
│   └── package.json
│
├── n8n-workflows/           # Flujos de automatización
│   ├── inspection-completed.json
│   ├── user-notifications.json
│   └── README.md
│
└── docs/                    # Documentación
    ├── API.md              # Documentación de API
    ├── DEPLOYMENT.md       # Guía de deployment
    └── USER_GUIDE.md       # Manual de usuario
```

## 🛠️ Stack Tecnológico

### Backend
| Tecnología | Propósito |
|-----------|-----------|
| Node.js + Express | Framework web |
| PostgreSQL | Base de datos |
| Sequelize | ORM |
| JWT | Autenticación |
| Multer | Upload de archivos |
| Cloudinary | Almacenamiento de imágenes |
| PDFKit | Generación de PDFs |
| Nodemailer | Envío de emails |

### Mobile
| Tecnología | Propósito |
|-----------|-----------|
| React Native | Framework móvil |
| Expo | Toolchain |
| React Navigation | Navegación |
| AsyncStorage | Almacenamiento local |
| Expo Camera | Cámara |
| Expo Location | GPS |
| React Native Signature Canvas | Firmas |
| Axios | Cliente HTTP |

### Automatización
| Tecnología | Propósito |
|-----------|-----------|
| n8n | Workflows |
| Webhooks | Notificaciones |

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+ 
- PostgreSQL 14+
- Expo CLI
- n8n (opcional)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run migrate
npm run seed
npm run dev
```

### 2. Mobile App

```bash
cd mobile
npm install
cp .env.example .env
# Editar .env con la URL del backend
npm start
```

### 3. Base de Datos

```bash
# Crear base de datos
createdb curiel_db

# Ejecutar migraciones
npm run migrate

# Datos de prueba (opcional)
npm run seed
```

## 📱 Uso de la Aplicación

### Login
1. Abrir la app
2. Ingresar email y contraseña
3. El sistema asigna permisos según el rol

### Crear Inspección (Admin/Arquitecto)
1. Dashboard → Nueva Inspección
2. Completar datos del proyecto
3. Asignar inspector
4. Seleccionar tipo de inspección
5. Guardar

### Realizar Inspección (Inspector)
1. Ver inspecciones asignadas
2. Seleccionar inspección
3. Completar checklist
4. Tomar fotos
5. Firmar
6. Finalizar → genera PDF automáticamente

### Generar Reporte
- Al finalizar inspección, el PDF se genera automáticamente
- Se envía por email al cliente (vía n8n)
- Disponible en historial

## 🔐 Roles y Permisos

| Funcionalidad | Admin | Arquitecto | Inspector |
|--------------|-------|------------|-----------|
| Crear usuarios | ✅ | ❌ | ❌ |
| Crear inspecciones | ✅ | ✅ | ❌ |
| Realizar inspecciones | ✅ | ✅ | ✅ |
| Ver todas las inspecciones | ✅ | ✅ | ❌ |
| Ver inspecciones asignadas | ✅ | ✅ | ✅ |
| Dashboard completo | ✅ | ✅ | ❌ |
| Configurar checklists | ✅ | ✅ | ❌ |
| Descargar reportes | ✅ | ✅ | ✅ |

### 🚨 Master admin (usuario con permisos totales)

Al ejecutar `npm run seed` el sistema crea (o verifica) un usuario **admin** que también recibe el flag `isMasterAdmin`. Este es el único usuario que puede:

- Crear/editar/borrar usuarios
- Transferir el rol de master admin a otro usuario
- Acceder a todos los endpoints restringidos (incluso si no tiene el rol `admin`)

> Puedes cambiar las credenciales de este usuario con las variables de entorno `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

- **Email:** `admin@curiel.com` (puede cambiarse con `ADMIN_EMAIL`)
- **Contraseña:** `admin123` (puede cambiarse con `ADMIN_PASSWORD`)

> Si usas un entorno real, cambia estas credenciales y asegúrate de no exponerlas públicamente.

### 🔁 Transferir el Master Admin

Para asignar el master admin a otro usuario:

- `POST /api/v1/users/:id/transfer-master` (requiere token del master admin actual)

El sistema garantiza que solo haya un único `isMasterAdmin = true` en la base de datos.

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (solo admin)
- `POST /api/auth/refresh` - Refrescar token

### Usuarios (Admin)
- **POST /api/v1/users** - Crear usuario (solo admin)  
  Payload mínimo:
  ```json
  {
    "email": "usuario@dominio.com",
    "password": "secret123",
    "firstName": "Nombre",
    "lastName": "Apellido",
    "role": "inspector" // o "arquitecto" / "admin"
  }
  ```
- **GET /api/v1/users** - Listar usuarios (solo admin)
- **PUT /api/v1/users/:id** - Actualizar usuario (solo admin)
- **PATCH /api/v1/users/:id/status** - Activar/desactivar usuario (solo admin)
- **DELETE /api/v1/users/:id** - Eliminar usuario (solo admin)

### Inspecciones
- `GET /api/inspections` - Listar inspecciones
- `POST /api/inspections` - Crear inspección
- `GET /api/inspections/:id` - Ver inspección
- `PUT /api/inspections/:id` - Actualizar inspección
- `DELETE /api/inspections/:id` - Eliminar inspección
- `POST /api/inspections/:id/complete` - Finalizar inspección

### Checklists
- `GET /api/checklists` - Listar checklists
- `POST /api/checklists` - Crear checklist
- `PUT /api/checklists/:id` - Actualizar checklist

### Fotos
- `POST /api/photos/upload` - Subir foto
- `GET /api/photos/:id` - Obtener foto
- `DELETE /api/photos/:id` - Eliminar foto

### Reportes
- `GET /api/reports/:inspectionId` - Generar/descargar PDF
- `GET /api/reports/history` - Historial de reportes

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas

Ver documentación completa en `docs/API.md`

## 🔄 Integración con n8n

### Webhook al Finalizar Inspección
```javascript
POST https://your-n8n-instance.com/webhook/inspection-completed
{
  "inspectionId": "uuid",
  "clientEmail": "cliente@empresa.com",
  "pdfUrl": "https://cloudinary.com/...",
  "inspectorName": "Juan Pérez",
  "projectName": "Torre Solar"
}
```

Ver flujos completos en `n8n-workflows/`

## 📦 Deployment

### Backend (Railway/Render)
```bash
# Configurar variables de entorno
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_URL=...

# Deploy
git push railway main
```

### Mobile (Expo)
```bash
# Build Android
eas build --platform android

# Build iOS
eas build --platform ios

# Publicar en stores
eas submit
```

Ver guía completa en `docs/DEPLOYMENT.md`

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Mobile tests
cd mobile
npm test
```

## 📈 Roadmap

### Versión 1.0 (MVP) ✅
- [x] Autenticación y roles
- [x] CRUD de inspecciones
- [x] Checklists
- [x] Evidencia fotográfica
- [x] Generación de PDF
- [x] Dashboard básico
- [x] Integración n8n

### Versión 1.1 (Próximamente)
- [ ] Multi-empresa (tenants)
- [ ] Plantillas de checklist avanzadas
- [ ] Reportes con gráficos
- [ ] Notificaciones push
- [ ] Modo offline completo
- [ ] Exportación a Excel

### Versión 2.0 (Futuro)
- [ ] IA para detección de anomalías en fotos
- [ ] Reconocimiento de voz para notas
- [ ] Integración con drones
- [ ] Realidad aumentada
- [ ] App web (admin)

## 🤝 Contribución

Este es un proyecto privado/propietario. Para contribuir, contacta al desarrollador.

## 📄 Licencia

Propietario - Todos los derechos reservados © 2026

## 👨‍💻 Desarrollador

**Freelancer:** [Tu Nombre]
**Email:** [tu@email.com]
**GitHub:** [tu-usuario]

## 📞 Soporte

Para soporte técnico o consultas comerciales:
- Email: soporte@curiel.com
- WhatsApp: +XX XXX XXX XXXX

---

**CURIEL** - Digitaliza tus inspecciones técnicas 🏗️
