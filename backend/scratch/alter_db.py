import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print("Connecting to:", db_url)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Check existing columns
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='perfiles_clinicos';")
    existing_cols = [r[0] for r in cur.fetchall()]
    print("Existing columns:", existing_cols)
    
    alterations = [
        ("plan_proteinas_g", "ALTER TABLE perfiles_clinicos ADD COLUMN plan_proteinas_g INT DEFAULT 0;"),
        ("plan_carbohidratos_g", "ALTER TABLE perfiles_clinicos ADD COLUMN plan_carbohidratos_g INT DEFAULT 0;"),
        ("plan_grasas_g", "ALTER TABLE perfiles_clinicos ADD COLUMN plan_grasas_g INT DEFAULT 0;"),
        ("plan_recomendaciones", "ALTER TABLE perfiles_clinicos ADD COLUMN plan_recomendaciones TEXT;"),
        ("plan_nutricionista_nombre", "ALTER TABLE perfiles_clinicos ADD COLUMN plan_nutricionista_nombre VARCHAR(100);"),
    ]
    
    for col, sql in alterations:
        if col not in existing_cols:
            print(f"Adding column '{col}'...")
            cur.execute(sql)
        else:
            print(f"Column '{col}' already exists.")
            
    conn.commit()
    print("Database altered successfully!")
    cur.close()
    conn.close()
except Exception as e:
    print("Error altering database:", e)
