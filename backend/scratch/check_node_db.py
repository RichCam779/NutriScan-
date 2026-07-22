import os
import psycopg2

node_db_url = "postgresql://neondb_owner:npg_l6CzgitpB1Qe@ep-round-mud-ai86cv3v-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

try:
    conn = psycopg2.connect(node_db_url)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = [t[0] for t in cur.fetchall()]
    print("Tables in Node.js DB:", tables)
    
    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM {table};")
        print(f"Table '{table}' row count: {cur.fetchone()[0]}")
        
    cur.close()
    conn.close()
except Exception as e:
    print("Error:", e)
