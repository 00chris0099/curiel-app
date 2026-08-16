-- Consideración por defecto para el módulo de Consideraciones de cada inspección.
-- Idempotente: solo aplica si admin_settings existe y la clave aún no tiene valor.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'admin_settings'
    ) AND NOT EXISTS (
        SELECT 1 FROM admin_settings WHERE key = 'default_consideracion'
    ) THEN
        INSERT INTO admin_settings (key, value, updated_at)
        VALUES (
            'default_consideracion',
            'Se verificó voltaje en todos los puntos, encontrándose dentro del rango permitido.
Se verificaron conexiones de agua con detector scanner, no encontrándose fugas.
Se verificaron las pendientes de las duchas, es aceptable.
En cuanto al tablero las llaves Termomagnéticos y diferenciales operativos, leyenda correcto tablero presenta diagrama unifilar conforme.
Los puntos de gas están conforme al cuadro de acabados. Se recomienda pedir a su contratista hacer una prueba de fuga de gas en su instalación.',
            NOW()
        );
    END IF;
END $$;
