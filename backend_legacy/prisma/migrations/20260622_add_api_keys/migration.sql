-- CreateTable
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'api_key',
    prefix VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ(6),
    last_used_at TIMESTAMPTZ(6),
    created_by_id UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by_id ON api_keys(created_by_id);
