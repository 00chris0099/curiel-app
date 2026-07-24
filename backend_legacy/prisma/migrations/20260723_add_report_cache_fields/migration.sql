-- AlterTable: Add report cache fields to inspection_summaries
ALTER TABLE "inspection_summaries" ADD COLUMN "cached_report_url" TEXT,
ADD COLUMN "cached_report_at" TIMESTAMPTZ(6),
ADD COLUMN "report_content_hash" VARCHAR(64);
