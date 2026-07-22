import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # List tables and columns
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = [t[0] for t in cur.fetchall()]
    
    for table in tables:
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table}';")
        cols = cur.fetchall()
        print(f"Table '{table}' columns:")
        for col in cols:
            print(f"  - {col[0]} ({col[1]})")
        print()
        
    cur.close()
    conn.close()
except Exception as e:
    print("Error:", e)
