/**
 * Migracion: Crear tabla refresh_tokens
 * Ejecutar: node src/database/migrateRefreshToken.js
 */
const { sequelize } = require('../config/database');

const migrate = async () => {
    try {
        console.log('🔄 Verificando tabla refresh_tokens...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token VARCHAR(512) NOT NULL UNIQUE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                revoked_at TIMESTAMP WITH TIME ZONE,
                replaced_by_token VARCHAR(512),
                ip_address VARCHAR(255),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // Crear indices
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
        `);

        console.log('✅ Tabla refresh_tokens creada/verificada exitosamente');
    } catch (error) {
        console.error('❌ Error al crear tabla refresh_tokens:', error.message);
        throw error;
    }
};

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = migrate;
