# Fase 1: Seguridad Inmediata - Acciones Manuales

> Estos pasos deben realizarse **despues** de ejecutar los cambios automaticos.
> Los archivos del repositorio ya fueron actualizados.

---

## Paso 1: Actualizar JWT_SECRET en backend `.env`

**Archivo:** `backend_legacy/.env` (linea 20)

Reemplaza el valor actual por el nuevo secret generado:

```
JWT_SECRET=835fd1d56b2d0df4ebd3640d83c8b167a1d96e096d63f125f984009704b68836a439ee4fe601550a7579fa10866582c0e7e3e9719ccdd6abe7712eece4fa13be
```

**IMPORTANTE:** Al cambiar el JWT_SECRET, todas las sesiones activas se invalidaran. Los usuarios deberan volver a iniciar sesion.

---

## Paso 2: Actualizar N8N_SECRET_TOKEN en backend `.env`

**Archivo:** `backend_legacy/.env` (linea 43)

Reemplaza el valor actual por el nuevo token:

```
N8N_SECRET_TOKEN=a8ac2b2dd207b9cbd4bbbb2169c2a755df36d3bb59ae05761ec657b427d850da
```

---

## Paso 3: Actualizar N8N_SECRET_TOKEN en n8n

1. Abrir el dashboard de n8n: `https://aimachristian-n8n.ajcxjb.easypanel.host`
2. Ir a **Settings** > **Variables**
3. Buscar la variable `CURIEL_SECRET_TOKEN`
4. Actualizarla con el nuevo valor: `a8ac2b2dd207b9cbd4bbbb2169c2a755df36d3bb59ae05761ec657b427d850da`
5. Guardar
6. **Reactivar** todos los workflows que usan este token (inspection-completed, inspection-assigned, user-notification, evaluation-notification)

---

## Paso 3b: Configurar INTERNAL_API_KEY en n8n

1. En el dashboard de n8n, ir a **Settings** > **Variables**
2. Crear una nueva variable:
   - **Nombre:** `INTERNAL_API_KEY`
   - **Valor:** `b9b7d36d694e4d071484c757b7ac536229e451e93dfbe9196dc252641a80ac61`
3. Guardar
4. Ir a **Settings** > **Credentials** > **New** > **Header Auth**
5. Configurar:
   - **Name:** `CURIEL API`
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer <tu-admin-jwt-token>` (obtener del paso 1)
6. Guardar
7. **Actualizar** los workflows cron (reminder-pending, overdue-inspections) y reconectar el credential "CURIEL API"

---

## Paso 4: Actualizar JWT_SECRET en EasyPanel

1. Abrir el panel de EasyPanel
2. Ir al servicio **backend** (App desde Git)
3. Ir a **Environment** variables
4. Buscar `JWT_SECRET` y actualizarlo con el nuevo valor
5. **Reiniciar** el servicio backend

---

## Paso 5: Actualizar N8N_SECRET_TOKEN en EasyPanel

1. En el mismo servicio backend de EasyPanel
2. Buscar `N8N_SECRET_TOKEN` y actualizarlo con el nuevo valor
3. Reiniciar el servicio si no se reinicio en el paso anterior

---

## Paso 5b: Agregar INTERNAL_API_KEY al backend

1. En `backend_legacy/.env`, agregar la linea:
   ```
   INTERNAL_API_KEY=b9b7d36d694e4d071484c757b7ac536229e451e93dfbe9196dc252641a80ac61
   ```
2. En EasyPanel (servicio backend), agregar la variable:
   - **Key:** `INTERNAL_API_KEY`
   - **Value:** `b9b7d36d694e4d071484c757b7ac536229e451e93dfbe9196dc252641a80ac61`
3. Reiniciar el servicio backend

---

## Paso 6: Rotar password de PostgreSQL

**Servidor:** `187.77.57.116`

Conectarse al servidor PostgreSQL y cambiar los passwords de las 7 bases de datos:

```sql
-- Conectar a cada base de datos y ejecutar:
ALTER USER postgres WITH PASSWORD 'NUEVO_PASSWORD_SEGURO';
```

Las 7 bases de datos estan en los puertos: 5434, 5435, 5436, 5437, 5438, 5439, 5440.

Despues de cambiar los passwords, actualizar todas las `DATABASE_URL_*` en:
- `backend_legacy/.env` (7 variables)
- EasyPanel environment variables del servicio backend (7 variables)

**NOTA:** Si usas el mismo password para todas las DBs (como ahora), solo necesitas cambiarlo una vez y actualizar las 7 URLs.

---

## Paso 7: Rotar API keys de Cloudinary

1. Ir a `https://cloudinary.com/dashboard`
2. Ir a **Settings** > **API Keys**
3. **Eliminar** la key actual (`685545879864171`)
4. **Crear** una nueva key
5. Copiar el nuevo: Cloud Name, API Key, y API Secret
6. Actualizar en `backend_legacy/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=nuevo_cloud_name
   CLOUDINARY_API_KEY=nueva_api_key
   CLOUDINARY_API_SECRET=nuevo_api_secret
   ```
