# 🗄️ Guía: Migrar CURIEL a UNA sola base de datos (Supabase)

Este proyecto ya no necesita 7 bases de datos. Ahora usa **una sola base** y
todos los módulos (auth, inspecciones, media, admin, notificaciones, alertas,
auditoría) comparten las mismas tablas.

> **Qué necesitas al terminar esta guía:**
> - Un proyecto en [Supabase](https://supabase.com) con las 29 tablas + seed
> - La connection string `DATABASE_URL` configurada en tu VPS (Easypanel)
> - Login con `admin@curiel.com` / `Admin123*`

**Tiempo estimado: 15–20 minutos.** No necesitas tocar nada del código.

---

## ✅ Paso 1 — Crear el proyecto en Supabase

1. Entra a **[supabase.com](https://supabase.com)** e inicia sesión (puedes
   entrar con tu cuenta de GitHub).

2. Haz clic en **"New project"** (botón verde, arriba a la derecha).

   > [📸 Captura aquí: la pantalla principal del dashboard con el botón "New project"]()

3. Completa el formulario **"Create a new project"**:

   | Campo | Qué poner |
   |---|---|
   | **Organization** | Tu organización (o "Personal" si no tienes) |
   | **Project name** | `curiel` (o el nombre que prefieras) |
   | **Database Password** | Una contraseña fuerte (mín. 12 caracteres). **Guárdala**, la necesitas en el paso 5 |
   | **Region** | `South America (São Paulo)` — la más cercana a Perú |
   | **Pricing plan** | **Free** es suficiente para empezar |

   > [📸 Captura aquí: el formulario "Create a new project" ya lleno]()
   >
   > ⚠️ **Importante:** guarda la contraseña en un gestor. Si la pierdes,
   > tendrás que resetearla en `Settings → Database → Reset password`.

4. Haz clic en **"Create new project"**. Supabase tarda **1–3 minutos** en
   aprovisionar la base. Verás una pantalla con animaciones de "building".

   > [📸 Captura aquí: la pantalla de aprovisionamiento "Building your project"]()
   >
   > ⚠️ **No cierres la pestaña** mientras se crea. Verás el botón
   > "Launch Supabase" cuando esté lista.

---

## ✅ Paso 2 — Crear las tablas (elige UNA opción)

Tienes **dos formas**: el script completo o los 5 scripts por partes. Si el
SQL Editor te da el error de la extensión del navegador con el archivo
completo, usa la **Opción B** (scripts cortos) o `psql` (al final de esta
sección).

### Opción A — Script completo (una sola vez)

1. Abre el archivo del proyecto:
   ```
   backend_legacy/supabase/setup.sql
   ```
   y **copia todo su contenido** (Ctrl+A → Ctrl+C). Son ~850 líneas.

2. En Supabase, abre el menú de la izquierda y haz clic en **"SQL Editor"**
   (icono de `>_`).

   > [📸 Captura aquí: el menú lateral con "SQL Editor" resaltado]()

3. Haz clic en **"New query"** (o **"+ New"**) para abrir el editor.

   > [📸 Captura aquí: la pantalla del SQL Editor con el botón "New query"]()
   >
   > Consejo: por defecto se abre una query de ejemplo ("select now()").
   > Bórrala o crea una query nueva.

4. **Pega el contenido** de `setup.sql` en el editor (Ctrl+V).

   > [📸 Captura aquí: el editor con el SQL ya pegado]()
   >
   > 💡 La primera línea que verás será:
   > `-- CURIEL - Esquema UNIFICADO (una sola base de datos / Supabase)`

5. Haz clic en **"Run"** (botón azul, abajo a la derecha del editor).

   > [📸 Captura aquí: el editor con el botón "Run"]()

6. **Aparecerá un aviso de seguridad** (en español):

   > *"Esta consulta crea tablas sin habilitar la seguridad a nivel de fila
   > (RLS)... Elija si desea habilitar la seguridad a nivel de fila antes de
   > ejecutar esta consulta."*

   ➡️ **Haz clic en "Ejecutar sin RLS".**

   > [📸 Captura aquí: el aviso de RLS con la opción "Ejecutar sin RLS"]()
   >
   > **¿Por qué?** El RLS (Row Level Security) solo afecta a clientes que se
   > conectan con las *API Keys* de Supabase (anon/authenticated). Tu backend
   > se conecta con el usuario `postgres` mediante la connection string, y ese
   > rol **ignora el RLS por completo**. Habilitarlo no le daría ningún
   > beneficio a la app y podría bloquear accesos futuros por claves anónimas.
   > Por eso la opción correcta aquí es **sin RLS**.

7. El script se ejecuta. Tarda unos segundos. Al terminar verás:
   `Success. No rows returned` (o mensaje verde similar).

### Opción B — 5 scripts pequeños (recomendada si falla el editor)

En la carpeta **`backend_legacy/supabase/partes/`** hay **5 scripts cortos**
(entre 70 y 443 líneas cada uno), **probados**: se ejecutan sin errores y son
**idempotentes** (re-ejecutarlos no rompe nada ni duplica datos).

Cópialos y pégalos **en orden**, uno por uno (misma mecánica: SQL Editor →
New query → pegar → Run):

| # | Archivo | Qué crea |
|---|---|---|
| 1 | `01-enums.sql` | Extensión uuid + 14 tipos enum |
| 2 | `02-tablas.sql` | Las **29 tablas** |
| 3 | `03-indices.sql` | Los índices (uniqueness y búsquedas) |
| 4 | `04-llaves-foraneas.sql` | Las relaciones entre tablas (FK) |
| 5 | `05-seed.sql` | Datos iniciales: 4 roles + admin + consideración por defecto |

> ⚠️ **Debes correrlos en ese orden**: primero los enums, luego las tablas
> (que los usan), después índices y llaves foráneas, y al final el seed.
>
> El aviso de RLS aparecerá al ejecutar `02-tablas.sql` → elige siempre
> **"Ejecutar sin RLS"** (explicado arriba).
>
> Si alguno falla a mitad, no pasa nada: corrige lo que sea y **vuelve a
> ejecutar ese mismo archivo** — es idempotente.

Si el editor de Supabase te sigue fallando con cualquiera de los dos,
**ejecuta los 5 desde tu PC con `psql`** (más abajo) — no depende del navegador.

6. **Verifica que funcionó**: en la misma pantalla, abre el menú lateral
   **"Table Editor"** → deberías ver **29 tablas** como: `users`, `roles`,
   `inspections`, `areas`, `photos`, `observations`, `admin_settings`, etc.

   > [📸 Captura aquí: el Table Editor mostrando la lista de tablas]()

   > ✅ **El seed ya quedó aplicado** (lo hace el mismo script):
   > - 4 roles: `admin`, `supervisor`, `arquitecto`, `inspector`
   > - Usuario admin: `admin@curiel.com` / `Admin123*`
   > - La consideración por defecto de inspecciones

---

## ✅ Paso 3 — Obtener la connection string

Ahora necesitas la URL de conexión que pondrás en el VPS.

1. En el menú lateral, ve a **"Project Settings"** (icono de engranaje ⚙️,
   abajo a la izquierda).

   > [📸 Captura aquí: el menú lateral con "Project Settings" resaltado]()

2. Entra a **"Database"**.

   > [📸 Captura aquí: Project Settings → Database]()

3. Baja hasta **"Connection string"** y selecciona la pestaña
   **"Transaction"** (es la que usa el pooler de Supabase — la recomendada
   para esta app). Luego elige **"URI"**.

   > 💡 **Nota:** la pestaña "Direct connection" (puerto 5432, host
   > `db.<ref>.supabase.co`) solo la usarás si ejecutas `setup.sql` con
   > `psql` desde tu PC (ver sección "Si el SQL Editor falla"); para la app
   > usa siempre el pooler de "Transaction".

   > [📸 Captura aquí: Connection string → pestaña "Transaction" → formato "URI"]()
   >
   > La URL se ve así (el `[YOUR-PASSWORD]` es el tuyo):
   > ```
   > postgresql://postgres.XXXXXXXXXXXXXX:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   > ```

4. Haz clic en el icono de **copiar** 📋 para copiarla.

5. **Pega la URL en un bloc de notas** y haz dos ajustes:

   a. **Reemplaza `[YOUR-PASSWORD]` por la contraseña real** que pusiste en el
      Paso 1. ⚠️ Si tu contraseña tiene caracteres especiales (`@`, `:`, `/`,
      `#`, `!`…), deben estar **codificados** en la URL. Los más comunes:

      | Carácter | Código |
      |---|---|
      | `@` | `%40` |
      | `:` | `%3A` |
      | `/` | `%2F` |
      | `#` | `%23` |
      | `!` | `%21` |

   b. **Agrega `?sslmode=require` al final** (sin espacios):

      ```
      postgresql://postgres.XXXXXXXXXXXXXX:TU_PASSWORD_CODIFICADA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
      ```

   > 📌 **Este string completo es tu `DATABASE_URL`.** La necesitas en el
   > siguiente paso.

---

## ✅ Paso 4 — Conectar el VPS (Easypanel)

Tu backend vive en Easypanel (dominio `aimachristian-curielbackend...`).
Solo tienes que añadir la variable de entorno y reiniciar el servicio.

1. Entra a **Easypanel** de tu VPS y abre el proyecto del backend CURIEL.

   > [📸 Captura aquí: Easypanel con la lista de servicios/proyectos]()

2. Abre el servicio del backend y ve a la pestaña **"Environment"**
   (o "Variables").

   > [📸 Captura aquí: el panel del servicio backend con la pestaña Environment]()

3. Haz clic en **"Add"** / **"+ Add variable"** y crea la variable:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | (la URL completa del Paso 3, con `?sslmode=require`) |

   > [📸 Captura aquí: el formulario de variable con DATABASE_URL lleno]()

4. **Verifica (opcional pero recomendado)**: si en el panel ves las 7 variables
   viejas (`DATABASE_URL_AUTH`, `DATABASE_URL_INSPECCIONES`, etc.),
   **déjalas ahí** — el backend ahora ignora esas y usa solo `DATABASE_URL`.
   Puedes borrarlas cuando todo funcione.

5. Guarda y **reinicia / rebuild** el servicio (botón **"Restart"** o
   **"Deploy"**).

   > [📸 Captura aquí: el botón Restart/Deploy del servicio]()

6. **Espera 1–3 minutos** a que el contenedor arranque. El backend hace
   automáticamente al iniciar:
   ```
   npx prisma generate  → genera el cliente Prisma
   node scripts/migrate-all.js → crea las tablas si faltan (idempotente)
   node scripts/seed-auth.js   → asegura roles + admin
   node scripts/run-sql-fixes.js → aplica los fixes SQL
   node src/server.js  → levanta la API en el puerto 4000
   ```
   Todo es idempotente: aunque ya hayas corrido `setup.sql` en Supabase, no
   rompe nada.

   > [📸 Captura aquí: los logs del contenedor arrancando sin errores]()

---

## ✅ Paso 5 — Verificación final

1. Abre tu app (el frontend ya apunta al backend por la URL del VPS).

2. Inicia sesión con:
   ```
   admin@curiel.com
   Admin123*
   ```

   > [📸 Captura aquí: el login funcionando]()

3. Entra a **Configuración** → verifica que la **Consideración por defecto**
   está precargada con el texto de voltaje/agua/duchas/tablero/gas.

4. Crea una inspección de prueba → verifica que las **9 áreas por defecto**
   salen en MAYÚSCULA.

5. **Cambia la contraseña del admin** tras el primer ingreso
   (Perfil → Cambiar contraseña). Es la recomendada después de un seed.

---

## 🛟 Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `timeout` o `connection refused` al conectar | URL sin `?sslmode=require` o puerto equivocado | Usa la pestaña **Transaction** (puerto **6543**) y agrega `?sslmode=require` |
| `password authentication failed` | Contraseña mal copiada o caracteres especiales sin codificar | Verifica la codificación del Paso 3 (a). `@` → `%40`, `#` → `%23`, etc. |
| El contenedor no arranca | Variable mal definida en Easypanel | Revisa los logs del contenedor; la variable debe llamarse exactamente `DATABASE_URL` |
| `relation "roles" does not exist` | El `setup.sql` no se ejecutó | Vuelve al Paso 2 y corre `setup.sql` en el SQL Editor |
| Error *"removeChild"* en el SQL Editor | Extensión del navegador (traducción, bloqueador de anuncios…) | Desactiva Chrome Translate / extensiones, usa ventana de incógnito, o ejecuta el script con `psql` (ver sección de abajo) |
| Login dice usuario no existe | El seed no quedó aplicado | Ejecuta `supabase/seed.sql` en el SQL Editor (crea roles + admin) |
| 29 tablas no aparecen | SQL pegado incompleto | Copia el archivo completo desde `backend_legacy/supabase/setup.sql` |

---

## 📁 Archivos de referencia

| Archivo | Qué es |
|---|---|
| `supabase/setup.sql` | **El script completo** (esquema + seed). Pégale este al SQL Editor |
| `supabase/partes/01-enums.sql` … `05-seed.sql` | Los **5 scripts por partes** (idempotentes, probados). Recomendados si el editor falla con el archivo grande |
| `supabase/schema.sql` | Solo el esquema (29 tablas + enums), sin datos |
| `supabase/seed.sql` | Solo el seed (roles, admin, consideración por defecto) |
| `scripts/generate-supabase-sql.js` | Regenera los 3 scripts si cambia `prisma/schema.prisma` |
| `scripts/split-supabase-setup.js` | Regenera los 5 scripts de `partes/` desde `setup.sql` |
| `src/lib/databases.js` | Runtime: un solo PrismaClient contra `DATABASE_URL` |

---

## 🛠️ Si el SQL Editor falla (error de extensión del navegador)

Si al pegar y ejecutar ves el error:

> *"¡Lo sentimos! Es posible que una extensión del navegador haya provocado un
> error... No se pudo ejecutar 'removeChild' en 'Node'"*

Es un **error conocido del editor de Supabase** provocado por extensiones de
navegador (sobre todo **Chrome Translate** y herramientas de traducción, o
bloqueadores de anuncios). Opciones:

1. **Desactiva la traducción automática** de Chrome (menú ⋮ → *Traducir*
   → *No traducir*), o desactiva tus extensiones una por una.
2. Prueba en una **ventana de incógnito** (las extensiones van desactivadas).
3. Prueba en **otro navegador** (Edge, Firefox).
4. O **sáltate el SQL Editor por completo** y ejecuta los scripts desde tu PC
   con `psql` (recomendado, es más confiable). Para el script completo:

   ```bash
   psql "postgresql://postgres.REFPROYECTO:CONTRASEÑA@db.REFPROYECTO.supabase.co:5432/postgres?sslmode=require" -f backend_legacy/supabase/setup.sql
   ```

   O los **5 por partes** (mismo resultado, archivos más cortos):

   ```bash
   cd backend_legacy
   for f in supabase/partes/01-enums.sql supabase/partes/02-tablas.sql \
            supabase/partes/03-indices.sql supabase/partes/04-llaves-foraneas.sql \
            supabase/partes/05-seed.sql; do
     psql "postgresql://postgres.REFPROYECTO:CONTRASEÑA@db.REFPROYECTO.supabase.co:5432/postgres?sslmode=require" -f "$f"
   done
   ```

   - `REFPROYECTO` es el código del proyecto (está en la URL del dashboard,
     ejemplo: `postgres.abc123def456` → ref `abc123def456`).
   - Usa la **conexión directa** (puerto `5432`, host `db.<ref>.supabase.co`)
     para ejecutar el script una sola vez.
   - Si la contraseña tiene caracteres especiales, codifícalos como en el
     Paso 3 (`@` → `%40`, `#` → `%23`, `!` → `%21`…).
   - `setup.sql` es idempotente: ejecutarlo 2 veces no duplica nada.
   - Con esto **el Paso 2 queda hecho**: el seed (roles, admin, consideración)
     ya va dentro del mismo script.

---

## ⚠️ Nota importante sobre datos existentes

Esta es una **instalación limpia**: los datos de las 7 bases actuales del
servidor no se copian solos a Supabase. El seed solo crea roles, el admin y la
consideración por defecto. Si quieres **migrar los datos históricos**
(inspecciones, fotos, usuarios) de las bases viejas a Supabase, dime y te
preparo un script de exportación/importación.
