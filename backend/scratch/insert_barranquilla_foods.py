import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.db_config import get_db_connection

alimentos_tipicos = [
    ('Arepa de Huevo', 'Comida Tipica Barranquilla', 280, 9.5, 32.0, 12.5, 1.8, 320.0, False, 'B1, B2, B12, D', 'Hierro, Calcio, Fosforo'),
    ('Empanada Barranquillera', 'Comida Tipica Barranquilla', 260, 8.0, 30.0, 11.0, 1.5, 280.0, False, 'B1, B3, B6', 'Hierro, Zinc, Potasio'),
    ('Sancocho de Gallina', 'Comida Tipica Barranquilla', 85, 7.5, 8.0, 2.5, 1.2, 450.0, True, 'B3, B6, C', 'Potasio, Fosforo, Magnesio'),
    ('Patacon con Hogao', 'Comida Tipica Barranquilla', 230, 3.0, 42.0, 6.0, 2.8, 180.0, False, 'B6, C, E', 'Potasio, Magnesio, Vitamina C'),
    ('Butifarra de Soledad', 'Comida Tipica Barranquilla', 310, 14.0, 5.0, 26.0, 0.0, 780.0, False, 'B1, B12, B3', 'Hierro, Zinc, Sodio'),
    ('Mote de Queso', 'Comida Tipica Barranquilla', 140, 6.5, 18.0, 4.5, 1.5, 390.0, True, 'B2, D, A', 'Calcio, Fosforo, Sodio'),
    ('Arroz de Lisa', 'Comida Tipica Barranquilla', 175, 12.0, 22.0, 4.0, 0.5, 310.0, True, 'B12, D, Omega3', 'Fosforo, Potasio, Selenio'),
    ('Carimanola', 'Comida Tipica Barranquilla', 240, 7.5, 35.0, 8.5, 1.8, 260.0, False, 'B6, C, E', 'Potasio, Magnesio, Hierro'),
    ('Bollo de Yuca', 'Comida Tipica Barranquilla', 150, 2.5, 33.0, 1.5, 1.2, 120.0, True, 'B6, C', 'Potasio, Calcio, Magnesio'),
    ('Dulce de Papayuela', 'Comida Tipica Barranquilla', 195, 0.5, 48.0, 0.2, 1.0, 15.0, False, 'A, C, B6', 'Potasio, Calcio')
]

def main():
    try:
        print("Conectandose a la base de datos...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("Insertando alimentos locales de Barranquilla (evitando duplicados)...")
        inserted = 0
        for item in alimentos_tipicos:
            cursor.execute("SELECT id_alimento FROM alimentos WHERE nombre = %s", (item[0],))
            if cursor.fetchone():
                print(f"  * '{item[0]}' ya existe en la base de datos. Saltando...")
            else:
                cursor.execute("""
                    INSERT INTO alimentos (nombre, categoria, calorias, proteinas_g, carbohidratos_g, grasas_g, fibra_g, sodio_mg, es_apto_diabetico, vitaminas, minerales)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, item)
                print(f"  + '{item[0]}' insertado con exito.")
                inserted += 1

        conn.commit()
        print(f"\nProceso terminado. Se insertaron {inserted} nuevos alimentos.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error al insertar en la base de datos: {e}")

if __name__ == "__main__":
    main()
