# 🎨 CURIEL FRONTEND - Aplicación Web

Frontend profesional para el sistema de inspecciones técnicas CURIEL, construido con React + TypeScript + TailwindCSS.

---

## ✨ Características

- ✅ **Autenticación JWT** - Login seguro con tokens
- ✅ **Dashboard Interactivo** - Estadísticas en tiempo real
- ✅ **Gestión de Inspecciones** - CRUD completo
- ✅ **Dark Mode** - Tema claro/oscuro
- ✅ **Toast Notifications** - Notificaciones visuales
- ✅ **Responsive Design** - Mobile y desktop
- ✅ **TypeScript** - Código 100% tipado
- ✅ **Rutas Protegidas** - Control de acceso por roles

---

## 🚀 Inicio Rápido

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Edita el archivo `.env`:
```env
VITE_API_URL=http://localhost:4000/api/v1
```

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 🛠️ Stack Tecnológico

- **React** 18+  - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool ultrarrápido
- **TailwindCSS** - Estilos utility-first
- **React Router** - Enrutamiento SPA
- **Zustand** - Estado global ligero
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos modernos
- **React Hot Toast** - Notificaciones

---

## 📁 Estructura del Proyecto

```
src/
├── api/
│   └── axios.ts                 # Cliente HTTP configurado
├── auth/
│   └── PrivateRoute.tsx         # Rutas protegidas
├── components/
│   ├── Loader.tsx               # Spinner de carga
│   ├── Navbar.tsx               # Barra superior
│   └── Sidebar.tsx              # Menú lateral
├── pages/
│   ├── Login.tsx                # Página de login
│   ├── Dashboard.tsx            # Dashboard principal
│   ├── Profile.tsx              # Perfil de usuario
│   ├── Inspections.tsx          # Lista de inspecciones
│   └── CreateInspection.tsx     # Formulario de creación
├── services/
│   ├── auth.service.ts          # Servicio de autenticación
│   ├── inspection.service.ts    # Servicio de inspecciones
│   └── user.service.ts          # Servicio de usuarios
├── store/
│   ├── authStore.ts             # Estado de autenticación
│   └── themeStore.ts            # Estado del tema
├── App.tsx                      # Componente principal
├── main.tsx                     # Entry point
└── index.css                    # Estilos globales
```

---

## 🔐 Autenticación

El sistema usa JWT para autenticación:

1. El usuario inicia sesión en `/login`
2. El token se guarda en `localStorage`
3. Axios agrega automáticamente el token a todas las requests
4. Las rutas protegidas verifican autenticación

### Interceptor Axios
```typescript
// Agregar token a requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🎨 Páginas Implementadas

### 1️⃣ Login (`/login`)
- Formulario de email y contraseña
- Validación en tiempo real
- Estados de loading
- Login con credenciales reales (backend conectado)

### 2️⃣ Dashboard (`/dashboard`)
- Bienvenida personalizada
- Estadísticas de inspecciones
- Accesos rápidos
- Gráficas visuales

### 3️⃣ Perfil (`/profile`)
- Información del usuario
- Rol y permisos
- Estado de cuenta
- Datos del backend en vivo

### 4️⃣ Inspecciones (`/inspections`)
- Tabla filtrable
- Búsqueda en tiempo real
- Filtros por estado
- Paginación

### 5️⃣ Crear Inspección (`/inspections/create`)
- Formulario completo validado
- Asignación de inspector
- Dirección del proyecto
- Notas adicionales

---

## 🛡️ Roles y Permisos

| Rol | Dashboard | Inspecciones | Crear | Perfil |
|-----|-----------|--------------|-------|--------|
| **Admin** | ✅ | ✅ Ver todas | ✅ | ✅ |
| **Arquitecto** | ✅ | ✅ Ver todas | ✅ | ✅ |
| **Inspector** | ✅ | ✅ Solo asignadas | ❌ | ✅ |

---

## 🌙 Dark Mode

El modo oscuro está implementado con:
- Persistencia en `localStorage`
- Toggle en la Navbar
- Clases de TailwindCSS `dark:`
- Animaciones suaves

```typescript
// Toggle en cualquier componente
const { toggleTheme } = useThemeStore();
```

---

## 🔔 Toast Notifications

Notificaciones visuales con `react-hot-toast`:

```typescript
import toast from 'react-hot-toast';

// Éxito
toast.success('Operación exitosa');

// Error
toast.error('Algo salió mal');

// Info
toast('Información');
```

---

## 📝 Scripts Disponibles

```json
{
  "dev": "vite",              // Desarrollo
  "build": "vite build",      // Producción
  "preview": "vite preview",  // Preview build
  "lint": "eslint ."          // Linter
}
```

---

## 🔄 Flujo de Datos

```
User Action
   ↓
Component (React)
   ↓
Store (Zustand) o Service
   ↓
API Call (Axios)
   ↓
Backend (Express)
   ↓
Response
   ↓
Update UI + Toast
```

---

## 🧪 Conectar con Backend

Asegúrate de que el backend esté corriendo:

```bash
# En terminal 1 - Backend
cd backend
npm run dev

# En terminal 2 - Frontend
cd frontend
npm run dev
```

URLs:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api/v1`

---

## 🎯 Próximos Pasos

### Features Pendientes
- [ ] Detalle de inspección individual
- [ ] Editar inspección existente
- [ ] Upload de fotos con drag & drop
- [ ] Gestión de usuarios (admin)
- [ ] Generación de reportes PDF
- [ ] Notificaciones push
- [ ] Gráficas avanzadas (Chart.js)
- [ ] Exportar a Excel

### Mejoras
- [ ] Tests (Vitest + Testing Library)
- [ ] Lazy loading de rutas
- [ ] Service Workers (PWA)
- [ ] i18n (Internacionalización)

---

## 📚 Credenciales de Prueba

Después de ejecutar `npm run seed` en el backend, se creará un usuario **admin** con credenciales (puedes personalizarlas con variables de entorno):

```
Admin: admin@curiel.com / admin123
```

---

## 🐛 Troubleshooting

### Error de CORS
Asegúrate de que el backend tenga configurado CORS:
```javascript
// backend/src/server.js
app.use(cors({
  origin: 'http://localhost:5173'
}));
```

### Error 401 Unauthorized
Tu token expiró. Haz logout y vuelve a hacer login.

### Estilos no se aplican
Ejecuta:
```bash
npm run dev
```
Esto reiniciará el proceso de Tailwind.

---

## 📄 Licencia

Proprietary - © 2026 CURIEL

---

**Frontend profesional listo para producción** 🚀

_Desarrollado con React, TypeScript y TailwindCSS_
