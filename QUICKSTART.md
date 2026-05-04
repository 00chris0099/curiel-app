# ⚡ QUICK START - CURIEL

## 🚀 Inicio Rápido (10 minutos)

Esta guía te permite tener CURIEL funcionando en menos de 10 minutos.

### Requisitos
- Node.js 18+ instalado
- PostgreSQL instalado y corriendo
- Un celular con Expo Go o un emulador

---

## 📦 Paso 1: Clonar o Copiar

```powershell
# Si tienes el código ya en tu máquina:
cd C:\Users\chris\OneDrive\Escritorio\Antigravity\CURIEL
```

---

## 🗄️ Paso 2: Base de Datos (2 minutos)

```powershell
# Conectar a PostgreSQL
psql -U postgres

# En PostgreSQL, ejecutar:
CREATE DATABASE curiel_db;
\q
```

---

## ⚙️ Paso 3: Backend (3 minutos)

```powershell
# Ir a backend
cd backend

# Instalar
npm install

# Configurar .env
Copy-Item .env.example .env

# Editar .env (SOLO ESTAS LÍNEAS por ahora):
# DB_PASSWORD=tu_password_postgres
# JWT_SECRET=cualquier_texto_aleatorio_largo

# Migrar base de datos
npm run migrate

# Cargar datos de prueba
npm run seed

# Iniciar backend
npm run dev
```

✅ Deberías ver: "🚀 CURIEL API Server - Puerto: 4000"

---

## 📱 Paso 4: Mobile (3 minutos)

**Abrir nueva terminal** (dejar el backend corriendo)

```powershell
# Ir a mobile
cd mobile

# Instalar
npm install

# Iniciar Expo
npm start
```

### En tu celular:

1. Instalar **Expo Go** desde tu tienda de apps
2. Escanear el código QR que aparece en la terminal
3. Esperar a que cargue

---

## 🎉 Paso 5: Probar

En la app móvil, haz login con el usuario admin generado por el seed:

**Email:** `admin@curiel.com`  
**Password:** `admin123`

Deberías ver:
- Dashboard con estadísticas
- Lista de inspecciones (vacía por ahora)

---

## 🐛 Problemas Comunes

### "Cannot connect to database"
```powershell
# Verificar que PostgreSQL esté corriendo
# En Windows: buscar "Services" y revisar PostgreSQL
```

### "Port 4000 already in use"
```powershell
# Cambiar puerto en backend/.env
PORT=4001
```

### Mobile no conecta
```powershell
# En mobile/src/config/index.js, cambiar:
API_URL: 'http://TU_IP:4000/api/v1'

# Para encontrar tu IP:
ipconfig
# Buscar "Dirección IPv4" (ej: 192.168.1.100)
```

---

## 📚 Próximos Pasos

1. Lee `INSTALL.md` para configuración completa
2. Revisa `docs/IMPLEMENTATION_PLAN.md` para el roadmap
3. Consulta `docs/ARCHITECTURE.md` para entender el sistema

---

## 🆘 Ayuda

Si algo no funciona:

1. Verifica que PostgreSQL esté corriendo
2. Revisa los logs del backend (primera terminal)
3. Revisa los logs de Expo (segunda terminal)
4. Confirma que ambos servicios estén en la misma red

---

**¡Listo! Ahora tienes CURIEL corriendo localmente. 🎊**

Para uso en producción, sigue la guía completa en `INSTALL.md`.
