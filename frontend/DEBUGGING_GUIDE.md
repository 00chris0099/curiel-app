# 🔧 GUÍA DE DEBUGGING - CURIEL FRONTEND

## 📊 ESTADO ACTUAL

✅ **Servidor Backend**: Funcionando en http://localhost:4000
✅ **Servidor Vite**: Funcionando en http://localhost:5173
✅ **React básico**: Funciona (probado con mensaje de prueba)
❌ **Aplicación completa**: Pantalla en blanco

---

## 🔍 PASOS PARA IDENTIFICAR EL ERROR

### 1. Abre la Consola del Navegador
- Presiona `F12`
- Ve a la pestaña **Console**

### 2. Busca el Error
Deberías ver mensajes como:

```
🚀 Iniciando CURIEL Frontend...
✅ Elemento #root encontrado
✅ App renderizada correctamente
```

**Si hay un ERROR**, aparecerá en ROJO. Ejemplos comunes:

```
❌ Error: Cannot read property 'x' of undefined
❌ Error: Module not found
❌ Error: Invalid hook call
❌ Error: Objects are not valid as a React child
```

### 3. Copia el Error Completo
Incluye:
- El mensaje principal en rojo
- El stack trace (las líneas que dicen "at ...")
- El archivo donde ocurre (ej: "at Login.tsx:25")

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### Error: "Invalid hook call"
**Causa**: Versiones incompatibles de React o múltiples copias de React
**Solución**: 
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Error: "Cannot read property of undefined"
**Causa**: Algún store (Zustand) o componente intenta acceder a datos que no existen
**Solución**: Revisar authStore.ts y themeStore.ts

### Error: "Module not found"
**Causa**: Import de un archivo que no existe
**Solución**: Verificar que todos los archivos existan

### Error: "Objects are not valid as a React child"
**Causa**: Intentar renderizar un objeto directamente en JSX
**Solución**: Convertir objeto a string o usar propiedades específicas

---

## 📋 CHECKLIST DE ARCHIVOS REQUERIDOS

Verifica que existan estos archivos:

```
frontend/src/
├── api/
│   └── axios.ts ✓
├── auth/
│   └── PrivateRoute.tsx ✓
├── components/
│   ├── Loader.tsx ✓
│   ├── Navbar.tsx ✓
│   └── Sidebar.tsx ✓
├── pages/
│   ├── Login.tsx ✓
│   ├── Dashboard.tsx ✓
│   ├── Profile.tsx ✓
│   ├── Inspections.tsx ✓
│   └── CreateInspection.tsx ✓
├── services/
│   ├── auth.service.ts ✓
│   ├── inspection.service.ts ✓
│   └── user.service.ts ✓
├── store/
│   ├── authStore.ts ✓
│   └── themeStore.ts ✓
├── App.tsx ✓
├── main.tsx ✓
└── index.css ✓
```

---

## 🚀 SIGUIENTE PASO

**Abre la consola del navegador (F12) y copia EXACTAMENTE el error que ves en rojo.**

Con esa información podré identificar y arreglar el problema específico.

---

_Última actualización: 17 de febrero de 2026_
