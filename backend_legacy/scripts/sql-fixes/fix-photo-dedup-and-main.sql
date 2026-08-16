-- Evitar duplicados de fotos (client_id idempotente) y soportar foto principal (is_main)
-- Idempotente: solo aplica si la tabla photos existe en la base actual.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'photos'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'photos' AND column_name = 'client_id'
        ) THEN
            ALTER TABLE "photos" ADD COLUMN "client_id" VARCHAR(64);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'photos' AND column_name = 'is_main'
        ) THEN
            ALTER TABLE "photos" ADD COLUMN "is_main" BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
    END IF;
END $$;
