
import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from datetime import datetime

class Registro_consumoController:
    
    def get_all(self):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # DB_STATE_CHECK
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='registro_consumo' AND column_name='estado'")
            has_estado = cursor.fetchone() is not None
            
            if has_estado:
                cursor.execute("SELECT * FROM registro_consumo WHERE estado != 'Inactivo' ORDER BY id_registro ASC")
            else:
                cursor.execute("SELECT * FROM registro_consumo ORDER BY id_registro ASC")
                
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
            cursor.execute("SELECT * FROM registro_consumo WHERE id_registro = %s", (item_id,))
            columns = [desc[0] for desc in cursor.description]
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No encontrado")
            return {"resultado": dict(zip(columns, row))}
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()
            
    def get_by_usuario_today(self, id_usuario: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            today = datetime.now().date()
            # Check if tipo_comida column exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='registro_consumo' AND column_name='tipo_comida'
            """)
            has_tipo = cursor.fetchone() is not None
            tipo_col = "r.tipo_comida," if has_tipo else "NULL AS tipo_comida,"
            query = f"""
                SELECT r.id_registro, r.id_usuario, r.id_alimento, r.cantidad_gramos, 
                       r.fecha_consumo, {tipo_col} a.nombre, a.calorias, r.fecha_creacion
                FROM registro_consumo r
                JOIN alimentos a ON r.id_alimento = a.id_alimento
                WHERE r.id_usuario = %s AND r.fecha_consumo = %s
                ORDER BY r.fecha_creacion ASC
            """
            cursor.execute(query, (id_usuario, today))
            columns = [desc[0] for desc in cursor.description]
            result = cursor.fetchall()
            return {"resultado": [dict(zip(columns, row)) for row in result]}
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

            
    def get_by_usuario(self, id_usuario: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            # Check if tipo_comida column exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='registro_consumo' AND column_name='tipo_comida'
            """)
            has_tipo = cursor.fetchone() is not None
            tipo_col = "r.tipo_comida," if has_tipo else "NULL AS tipo_comida,"
            query = f"""
                SELECT r.id_registro, r.id_usuario, r.id_alimento, r.cantidad_gramos, 
                       r.fecha_consumo, {tipo_col} a.nombre, a.calorias, r.fecha_creacion,
                       a.proteinas_g, a.carbohidratos_g, a.grasas_g
                FROM registro_consumo r
                JOIN alimentos a ON r.id_alimento = a.id_alimento
                WHERE r.id_usuario = %s
                ORDER BY r.fecha_consumo DESC, r.fecha_creacion DESC
            """
            cursor.execute(query, (id_usuario,))
            columns = [desc[0] for desc in cursor.description]
            result = cursor.fetchall()
            return {"resultado": [dict(zip(columns, row)) for row in result]}
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

            
    def create(self, data: dict):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # DATE_INJECT
            if 'fecha_creacion' not in data:
                data['fecha_creacion'] = datetime.now()
            if 'fecha_actualizacion' not in data:
                data['fecha_actualizacion'] = datetime.now()
                
            keys = list(data.keys())
            values = tuple(data.values())
            
            placeholders = ", ".join(["%s"] * len(keys))
            columns = ", ".join(keys)
            
            query = f"INSERT INTO registro_consumo ({columns}) VALUES ({placeholders}) RETURNING *"
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
            
            # DATE_UPDATE
            data['fecha_actualizacion'] = datetime.now()
            
            keys = list(data.keys())
            values = list(data.values())
            
            set_clause = ", ".join([f"{k} = %s" for k in keys])
            values.append(item_id)
            
            query = f"UPDATE registro_consumo SET {set_clause} WHERE id_registro = %s RETURNING *"
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
            cursor.execute(f"UPDATE registro_consumo SET estado = 'Inactivo', fecha_actualizacion = NOW() WHERE id_registro = %s", (item_id,))
                
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="No encontrado")
                
            conn.commit()
            return {"resultado": "Desactivado con éxito (Soft Delete)"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()
