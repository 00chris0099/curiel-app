# ☑️ CHECKLIST DE VERIFICACIÓN - CURIEL

Usa este checklist para verificar que todo esté funcionando correctamente.

## 📦 INSTALACIÓN

### Backend
- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `curiel_db` creada
- [ ] `backend/node_modules` instalado
- [ ] `backend/.env` configurado (copiado de .env.example)
- [ ] Variables DB_PASSWORD y JWT_SECRET configuradas
- [ ] Migraciones ejecutadas (`npm run migrate`)
- [ ] Seed ejecutado (`npm run seed`)
- [ ] Servidor inicia sin errores (`npm run dev`)
- [ ] Ver mensaje: "🚀 CURIEL API Server - Puerto: 4000"
- [ ] Endpoint `/api/v1/health` responde

### Mobile
- [ ] `mobile/node_modules` instalado
- [ ] Expo inicia sin errores (`npm start`)
- [ ] Código QR visible en terminal
- [ ] Expo Go instalado en celular
- [ ] App carga en Expo Go

---

## 🧪 TESTING FUNCIONAL

### Backend API

#### Health Check
- [ ] GET http://localhost:4000/api/v1/health
- [ ] Responde 200 OK
- [ ] JSON: `{ "success": true, "message": "API funcionando" }`

#### Login
- [ ] POST http://localhost:4000/api/v1/auth/login
- [ ] Body: `{ "email": "admin@curiel.com", "password": "admin123" }`
- [ ] Responde 200 OK
- [ ] Retorna token JWT
- [ ] Retorna datos de usuario

#### Inspecciones
- [ ] GET http://localhost:4000/api/v1/inspections
- [ ] Header: `Authorization: Bearer TOKEN`
- [ ] Responde 200 OK
- [ ] Retorna array (vacío inicialmente)

---

### Mobile App

#### Login
- [ ] Pantalla de login se muestra correctamente
- [ ] Logo "CURIEL" visible
- [ ] Campos de email y password funcionan
- [ ] Botón "Iniciar Sesión" funcional
- [ ] Login con credenciales de un usuario válido (admin o el que crees mediante API)
- [ ] Mensaje de error si credenciales incorrectas

#### Home/Dashboard
- [ ] Dashboard se muestra después de login
- [ ] Header muestra el nombre del usuario
- [ ] Rol mostrado correctamente
- [ ] Stats cards visibles (Total, Pendientes, En Proceso, Finalizadas)
- [ ] Lista de inspecciones carga
- [ ] Pull to refresh funciona
- [ ] Mensaje "No hay inspecciones" si está vacío

---

## 🔐 SEGURIDAD

### Backend
- [ ] Endpoints protegidos requieren token JWT
- [ ] Token inválido retorna 401
- [ ] Token expirado retorna 401
- [ ] Inspector no puede ver inspecciones de otros
- [ ] Solo Admin puede crear usuarios
- [ ] Solo Admin puede eliminar inspecciones
- [ ] Contraseñas hasheadas en DB (no texto plano)
- [ ] Rate limiting funciona (muchas requests = error 429)

### Mobile
- [ ] Sesión persiste al cerrar/abrir app
- [ ] Logout limpia AsyncStorage
- [ ] Token se agrega automáticamente en requests
- [ ] Error 401 cierra sesión automáticamente

---

## 📊 BASE DE DATOS

### Tablas Creadas
- [ ] `users` existe
- [ ] `inspections` existe
- [ ] `checklist_templates` existe
- [ ] `checklist_items` existe
- [ ] `inspection_responses` existe
- [ ] `photos` existe
- [ ] `signatures` existe
- [ ] `audit_logs` existe

### Datos Seed
- [ ] 1 usuario admin creado (o verificado)
- [ ] 3 plantillas de checklist creadas
- [ ] 16 ítems de checklist creados
- [ ] Login funciona con usuario admin

Verificar con:
```sql
-- Conectar a PostgreSQL
psql -U postgres -d curiel_db

-- Verificar usuarios
SELECT id, email, role FROM users;

-- Verificar templates
SELECT id, name, "inspectionType" FROM checklist_templates;

-- Verificar items
SELECT COUNT(*) FROM checklist_items;
```

---

## 🔄 ROLES Y PERMISOS

### Admin (admin@curiel.com)
- [ ] Puede crear usuarios
- [ ] Puede crear inspecciones
- [ ] Puede ver todas las inspecciones
- [ ] Puede eliminar inspecciones
- [ ] Puede finalizar cualquier inspección

### Arquitecto
- [ ] Puede crear inspecciones
- [ ] Puede ver todas las inspecciones
- [ ] NO puede crear usuarios
- [ ] NO puede eliminar inspecciones
- [ ] Puede finalizar inspecciones

