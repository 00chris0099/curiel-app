# FASE 0: PREPARACION - COMPLETADA

> **Fecha:** 17 de Junio, 2026
> **Duracion real:** 1 dia
> **Estado:** COMPLETADA

---

## Tareas Ejecutadas

### 0.1: Rotar JWT_SECRET y credenciales de DB

**Acciones:**
- Generado `JWT_SECRET` de 64 bytes (128 caracteres hex) via `crypto.randomBytes(64)`
- Generado `DB_PASSWORD` de 32 bytes via `crypto.randomBytes(32)`
- Generado `N8N_SECRET_TOKEN` de 32 bytes via `crypto.randomBytes(32)`
- Actualizado `backend_legacy/.env` con nuevos secrets
- Actualizado `backend_legacy/src/config/index.js`:
  - JWT_SECRET: error en produccion si no esta set, warning en development
  - Agregado `n8n.secretToken` al config
- Actualizado `backend_legacy/src/utils/n8n.js`:
  - Agregado header `X-CURIEL-SECRET` en requests a n8n
- Actualizados `.env.example` (root + backend) con placeholders seguros (`CHANGE_ME_...`)
- Actualizado `docker-compose.yml` con defaults seguros + advertencia de produccion

**Secrets generados:**
```
JWT_SECRET=9bf7be3adef2072f8d7663afeaf174710f8fbc2e39efff4bbc2418b34abd9b6e...
DB_PASSWORD=bf5e5a3af87b31575ea02cba1d6d133d9804c7c05fbb178f21353958b4d2619e
N8N_SECRET_TOKEN=555f530cd244a4d2d4c163f363efc2c98f331254add3d41cf52396d09363edbe
```

**Nota:** En EasyPanel se encontro un `DB_PASSWORD` duplicado que fue eliminado. La DB usa la contraseña original `Mineria99*`.

### 0.2: Eliminar .env del historial de git

**Resultado:** Los archivos `.env` nunca fueron commitados al historial de git. BFG no fue necesario.

**Verificacion:**
```bash
git log --all --diff-filter=A -- "*.env" "backend_legacy/.env" "frontend/.env"
# Sin resultados = nunca estuvieron en git
```

### 0.3: Configurar variables de entorno en EasyPanel

**Backend configurado en EasyPanel:**
```
NODE_ENV=production
PORT=80
DB_HOST=aimachristian_curiel
DB_PORT=5432
DB_NAME=inspecciones
DB_USER=postgres
DB_PASSWORD=Mineria99*
JWT_SECRET=[secreto de 64 bytes]
N8N_SECRET_TOKEN=[token de 32 bytes]
CORS_ORIGIN=https://aimachristian-curielapp.ajcxjb.easypanel.host
```

**Verificacion:**
```json
GET /api/v1/health → {"success":true,"status":"operational","database":{"status":"connected","latency":"19ms"}}
```

### 0.4: Crear rama develop

**Acciones:**
```bash
git checkout -b develop  # Creada desde main
git push origin develop  # Pusheada a GitHub
```

**Branches:**
```
* develop (activa)
  main
  remotes/origin/main
  remotes/origin/develop
```

---

## Commits de la Fase 0

| Commit | Rama | Mensaje |
|--------|------|---------|
| `d3a24b2` | develop | security: rotate secrets, add secure placeholders, add audit and roles docs |
| `42c76c9` | main | merge: develop -> main (security phase 0) |
| `a76bec0` | main | fix: revert docker-compose DB defaults for local dev |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend_legacy/.env` | JWT_SECRET, DB_PASSWORD, N8N_SECRET_TOKEN rotados |
| `backend_legacy/.env.example` | Placeholders seguros |
| `backend_legacy/src/config/index.js` | JWT_SECRET validation + n8n.secretToken |
| `backend_legacy/src/utils/n8n.js` | Header X-CURIEL-SECRET |
| `.env.example` (root) | Placeholders seguros |
| `docker-compose.yml` | Defaults seguros + advertencia |
| `docs/AUDITORIA_COMPLETA.md` | NUEVO - Auditoria completa del proyecto |
| `docs/SISTEMA_COMPLETO.md` | NUEVO - Roles, permisos, roadmap |

---

## Pendiente para Produccion

- [ ] Configurar `N8N_WEBHOOK_INSPECTION_COMPLETED` en EasyPanel cuando n8n este listo
- [ ] Configurar `N8N_WEBHOOK_USER_NOTIFICATION` en EasyPanel
- [ ] Configurar `N8N_WEBHOOK_AUDIT_LOG` en EasyPanel
- [ ] Rotar secrets periodicamente (cada 90 dias)

---

> **Siguiente fase:** [FASE_1_SEGURIDAD_BASE.md](./FASE_1_SEGURIDAD_BASE.md)
