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


CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255),
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_master_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_token" VARCHAR(512),
    "ip_address" VARCHAR(255),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspections" (
    "id" UUID NOT NULL,
    "project_name" VARCHAR(255) NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "client_email" VARCHAR(255),
    "client_phone" VARCHAR(255),
    "address" TEXT NOT NULL,
    "city" VARCHAR(255),
    "state" VARCHAR(255),
    "zip_code" VARCHAR(255),
    "inspection_type" VARCHAR(255) NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'pendiente',
    "scheduled_date" TIMESTAMPTZ(6) NOT NULL,
    "completed_date" TIMESTAMPTZ(6),
    "inspector_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "notes" TEXT,
    "report_url" VARCHAR(255),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "client_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_status_histories" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "from_status" VARCHAR(50) NOT NULL,
    "to_status" VARCHAR(50) NOT NULL,
    "reason_code" VARCHAR(100),
    "reason_label" VARCHAR(255),
    "comment" TEXT,
    "notify_client" BOOLEAN NOT NULL DEFAULT false,
    "notify_inspector" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspection_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_areas" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(255) NOT NULL DEFAULT 'interior',
    "length_m" DECIMAL(10,2),
    "width_m" DECIMAL(10,2),
    "calculated_area_m2" DECIMAL(10,2),
    "ceiling_height_m" DECIMAL(10,2),
    "notes" TEXT,
    "status" "InspectionAreaStatus" NOT NULL DEFAULT 'pendiente',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspection_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_observations" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "ObservationSeverity" NOT NULL,
    "type" "ObservationType" NOT NULL,
    "recommendation" TEXT,
    "metric_value" DECIMAL(10,2),
    "metric_unit" VARCHAR(255),
    "status" "ObservationStatus" NOT NULL DEFAULT 'pendiente',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspection_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_summaries" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "total_area_m2" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_observations" INTEGER NOT NULL DEFAULT 0,
    "critical_observations" INTEGER NOT NULL DEFAULT 0,
    "high_observations" INTEGER NOT NULL DEFAULT 0,
    "medium_observations" INTEGER NOT NULL DEFAULT 0,
    "light_observations" INTEGER NOT NULL DEFAULT 0,
    "general_conclusion" TEXT,
    "final_recommendations" TEXT,
    "report_status" "ReportStatus" NOT NULL DEFAULT 'borrador',
    "cached_report_url" TEXT,
    "cached_report_at" TIMESTAMPTZ(6),
    "report_content_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspection_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_responses" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "checklist_item_id" UUID NOT NULL,
    "status" "InspectionResponseStatus" NOT NULL,
    "observations" TEXT,
    "responded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspection_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "photos" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "checklist_item_id" UUID,
    "area_id" UUID,
    "observation_id" UUID,
    "type" "PhotoType" NOT NULL DEFAULT 'general',
    "url" VARCHAR(255) NOT NULL,
    "public_id" VARCHAR(255),
    "caption" TEXT,
    "client_id" VARCHAR(64),
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "taken_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "signatures" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "signature_type" "SignatureType" NOT NULL,
    "signature_url" VARCHAR(255) NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "signer_name" VARCHAR(255) NOT NULL,
    "signed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "clients" (
    "id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "razon_social" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255),
    "address" TEXT,
    "is_protected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "checklist_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "inspection_type" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "checklist_items" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "item_text" TEXT NOT NULL,
    "category" VARCHAR(255),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'api_key',
    "prefix" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_by_id" UUID NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "inspection_id" UUID,
    "type" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "channel" VARCHAR(50) NOT NULL DEFAULT 'in_app',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'normal',
    "category" VARCHAR(100) NOT NULL DEFAULT 'system',
    "metadata" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB NOT NULL DEFAULT '{}',
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "alerts" (
    "id" UUID NOT NULL,
    "inspection_id" UUID,
    "suspension_id" UUID,
    "supervisor_id" UUID NOT NULL,
    "gravity_level" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'abierta',
    "notified_users" JSON NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "suspensions" (
    "id" UUID NOT NULL,
    "inspector_id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "reason" "SuspensionReason" NOT NULL,
    "description" TEXT NOT NULL,
    "gravity_level" INTEGER NOT NULL,
    "status" "SuspensionStatus" NOT NULL DEFAULT 'activa',
    "evidence" JSON NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suspensions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "evaluations" (
    "id" UUID NOT NULL,
    "evaluated_user_id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "inspections_completed" INTEGER NOT NULL DEFAULT 0,
    "avg_time_per_inspection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "punctuality_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_photos_per_inspection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "critical_observations" INTEGER NOT NULL DEFAULT 0,
    "rejection_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "composite_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "actions" TEXT,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'borrador',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(255),
    "entity_id" UUID,
    "changes" JSONB,
    "ip_address" VARCHAR(255),
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pdf_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL DEFAULT 'inspeccion',
    "layoutJson" JSONB NOT NULL,
    "thumbnailUrl" VARCHAR(500),
    "created_by" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pdf_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pdf_edit_history" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_edit_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pdf_versions" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pdf_drafts" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "saved_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pdf_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "refresh_tokens"("token");

CREATE INDEX IF NOT EXISTS "refresh_tokens_token_idx" ON "refresh_tokens"("token");

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

CREATE INDEX IF NOT EXISTS "inspections_inspector_id_idx" ON "inspections"("inspector_id");

CREATE INDEX IF NOT EXISTS "inspections_created_by_id_idx" ON "inspections"("created_by_id");

CREATE INDEX IF NOT EXISTS "inspections_client_id_idx" ON "inspections"("client_id");

CREATE INDEX IF NOT EXISTS "inspections_status_idx" ON "inspections"("status");

CREATE INDEX IF NOT EXISTS "inspections_scheduled_date_idx" ON "inspections"("scheduled_date");

CREATE INDEX IF NOT EXISTS "inspection_status_histories_inspection_id_idx" ON "inspection_status_histories"("inspection_id");

CREATE INDEX IF NOT EXISTS "inspection_status_histories_changed_by_user_id_idx" ON "inspection_status_histories"("changed_by_user_id");

CREATE INDEX IF NOT EXISTS "inspection_areas_inspection_id_idx" ON "inspection_areas"("inspection_id");

CREATE INDEX IF NOT EXISTS "inspection_areas_category_idx" ON "inspection_areas"("category");

CREATE INDEX IF NOT EXISTS "inspection_areas_status_idx" ON "inspection_areas"("status");

CREATE INDEX IF NOT EXISTS "inspection_areas_sort_order_idx" ON "inspection_areas"("sort_order");

CREATE INDEX IF NOT EXISTS "inspection_observations_inspection_id_idx" ON "inspection_observations"("inspection_id");

CREATE INDEX IF NOT EXISTS "inspection_observations_area_id_idx" ON "inspection_observations"("area_id");

CREATE INDEX IF NOT EXISTS "inspection_observations_severity_idx" ON "inspection_observations"("severity");

CREATE INDEX IF NOT EXISTS "inspection_observations_type_idx" ON "inspection_observations"("type");

CREATE INDEX IF NOT EXISTS "inspection_observations_status_idx" ON "inspection_observations"("status");

CREATE INDEX IF NOT EXISTS "inspection_observations_created_by_idx" ON "inspection_observations"("created_by");

CREATE UNIQUE INDEX IF NOT EXISTS "inspection_summaries_inspection_id_key" ON "inspection_summaries"("inspection_id");

CREATE INDEX IF NOT EXISTS "inspection_summaries_report_status_idx" ON "inspection_summaries"("report_status");

CREATE INDEX IF NOT EXISTS "inspection_responses_inspection_id_idx" ON "inspection_responses"("inspection_id");

CREATE INDEX IF NOT EXISTS "inspection_responses_checklist_item_id_idx" ON "inspection_responses"("checklist_item_id");

CREATE UNIQUE INDEX IF NOT EXISTS "inspection_responses_inspection_id_checklist_item_id_key" ON "inspection_responses"("inspection_id", "checklist_item_id");

CREATE INDEX IF NOT EXISTS "photos_inspection_id_idx" ON "photos"("inspection_id");

CREATE INDEX IF NOT EXISTS "photos_area_id_idx" ON "photos"("area_id");

CREATE INDEX IF NOT EXISTS "photos_observation_id_idx" ON "photos"("observation_id");

CREATE INDEX IF NOT EXISTS "photos_uploaded_by_id_idx" ON "photos"("uploaded_by_id");

CREATE INDEX IF NOT EXISTS "photos_type_idx" ON "photos"("type");

CREATE INDEX IF NOT EXISTS "photos_taken_at_idx" ON "photos"("taken_at");

CREATE INDEX IF NOT EXISTS "photos_client_id_idx" ON "photos"("client_id");

CREATE INDEX IF NOT EXISTS "signatures_inspection_id_idx" ON "signatures"("inspection_id");

CREATE UNIQUE INDEX IF NOT EXISTS "clients_document_number_key" ON "clients"("document_number");

CREATE UNIQUE INDEX IF NOT EXISTS "clients_email_key" ON "clients"("email");

CREATE INDEX IF NOT EXISTS "clients_document_number_idx" ON "clients"("document_number");

CREATE INDEX IF NOT EXISTS "clients_email_idx" ON "clients"("email");

CREATE INDEX IF NOT EXISTS "checklist_templates_created_by_id_idx" ON "checklist_templates"("created_by_id");

CREATE INDEX IF NOT EXISTS "checklist_items_template_id_idx" ON "checklist_items"("template_id");

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_key" ON "api_keys"("key");

CREATE INDEX IF NOT EXISTS "api_keys_key_idx" ON "api_keys"("key");

CREATE INDEX IF NOT EXISTS "api_keys_created_by_id_idx" ON "api_keys"("created_by_id");

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");

CREATE INDEX IF NOT EXISTS "notifications_inspection_id_idx" ON "notifications"("inspection_id");

CREATE INDEX IF NOT EXISTS "notifications_category_idx" ON "notifications"("category");

CREATE INDEX IF NOT EXISTS "notifications_priority_idx" ON "notifications"("priority");

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_token_key" ON "push_tokens"("token");

CREATE INDEX IF NOT EXISTS "push_tokens_user_id_idx" ON "push_tokens"("user_id");

CREATE INDEX IF NOT EXISTS "push_tokens_token_idx" ON "push_tokens"("token");

CREATE INDEX IF NOT EXISTS "alerts_inspection_id_idx" ON "alerts"("inspection_id");

CREATE INDEX IF NOT EXISTS "alerts_suspension_id_idx" ON "alerts"("suspension_id");

CREATE INDEX IF NOT EXISTS "alerts_supervisor_id_idx" ON "alerts"("supervisor_id");

CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts"("status");

CREATE INDEX IF NOT EXISTS "suspensions_inspector_id_idx" ON "suspensions"("inspector_id");

CREATE INDEX IF NOT EXISTS "suspensions_supervisor_id_idx" ON "suspensions"("supervisor_id");

CREATE INDEX IF NOT EXISTS "suspensions_status_idx" ON "suspensions"("status");

CREATE INDEX IF NOT EXISTS "evaluations_evaluated_user_id_idx" ON "evaluations"("evaluated_user_id");

CREATE INDEX IF NOT EXISTS "evaluations_supervisor_id_idx" ON "evaluations"("supervisor_id");

CREATE INDEX IF NOT EXISTS "evaluations_week_start_idx" ON "evaluations"("week_start");

CREATE INDEX IF NOT EXISTS "evaluations_week_end_idx" ON "evaluations"("week_end");

CREATE UNIQUE INDEX IF NOT EXISTS "evaluations_evaluated_user_id_week_start_week_end_key" ON "evaluations"("evaluated_user_id", "week_start", "week_end");

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");

CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "pdf_templates_created_by_idx" ON "pdf_templates"("created_by");

CREATE INDEX IF NOT EXISTS "pdf_templates_category_idx" ON "pdf_templates"("category");

CREATE INDEX IF NOT EXISTS "pdf_edit_history_inspection_id_idx" ON "pdf_edit_history"("inspection_id");

CREATE INDEX IF NOT EXISTS "pdf_edit_history_user_id_idx" ON "pdf_edit_history"("user_id");

CREATE INDEX IF NOT EXISTS "pdf_edit_history_timestamp_idx" ON "pdf_edit_history"("timestamp");

CREATE INDEX IF NOT EXISTS "pdf_versions_inspection_id_idx" ON "pdf_versions"("inspection_id");

CREATE INDEX IF NOT EXISTS "pdf_versions_created_by_idx" ON "pdf_versions"("created_by");

CREATE UNIQUE INDEX IF NOT EXISTS "pdf_versions_inspection_id_version_number_key" ON "pdf_versions"("inspection_id", "version_number");

CREATE UNIQUE INDEX IF NOT EXISTS "pdf_drafts_inspection_id_key" ON "pdf_drafts"("inspection_id");

CREATE INDEX IF NOT EXISTS "pdf_drafts_inspection_id_idx" ON "pdf_drafts"("inspection_id");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_fkey') THEN
        ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_user_id_fkey') THEN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_fkey') THEN
        ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_status_histories_inspection_id_fkey') THEN
        ALTER TABLE "inspection_status_histories" ADD CONSTRAINT "inspection_status_histories_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_areas_inspection_id_fkey') THEN
        ALTER TABLE "inspection_areas" ADD CONSTRAINT "inspection_areas_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_observations_inspection_id_fkey') THEN
        ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_observations_area_id_fkey') THEN
        ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "inspection_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_summaries_inspection_id_fkey') THEN
        ALTER TABLE "inspection_summaries" ADD CONSTRAINT "inspection_summaries_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspection_responses_inspection_id_fkey') THEN
        ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_items_template_id_fkey') THEN
        ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


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
