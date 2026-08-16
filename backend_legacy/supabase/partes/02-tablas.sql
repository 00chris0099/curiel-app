-- ============================================================================
-- 02-tablas.sql — TABLAS (29)
-- Extraído de supabase/setup.sql (proyecto CURIEL — base única / Supabase)
-- IDEMPOTENTE: se puede ejecutar más de una vez sin errores ni duplicados.
-- ============================================================================

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
