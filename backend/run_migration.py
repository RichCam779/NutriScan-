import sys
sys.path.insert(0, '.')
from app.config.db_config import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# Add tipo_comida to registro_consumo if missing
cur.execute(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name='registro_consumo' AND column_name='tipo_comida'"
)
if not cur.fetchone():
    cur.execute("ALTER TABLE registro_consumo ADD COLUMN tipo_comida VARCHAR(30) DEFAULT 'Almuerzo'")
    print('Added tipo_comida column')
else:
    print('tipo_comida column already exists')

# Create mensajes_nutricionista if missing
cur.execute("""
    CREATE TABLE IF NOT EXISTS mensajes_nutricionista (
        id_mensaje SERIAL PRIMARY KEY,
        id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
        mensaje TEXT NOT NULL,
        estado VARCHAR(20) DEFAULT 'Pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print('mensajes_nutricionista table ensured')

conn.commit()
conn.close()
print('Migration complete!')
