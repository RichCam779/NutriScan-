-- =============================================================
-- MIGRACIÓN 001: Agregar columna tipo_comida a registro_consumo
-- Ejecutar SOLO si la columna no existe (para bases de datos existentes)
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registro_consumo' AND column_name = 'tipo_comida'
    ) THEN
        ALTER TABLE registro_consumo 
        ADD COLUMN tipo_comida VARCHAR(30) DEFAULT 'Almuerzo';
        
        RAISE NOTICE 'Columna tipo_comida agregada correctamente a registro_consumo';
    ELSE
        RAISE NOTICE 'La columna tipo_comida ya existe en registro_consumo';
    END IF;
END $$;

-- Agregar también tabla mensajes_nutricionista si no existe
CREATE TABLE IF NOT EXISTS mensajes_nutricionista (
    id_mensaje SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
    mensaje TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
