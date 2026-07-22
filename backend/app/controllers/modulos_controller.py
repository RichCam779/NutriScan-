
import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from datetime import datetime

class ModulosController:
    
    def get_all(self):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Revisar si existe la columna de estado para filtrar
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='modulos' AND column_name='estado'")
            has_estado = cursor.fetchone() is not None
            
            if has_estado:
                cursor.execute("SELECT * FROM modulos WHERE estado != 'Inactivo' ORDER BY id_modulo ASC")
            else:
                cursor.execute("SELECT * FROM modulos ORDER BY id_modulo ASC")
                
            columns = [desc[0] for desc in cursor.description]
            result = cursor.fetchall()
            
            return {"resultado": [dict(zip(columns, row)) for row in result]}
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    def get_by_id(self, item_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM modulos WHERE id_modulo = %s", (item_id,))
            columns = [desc[0] for desc in cursor.description]
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No encontrado")
            return {"resultado": dict(zip(columns, row))}
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()
            
    def create(self, data: dict):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Aseguramos de insertar la fecha actual
            if 'fecha_creacion' not in data:
                data['fecha_creacion'] = datetime.now()
            if 'fecha_actualizacion' not in data:
                data['fecha_actualizacion'] = datetime.now()
                
            keys = list(data.keys())
            values = tuple(data.values())
            
            placeholders = ", ".join(["%s"] * len(keys))
            columns = ", ".join(keys)
            
            query = f"INSERT INTO modulos ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(query, values)
            
            cols = [desc[0] for desc in cursor.description]
            new_row = cursor.fetchone()
            
            conn.commit()
            return {"resultado": "Creado con éxito", "data": dict(zip(cols, new_row))}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    def update(self, item_id: int, data: dict):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Forzar actualización de fecha
            data['fecha_actualizacion'] = datetime.now()
            
            keys = list(data.keys())
            values = list(data.values())
            
            set_clause = ", ".join([f"{k} = %s" for k in keys])
            values.append(item_id)
            
            query = f"UPDATE modulos SET {set_clause} WHERE id_modulo = %s RETURNING *"
            cursor.execute(query, tuple(values))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="No encontrado")
                
            cols = [desc[0] for desc in cursor.description]
            updated_row = cursor.fetchone()
                
            conn.commit()
            return {"resultado": "Actualizado con éxito", "data": dict(zip(cols, updated_row))}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    def deactivate(self, item_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Aplicar Soft Delete (Estado = 'Inactivo')
            cursor.execute(f"UPDATE modulos SET estado = 'Inactivo', fecha_actualizacion = NOW() WHERE id_modulo = %s", (item_id,))
                
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="No encontrado")
                
            conn.commit()
            return {"resultado": "Desactivado con éxito (Soft Delete)"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()
