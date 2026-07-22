import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Check current columns of perfiles_clinicos
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='perfiles_clinicos';")
    cols = [r[0] for r in cur.fetchall()]
    
    alterations = []
    if "proteinas_g" not in cols:
        alterations.append("ADD COLUMN proteinas_g NUMERIC(5,2) DEFAULT 0")
    if "carbohidratos_g" not in cols:
        alterations.append("ADD COLUMN carbohidratos_g NUMERIC(5,2) DEFAULT 0")
    if "grasas_g" not in cols:
        alterations.append("ADD COLUMN grasas_g NUMERIC(5,2) DEFAULT 0")
    if "recomendaciones" not in cols:
        alterations.append("ADD COLUMN recomendaciones TEXT")
        
    if alterations:
        query = f"ALTER TABLE perfiles_clinicos {', '.join(alterations)};"
        print("Running DDL:", query)
        cur.execute(query)
        conn.commit()
        print("Table perfiles_clinicos altered successfully.")
    else:
        print("All columns already exist in perfiles_clinicos.")
        
    cur.close()
    conn.close()
except Exception as e:
    print("Error during update_db:", e)
