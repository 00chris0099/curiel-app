-- ============================================================================
-- 05-seed.sql — DATOS INICIALES (roles, admin, consideración por defecto)
-- Extraído de supabase/setup.sql (proyecto CURIEL — base única / Supabase)
-- IDEMPOTENTE: se puede ejecutar más de una vez sin errores ni duplicados.
-- ============================================================================

-- SEED (roles, admin, configuración)
-- ============================================================================

-- ============================================================================
-- CURIEL - SEED (base de datos única / Supabase)
-- Roles, usuario administrador y configuración inicial.
-- Idempotente: puede ejecutarse varias veces sin duplicar datos.
-- ============================================================================

-- Roles por defecto
INSERT INTO roles (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'admin',       'Administrador del sistema con acceso completo', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'supervisor',  'Supervisa inspecciones y genera evaluaciones', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'supervisor');

INSERT INTO roles (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'arquitecto',  'Arquitecto que revisa y aprueba informes', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'arquitecto');

INSERT INTO roles (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'inspector',   'Inspector que realiza inspecciones en campo', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'inspector');

-- Usuario administrador (password por defecto: Admin123* — cámbialo tras el primer ingreso)
INSERT INTO users (id, full_name, email, phone, password_hash, is_active, is_master_admin, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'Admin Curiel',
    'admin@curiel.com',
    NULL,
    '$2a$12$97tagqWJB08AubXdOVCGM.5H3E..CQxRkA6eLhOrVSfs9/NY2W9Xu',
    true,
    true,
    now(),
    now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@curiel.com');

-- Asignar rol admin al usuario administrador
INSERT INTO user_roles (id, user_id, role_id, assigned_at)
SELECT
    gen_random_uuid(),
    u.id,
    r.id,
    now()
FROM users u
JOIN roles r ON r.name = 'admin'
WHERE u.email = 'admin@curiel.com'
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN users u2 ON u2.id = ur.user_id
      JOIN roles r2 ON r2.id = ur.role_id
      WHERE u2.email = 'admin@curiel.com' AND r2.name = 'admin'
  );

-- Consideración por defecto del módulo Consideraciones (se aplica a cada inspección)
INSERT INTO admin_settings (key, value, updated_at)
SELECT
    'default_consideracion',
    'Se verificó voltaje en todos los puntos, encontrándose dentro del rango permitido.
Se verificaron conexiones de agua con detector scanner, no encontrándose fugas.
Se verificaron las pendientes de las duchas, es aceptable.
En cuanto al tablero las llaves Termomagnéticos y diferenciales operativos, leyenda correcto tablero presenta diagrama unifilar conforme.
Los puntos de gas están conforme al cuadro de acabados. Se recomienda pedir a su contratista hacer una prueba de fuga de gas en su instalación.',
    now()
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE key = 'default_consideracion');