### Inspector
- [ ] SOLO ve sus inspecciones asignadas
- [ ] NO puede crear inspecciones
- [ ] NO puede crear usuarios
- [ ] Puede actualizar sus inspecciones
- [ ] Puede finalizar sus inspecciones

---

## 📝 AUDIT LOGS

- [ ] Login crea audit log
- [ ] Crear inspección crea audit log
- [ ] Actualizar inspección crea audit log
- [ ] Finalizar inspección crea audit log
- [ ] Logs incluyen userId, action, timestamps

Verificar:
```sql
SELECT "userId", action, "entityType", "createdAt" 
FROM audit_logs 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## 🌐 INTEGRACIÓN N8N (Opcional)

Si configuraste n8n:

- [ ] n8n corriendo en http://localhost:5678
- [ ] Workflow de inspección completada creado
- [ ] Webhook URL copiada a backend/.env
- [ ] Al completar inspección, webhook se dispara
- [ ] Email se envía (si SMTP configurado)

---

## 📱 MOBILE - NAVEGACIÓN

- [ ] Login → Home funciona
- [ ] Logout → Login funciona
- [ ] Tap en inspección navega a detalle (cuando esté implementado)
- [ ] Back button funciona
- [ ] Navegación sin crashes

---

## 🎨 UI/UX

### Mobile
- [ ] Diseño profesional y limpio
- [ ] Colores corporativos (azul oscuro #1a237e)
- [ ] Tipografía legible
- [ ] Espaciado correcto
- [ ] Botones tienen feedback visual
- [ ] Loading spinners se muestran cuando cargan datos
- [ ] Errores se muestran con Alerts
- [ ] Responsive en diferentes tamaños de pantalla

---

## 🐛 TESTING DE ERRORES

### Backend
- [ ] Endpoint inexistente retorna 404
- [ ] Datos inválidos retornan 400
- [ ] Sin token retorna 401
- [ ] Sin permisos retorna 403
- [ ] Error servidor retorna 500
- [ ] Mensajes de error descriptivos

### Mobile
- [ ] Error de red se maneja correctamente
- [ ] Timeout se maneja correctamente
- [ ] App no crashea con datos inválidos
- [ ] Mensajes de error user-friendly

---

## 📚 DOCUMENTACIÓN

- [ ] README.md existe y es claro
- [ ] QUICKSTART.md existe
- [ ] INSTALL.md existe con pasos detallados
- [ ] ARCHITECTURE.md documenta el sistema
- [ ] IMPLEMENTATION_PLAN.md tiene el roadmap
- [ ] PROJECT_STRUCTURE.md muestra estructura
- [ ] EXECUTIVE_SUMMARY.md resume todo
- [ ] Todos los archivos .md tienen formato correcto

---

## 🚀 PERFORMANCE

### Backend
- [ ] Requests responden en < 500ms
- [ ] No hay memory leaks visibles
- [ ] Conexiones a DB se cierran correctamente
- [ ] Logs no saturan la consola

### Mobile
- [ ] App carga rápido
- [ ] Navegación fluida sin lag
- [ ] Imágenes se cargan progresivamente
- [ ] No hay warnings en consola importantes

---

## ✅ CHECKLIST FINAL PRE-DESARROLLO

Antes de empezar a codear nuevas features:

- [ ] Todo lo anterior funciona ✅
- [ ] Git inicializado (`git init`)
- [ ] Primer commit hecho
- [ ] `.gitignore` configurado
- [ ] Backend corriendo estable
- [ ] Mobile corriendo estable
- [ ] Documentación leída
- [ ] Plan de desarrollo claro (IMPLEMENTATION_PLAN.md)
- [ ] Credenciales de prueba funcionando
- [ ] Cloudinary account creada (para fotos)
- [ ] Postman instalado (para testing de API)

---

## 📊 MÉTRICAS DE ÉXITO

### MVP Completo (100%)
- [ ] Login funcional ✅
- [ ] Dashboard con stats ✅
- [ ] Lista de inspecciones ✅
- [ ] Crear inspección
- [ ] Ver detalle de inspección
- [ ] Realizar inspección (checklist)
- [ ] Tomar fotos
- [ ] Firmar digitalmente
- [ ] Generar PDF
- [ ] Enviar email automático
- [ ] Audit logs completos ✅

**Progreso actual:** 60% ✅

---

## 🎯 SIGUIENTE PASO

Una vez que todo este checklist esté ✅, procede a:

1. **Leer** `docs/IMPLEMENTATION_PLAN.md`
2. **Crear** cuenta en Cloudinary
3. **Implementar** upload de fotos (backend)
4. **Crear** CameraScreen (mobile)
5. **Implementar** generación de PDFs
6. **Continuar** con el roadmap

---

**¡Si todo está ✅, estás listo para desarrollar! 🚀**
