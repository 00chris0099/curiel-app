-- Add missing cache columns to inspection_summaries
-- This is idempotent: safe to run multiple times.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspection_summaries' AND column_name = 'cached_report_url'
    ) THEN
        ALTER TABLE "inspection_summaries" ADD COLUMN "cached_report_url" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspection_summaries' AND column_name = 'cached_report_at'
    ) THEN
        ALTER TABLE "inspection_summaries" ADD COLUMN "cached_report_at" TIMESTAMPTZ(6);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspection_summaries' AND column_name = 'report_content_hash'
    ) THEN
        ALTER TABLE "inspection_summaries" ADD COLUMN "report_content_hash" VARCHAR(64);
    END IF;
END $$;
