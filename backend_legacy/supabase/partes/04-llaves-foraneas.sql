-- ============================================================================
-- 04-llaves-foraneas.sql — LLAVES FORÁNEAS (relaciones entre tablas)
-- Extraído de supabase/setup.sql (proyecto CURIEL — base única / Supabase)
-- IDEMPOTENTE: se puede ejecutar más de una vez sin errores ni duplicados.
-- ============================================================================

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
