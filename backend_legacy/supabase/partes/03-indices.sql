-- ============================================================================
-- 03-indices.sql — ÍNDICES
-- Extraído de supabase/setup.sql (proyecto CURIEL — base única / Supabase)
-- IDEMPOTENTE: se puede ejecutar más de una vez sin errores ni duplicados.
-- ============================================================================

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
