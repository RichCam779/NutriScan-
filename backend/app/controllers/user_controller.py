import psycopg2
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from app.config.db_config import get_db_connection
from app.models.user_model import User
from app.utils.auth import verify_password, get_password_hash
from datetime import datetime

# USER_CONTROLLER
class UserController:
    
    # CREATE_USER
    def create_user(self, user: User):   
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO usuarios 
                (identificacion, nombre_completo, email, genero, pais, departamento, ciudad, password_hash, id_rol) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id_usuario
            """
            values = (
                user.identificacion, 
                user.nombre_completo, 
                user.email, 
                user.genero,
                user.pais,
                user.departamento,
                user.ciudad,
                get_password_hash(user.password_hash or 'Nutri123*'), 
                user.id_rol
            )
            
            cursor.execute(query, values)
            new_id = cursor.fetchone()[0]

            # Insertar teléfono
            if user.telefono:
                cursor.execute("INSERT INTO telefono (id_usuario, numero, tipo) VALUES (%s, %s, %s)", (new_id, user.telefono, user.tipo_telefono or 'Personal'))
            
            # Crear perfil clínico con meta calórica, edad, peso, altura, biotipo y confianza
            cursor.execute(
                "INSERT INTO perfiles_clinicos (id_usuario, meta_calorica_diaria, edad, peso_kg, altura_cm, biotipo, confianza_ia) VALUES (%s, %s, %s, %s, %s, %s, %s)", 
                (new_id, user.meta_calorica, user.edad, user.peso_kg, user.altura_cm, user.biotipo or 'No Definido', user.confianza_ia or 0.0)
            )
            
            conn.commit()
            return {"resultado": "Usuario y Perfil creados con éxito", "id": new_id, "id_usuario": new_id}
        
        except psycopg2.Error as err:
            if conn: conn.rollback()
            if err.pgcode == '23505':
                raise HTTPException(status_code=400, detail="Error: Ya existe un usuario con esa identificación o email.")
            raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(err)}")
        finally:
            if conn: conn.close()

    # GET_USERS
    def get_active_users(self):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT ON (u.id_usuario) 
                    u.id_usuario, 
                    u.identificacion, 
                    u.nombre_completo, 
                    u.email, 
                    t.numero AS telefono, 
                    u.genero, 
                    u.pais, 
                    u.departamento, 
                    u.ciudad, 
                    r.nombre_rol, 
                    pc.biotipo, 
                    u.estado, 
                    u.fecha_creacion
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                LEFT JOIN perfiles_clinicos pc ON u.id_usuario = pc.id_usuario
                LEFT JOIN telefono t ON u.id_usuario = t.id_usuario AND t.estado = 'Activo'
                WHERE u.estado = 'Activo'
            """
            cursor.execute(query)
            result = cursor.fetchall()
            
            payload = []
            for data in result:
                content = {
                    'id': data[0], 
                    'identificacion': data[1], 
                    'nombre': data[2],
                    'email': data[3], 
                    'telefono': data[4] if data[4] else "Sin registro",
                    'genero': data[5], 
                    'pais': data[6] if data[6] else "No definido",
                    'departamento': data[7] if data[7] else "No definido",
                    'ciudad': data[8] if data[8] else "No definido",
                    'rol': data[9], 
                    'biotipo': data[10], 
                    'estado': data[11],
                    'fecha_creacion': data[12]
                }
                payload.append(content)
            
            return {"resultado": jsonable_encoder(payload)}
                
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # GET_INACTIVE_USERS
    def get_inactive_users(self):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT ON (u.id_usuario) 
                    u.id_usuario, 
                    u.identificacion, 
                    u.nombre_completo, 
                    u.email, 
                    t.numero AS telefono, 
                    u.genero, 
                    u.pais, 
                    u.departamento, 
                    u.ciudad, 
                    r.nombre_rol, 
                    pc.biotipo, 
                    u.estado, 
                    u.fecha_creacion
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                LEFT JOIN perfiles_clinicos pc ON u.id_usuario = pc.id_usuario
                LEFT JOIN telefono t ON u.id_usuario = t.id_usuario AND t.estado = 'Activo'
                WHERE u.estado = 'Inactivo'
            """
            cursor.execute(query)
            result = cursor.fetchall()
            
            payload = []
            for data in result:
                content = {
                    'id': data[0], 
                    'identificacion': data[1], 
                    'nombre': data[2],
                    'email': data[3], 
                    'telefono': data[4] if data[4] else "Sin registro",
                    'genero': data[5], 
                    'pais': data[6] if data[6] else "No definido",
                    'departamento': data[7] if data[7] else "No definido",
                    'ciudad': data[8] if data[8] else "No definido",
                    'rol': data[9], 
                    'biotipo': data[10], 
                    'estado': data[11],
                    'fecha_creacion': data[12]
                }
                payload.append(content)
            
            return {"resultado": jsonable_encoder(payload)}
                
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # Actualizar datos de usuario
    def update_user(self, user: User):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Preparar campos para la actualización dinámica
            update_fields = {
                "nombre_completo": user.nombre_completo,
                "email": user.email,
                "genero": user.genero,
                "pais": user.pais,
                "departamento": user.departamento,
                "ciudad": user.ciudad,
                "id_rol": user.id_rol,
                "estado": user.estado,
            }
            
            # Solo actualizar password si fue enviado explícitamente y no es el override del admin
            if user.password_hash and user.password_hash != "admin_override":
                update_fields['password_hash'] = get_password_hash(user.password_hash)

            set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
            values = list(update_fields.values())
            values.append(user.id)

            query = f"UPDATE usuarios SET {set_clause}, fecha_actualizacion = NOW() WHERE id_usuario = %s"
            cursor.execute(query, tuple(values))

            # Actualizar o insertar teléfono
            if user.telefono:
                cursor.execute("SELECT id_telefono FROM telefono WHERE id_usuario = %s", (user.id,))
                existing_phone = cursor.fetchone()
                
                if existing_phone:
                    cursor.execute("UPDATE telefono SET numero = %s, fecha_actualizacion = NOW() WHERE id_telefono = %s", (user.telefono, existing_phone[0]))
                else:
                    cursor.execute("INSERT INTO telefono (id_usuario, numero, tipo) VALUES (%s, %s, 'Movil')", (user.id, user.telefono))
            
            conn.commit()
            return {"resultado": "Usuario actualizado con éxito"}
            
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # Desactivar cuenta de usuario (Soft Delete)
    def deactivate(self, user_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE usuarios SET estado = 'Inactivo', fecha_actualizacion = NOW() WHERE id_usuario = %s", (user_id,))
            conn.commit()
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
            return {"resultado": "Usuario desactivado con éxito (Soft Delete)"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # Reactivar cuenta de usuario
    def reactivate(self, user_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE usuarios SET estado = 'Activo', fecha_actualizacion = NOW() WHERE id_usuario = %s", (user_id,))
            conn.commit()
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
            return {"resultado": "Usuario reactivado con éxito"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # Actualizar biotipo del perfil clínico
    def update_biotype(self, user_id: int, biotipo: str, confianza: float):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE perfiles_clinicos 
                SET biotipo = %s, confianza_ia = %s, fecha_actualizacion = NOW()
                WHERE id_usuario = %s
            """, (biotipo, confianza, user_id))
            conn.commit()
            return {"resultado": "Biotipo actualizado por IA"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # Autenticar usuario por email y contraseña
    def authenticate_user(self, email: str, password: str):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
                SELECT id_usuario, email, password_hash, nombre_completo, id_rol, estado
                FROM usuarios
                WHERE email = %s AND estado = 'Activo'
            """
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=401, detail="Credenciales inválidas")
            
            user_id, user_email, hashed_password, nombre, rol, estado = result
            
            if not verify_password(password, hashed_password):
                raise HTTPException(status_code=401, detail="Credenciales inválidas")
            
            return {
                "id": user_id,
                "id_usuario": user_id,
                "email": user_email,
                "nombre": nombre,
                "id_rol": rol
            }
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(err)}")
        finally:
            if conn: conn.close()

    # Autenticar o crear usuario mediante Google OAuth2
    def get_or_create_google_user(self, email: str, nombre: str):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # Buscar usuario existente por email (activo o inactivo)
            cursor.execute(
                "SELECT id_usuario, email, nombre_completo, id_rol, estado FROM usuarios WHERE email = %s",
                (email,)
            )
            result = cursor.fetchone()

            if result:
                user_id, user_email, user_nombre, id_rol, estado = result
                if estado == 'Inactivo':
                    raise HTTPException(status_code=403, detail="Tu cuenta está desactivada. Contacta al administrador.")
                return {
                    "id": user_id,
                    "id_usuario": user_id,
                    "email": user_email,
                    "nombre": user_nombre,
                    "id_rol": id_rol
                }

            # Generar una identificación previa temporal para cuentas de Google (ej: G-1721578132)
            import time
            identificacion_temp = f"G-{int(time.time())}"

            # Generar hash ficticio no válido para cuentas de Google (evita restricción NOT NULL)
            # Al no ser una contraseña hash bcrypt/sha256 válida, no se podrá iniciar sesión directamente con contraseña
            google_dummy_hash = "$google_oauth_user_no_password$"

            # Crear nuevo usuario con datos de Google (sin contraseña local, rol 3 = paciente)
            cursor.execute(
                """
                INSERT INTO usuarios (identificacion, nombre_completo, email, genero, pais, departamento, ciudad, password_hash, id_rol)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_usuario
                """,
                (identificacion_temp, nombre, email, 'N/A', 'N/A', 'N/A', 'N/A', google_dummy_hash, 3)
            )
            new_id = cursor.fetchone()[0]



            # Crear perfil clínico vacío para el usuario nuevo
            cursor.execute(
                "INSERT INTO perfiles_clinicos (id_usuario, meta_calorica_diaria, biotipo, confianza_ia) VALUES (%s, %s, %s, %s)",
                (new_id, None, 'No Definido', 0.0)
            )

            conn.commit()
            return {
                "id": new_id,
                "id_usuario": new_id,
                "email": email,
                "nombre": nombre,
                "id_rol": 3
            }
        except HTTPException:
            raise
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(err)}")
        finally:
            if conn: conn.close()

    # MENSAJES_NUTRICIONISTA
    def send_mensaje(self, user_id: int, mensaje: str):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO mensajes_nutricionista (id_usuario, mensaje) 
                VALUES (%s, %s) RETURNING id_mensaje
            """, (user_id, mensaje))
            new_id = cursor.fetchone()[0]
            conn.commit()
            return {"resultado": "Mensaje enviado con éxito", "id": new_id}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    def get_mensajes(self, user_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id_mensaje, mensaje, estado, fecha_creacion
                FROM mensajes_nutricionista
                WHERE id_usuario = %s AND estado != 'Inactivo'
                ORDER BY fecha_creacion DESC
            """, (user_id,))
            result = cursor.fetchall()
            return {"resultado": [{"id": r[0], "mensaje": r[1], "estado": r[2], "fecha": r[3]} for r in result]}
        except psycopg2.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    def mark_mensaje_leido(self, mensaje_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE mensajes_nutricionista SET estado = 'Leido' WHERE id_mensaje = %s", (mensaje_id,))
            conn.commit()
            return {"resultado": "Mensaje finalizado"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()

    # REQUEST_PASSWORD_RESET
    def request_password_reset(self, email: str):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT id_usuario FROM usuarios WHERE email = %s", (email,))
            user = cursor.fetchone()
            
            if not user:
                # Por seguridad, no decimos si el email existe o no
                return {"resultado": "Si el correo está registrado, recibirás un enlace en breve."}
            
            from app.utils.auth import create_reset_token
            from app.utils.email_utils import send_reset_email
            
            token = create_reset_token(email)
            send_reset_email(email, token)
            
            return {"resultado": "Si el correo está registrado, recibirás un enlace en breve."}
        except Exception as e:
            print(f"Error en request_password_reset: {e}")
            raise HTTPException(status_code=500, detail="Error procesando la solicitud")
        finally:
            if conn: conn.close()

    # RESET_PASSWORD
    def reset_password(self, token: str, new_password: str):
        from app.utils.auth import verify_reset_token, get_password_hash
        
        email = verify_reset_token(token)
        if not email:
            raise HTTPException(status_code=400, detail="Token inválido o expirado")
            
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            new_hash = get_password_hash(new_password)
            cursor.execute("UPDATE usuarios SET password_hash = %s, fecha_actualizacion = NOW() WHERE email = %s", (new_hash, email))
            conn.commit()
            
            return {"resultado": "Contraseña actualizada con éxito"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()
    def admin_reset_password(self, user_id: int, new_password: str):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            new_hash = get_password_hash(new_password)
            cursor.execute("UPDATE usuarios SET password_hash = %s, fecha_actualizacion = NOW() WHERE id_usuario = %s", (new_hash, user_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
            conn.commit()
            return {"resultado": "Contraseña actualizada por el administrador con éxito"}
        except psycopg2.Error as err:
            if conn: conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            if conn: conn.close()
