# Fase 9: Mobile MVP

## Resumen

Implementacion completa del MVP mobile: pantallas faltantes, configuracion de build, ErrorBoundary, logout, y tests.

## Estado de pantallas

| # | Pantalla | Estado | Archivo |
|---|----------|--------|---------|
| 9.5 | InspectionDetail | **Existia** (Fase 5) | `screens/InspectionDetailScreen.js` |
| 9.6 | InspectionExecution | **Existia** (Fase 5) | `screens/ExecutionScreen.js` |
| 9.7 | PhotoCapture | **Existia** (Fase 5) | `screens/PhotoCaptureScreen.js` |
| 9.8 | AreaDetail | **NUEVA** | `screens/AreaDetailScreen.js` |
| 9.9 | ObservationForm | **NUEVA** | `screens/ObservationFormScreen.js` |
| 9.10 | Profile | **NUEVA** | `screens/ProfileScreen.js` |
| 9.11 | Settings | **NUEVA** | `screens/SettingsScreen.js` |
| 9.12 | OfflineSync | **Existia** (Fase 5) | `screens/OfflineStatusScreen.js` |

## Archivos nuevos

### Configuracion
- `eas.json` - Perfiles de build: development, preview, production
- `babel.config.js` - Actualizado a `babel-preset-expo`
- `assets/README.md` - Instrucciones para crear iconos

### Pantallas
- `src/screens/AreaDetailScreen.js` - Detalle de area con lista de observaciones y formulario inline
- `src/screens/ObservationFormScreen.js` - Formulario dedicado para crear/editar observaciones
- `src/screens/ProfileScreen.js` - Ver/editar perfil (nombre, apellido, telefono)
- `src/screens/SettingsScreen.js` - Configuracion, estado de conexion, logout

### Componentes
- `src/components/ErrorBoundary.js` - Clase React que captura errores de render y muestra UI de recuperacion

### Tests
- `src/__tests__/ErrorBoundary.test.js` - 4 tests: estado inicial, getDerivedStateFromError, render children, render error UI
- `src/__tests__/areaDetail.test.js` - 3 tests: exports de repositorios (areas, observations, photos)

## Cambios en archivos existentes

### App.js
- Agregadas 4 pantallas nuevas: AreaDetail, ObservationForm, Profile, Settings
- Agregado `<ErrorBoundary>` como wrapper de toda la app

### HomeScreen.js
- Agregados botones de navegacion: Perfil, Config, Salir en el header
- Logout con confirmacion

### ExecutionScreen.js
- Tap en area navega a `AreaDetailScreen` (antes solo seleccionaba)

## Navegacion actual

```
Login
Home
├── InspectionDetail
│   └── Execution
│       ├── PhotoCapture
│       └── AreaDetail
├── CreateInspection
├── Profile
├── Settings
│   └── OfflineStatus
└── ConflictResolution
```

## Tests

| Suite | Tests | Estado |
|-------|-------|--------|
| config.test.js | 4 | PASS |
| uuid.test.js | 2 | PASS |
| api.test.js | 7 | PASS |
| database-repos.test.js | 24 | PASS |
| syncEngine.test.js | 7 | PASS |
| areaDetail.test.js | 3 | PASS |
| ErrorBoundary.test.js | 4 | PASS |
| offlineQueue.test.js | 4/8 | PRE-EXISTING FAILURES |
| **Total** | **54/58** | |

## Para hacer build

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Build de desarrollo (APK)
cd mobile
eas build --platform android --profile development

# Build de preview (APK)
eas build --platform android --profile preview

# Build de produccion (AAB para Play Store)
eas build --platform android --profile production
```

## Notas

- Los assets (icon.png, splash.png, etc.) necesitan ser creados con imagenes reales
- Ver `mobile/assets/README.md` para especificaciones
- Los 4 tests fallidos en offlineQueue son pre-existentes (no causados por estos cambios)
