-- ============================================================================
-- 01-enums.sql — TIPO DE DATOS (enums) + extensión uuid
-- Extraído de supabase/setup.sql (proyecto CURIEL — base única / Supabase)
-- IDEMPOTENTE: se puede ejecutar más de una vez sin errores ni duplicados.
-- ============================================================================

-- ============================================================================
-- CURIEL - Esquema UNIFICADO (una sola base de datos / Supabase)
-- Generado automáticamente desde prisma/schema.prisma
-- Idempotente: se puede ejecutar más de una vez sin errores.
-- ============================================================================

-- Extensión auxiliar (uuid aleatorios en SQL crudo)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
        CREATE TYPE "DocumentType" AS ENUM ('dni', 'ruc', 'ce');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionStatus') THEN
        CREATE TYPE "InspectionStatus" AS ENUM ('pendiente', 'en_proceso', 'lista_revision', 'finalizada', 'cancelada', 'reprogramada');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionAreaStatus') THEN
        CREATE TYPE "InspectionAreaStatus" AS ENUM ('pendiente', 'en_revision', 'observado', 'aprobado');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ObservationSeverity') THEN
        CREATE TYPE "ObservationSeverity" AS ENUM ('leve', 'media', 'alta', 'critica');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ObservationType') THEN
        CREATE TYPE "ObservationType" AS ENUM ('humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ObservationStatus') THEN
        CREATE TYPE "ObservationStatus" AS ENUM ('pendiente', 'corregido', 'requiere_revision');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportStatus') THEN
        CREATE TYPE "ReportStatus" AS ENUM ('borrador', 'listo_para_revision', 'aprobado');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionResponseStatus') THEN
        CREATE TYPE "InspectionResponseStatus" AS ENUM ('cumple', 'no_cumple', 'no_aplica');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PhotoType') THEN
        CREATE TYPE "PhotoType" AS ENUM ('edificio', 'plano', 'area', 'observacion', 'general');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignatureType') THEN
        CREATE TYPE "SignatureType" AS ENUM ('inspector', 'client');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertStatus') THEN
        CREATE TYPE "AlertStatus" AS ENUM ('abierta', 'en_revision', 'resuelta');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SuspensionReason') THEN
        CREATE TYPE "SuspensionReason" AS ENUM ('abandono', 'rendimiento', 'conducta', 'otro');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SuspensionStatus') THEN
        CREATE TYPE "SuspensionStatus" AS ENUM ('activa', 'levantada');
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvaluationStatus') THEN
        CREATE TYPE "EvaluationStatus" AS ENUM ('borrador', 'confirmada', 'enviada');
    END IF;
END $$;