7. Actualizar en EasyPanel environment variables

**IMPORTANTE:** Al rotar las keys de Cloudinary, las fotos existentes seguiran accesibles pero no se podran subir fotos nuevas hasta actualizar la config.

---

## Paso 8: Cambiar password de Grafana

**Archivo:** `monitoring/docker-compose.yml` (linea 41)

Reemplazar `CAMBIAR_PASSWORD_GRAFANA` por un password seguro:

```yaml
GF_SECURITY_ADMIN_PASSWORD: TuPasswordSeguro2026!
```

---

## Paso 9: Regenerar .htpasswd (opcional)

Si quieres cambiar el password de acceso al monitoring:

```bash
# Instalar htpasswd (si no lo tienes)
# En Ubuntu/Debian:
sudo apt install apache2-utils

# Generar nuevo hash:
htpasswd -nb curiel "NuevoPasswordSeguro"

# Copiar la salida y reemplazar en monitoring/.htpasswd
```

Credenciales actuales:
- Usuario: `curiel`
- Password: `CurielMonitor2026!`

---

## Paso 10: Verificar que DATABASE_SSL funciona

Despues de habilitar `DATABASE_SSL=true` en produccion:

1. Reiniciar el servicio backend en EasyPanel
2. Verificar que la app funciona (login, listar inspecciones, etc.)
3. Si hay errores de conexion a BD, puede ser que el servidor PostgreSQL no tenga SSL habilitado

**Si el servidor PostgreSQL no soporta SSL:**
- Cambiar `DATABASE_SSL=false` en EasyPanel
- O habilitar SSL en el servidor PostgreSQL (requiere configuracion del lado del servidor)

---

## Paso 11: Verificar HSTS

1. Abrir el frontend en produccion (`https://aimachristian-curielapp.ajcxjb.easypanel.host`)
2. Abrir DevTools (F12) > pestaña **Network**
3. Hacer una peticion (recargar la pagina)
4. En los headers de respuesta, verificar que aparezca:
   ```
   strict-transport-security: max-age=31536000; includeSubDomains
   ```
5. Si no aparece, puede ser que EasyPanel no este pasando los headers de nginx

---

## Paso 12: Verificar monitoring

1. Abrir `http://localhost:9090` (o la IP del servidor)
2. Deberia pedir usuario y password
3. Ingresar: `curiel` / `CurielMonitor2026!`
4. Verificar que Prometheus carga correctamente
5. Abrir `http://localhost:3001` (Grafana)
6. Ingresar: `admin` / `TuPasswordSeguro2026!`
7. Verificar que el dashboard de CURIEL muestra datos

---

## Resumen de Credenciales Actualizadas

| Servicio | Variable | Ubicacion |
|----------|----------|-----------|
| Backend JWT | `JWT_SECRET` | `backend_legacy/.env` + EasyPanel |
| n8n Secret | `N8N_SECRET_TOKEN` | `backend_legacy/.env` + n8n Variables + EasyPanel |
| PostgreSQL | `DATABASE_URL_*` (7 vars) | `backend_legacy/.env` + EasyPanel |
| Cloudinary | `CLOUDINARY_*` (3 vars) | `backend_legacy/.env` + EasyPanel |
| Grafana | `GF_SECURITY_ADMIN_PASSWORD` | `monitoring/docker-compose.yml` |
| Monitoring Auth | `monitoring/.htpasswd` | `monitoring/.htpasswd` |

---

## Checklist de Verificacion

- [ ] JWT_SECRET actualizado en `.env` y EasyPanel
- [ ] N8N_SECRET_TOKEN actualizado en `.env`, EasyPanel, y n8n
- [ ] Todas las sesiones anteriores invalidadas (usuarios deben re-login)
- [ ] Password de PostgreSQL rotado en las 7 DBs
- [ ] DATABASE_URL_* actualizadas en `.env` y EasyPanel
- [ ] Cloudinary keys rotadas en dashboard
- [ ] CLOUDINARY_* actualizadas en `.env` y EasyPanel
- [ ] Password de Grafana cambiado
- [ ] Monitoring accesible con basic auth
- [ ] HSTS header visible en respuestas del frontend
- [ ] App funciona correctamente despues de todos los cambios
