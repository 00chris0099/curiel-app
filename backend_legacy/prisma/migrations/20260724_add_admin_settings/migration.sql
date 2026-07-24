-- CreateTable: Admin settings for company configuration
CREATE TABLE IF NOT EXISTS "admin_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key")
);
