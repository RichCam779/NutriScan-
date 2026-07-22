import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from datetime import datetime
import re
import os
import requests

class ChatController:
    def __init__(self):
        pass

    async def processed_chat(self, user_id: int, message: str):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # 1. Obtener datos del usuario (Nombre, Meta, y Plan Nutricional)
            cursor.execute("""
                SELECT 
                    u.nombre_completo, 
                    p.meta_calorica_diaria,
                    COALESCE(p.plan_proteinas_g, 0),
                    COALESCE(p.plan_carbohidratos_g, 0),
                    COALESCE(p.plan_grasas_g, 0),
                    COALESCE(p.plan_recomendaciones, ''),
                    COALESCE(p.plan_nutricionista_nombre, '')
                FROM usuarios u 
                LEFT JOIN perfiles_clinicos p ON u.id_usuario = p.id_usuario 
                WHERE u.id_usuario = %s
            """, (user_id,))
            user_data = cursor.fetchone()
            
            nombre_completo = user_data[0] if user_data and user_data[0] else "Usuario"
            nombre_usuario = nombre_completo.split()[0] if nombre_completo else "Usuario"
            meta = int(user_data[1]) if user_data and user_data[1] else 2000
            plan_proteinas = int(user_data[2]) if user_data else 0
            plan_carbohidratos = int(user_data[3]) if user_data else 0
            plan_grasas = int(user_data[4]) if user_data else 0
            plan_recomendaciones = user_data[5] if user_data else ""
            plan_nutricionista = user_data[6] if user_data else ""

            today = datetime.now().date()
            cursor.execute("""
                SELECT SUM(a.calorias * (r.cantidad_gramos / 100)) 
                FROM registro_consumo r
                JOIN alimentos a ON r.id_alimento = a.id_alimento
                WHERE r.id_usuario = %s AND r.fecha_consumo = %s AND r.estado = 'Activo'
            """, (user_id, today))
            consumido_hoy = cursor.fetchone()[0] or 0

            # Obtener alimentos consumidos hoy con detalle
            cursor.execute("""
                SELECT a.nombre, r.cantidad_gramos, (a.calorias * (r.cantidad_gramos / 100)) as calorias, r.tipo_comida
                FROM registro_consumo r
                JOIN alimentos a ON r.id_alimento = a.id_alimento
                WHERE r.id_usuario = %s AND r.fecha_consumo = %s AND r.estado = 'Activo'
            """, (user_id, today))
            consumos_hoy_db = cursor.fetchall()
            alimentos_hoy_list = [f"{c[0]} ({int(c[1])}g, {int(c[2])} kcal, {c[3]})" for c in consumos_hoy_db]

            # 2. Búsqueda Dinámica de Alimento (para mantener compatibilidad y fallback)
            message_lc = message.lower()
            respuesta = ""
            action = None
            food_data = None

            cursor.execute("SELECT id_alimento, nombre, calorias FROM alimentos WHERE estado = 'Activo'")
            alimentos = cursor.fetchall()
            
            found_food = None
            for f_id, f_nombre, f_cal in alimentos:
                if re.search(r'\b' + re.escape(f_nombre.lower()) + r'\b', message_lc):
                    found_food = {"id_alimento": f_id, "nombre": f_nombre, "calorias": f_cal}
                    break

            # 3. Intentar responder usando RAG con el contexto del paciente
            rag_url = os.getenv("RAG_URL", "http://localhost:8010/ask")
            patient_context = {
                "nombre": nombre_completo,
                "meta_calorica": meta,
                "consumido_hoy": int(consumido_hoy),
                "alimentos_hoy": alimentos_hoy_list,
                "plan_proteinas": plan_proteinas,
                "plan_carbohidratos": plan_carbohidratos,
                "plan_grasas": plan_grasas,
                "plan_recomendaciones": plan_recomendaciones,
                "plan_nutricionista": plan_nutricionista
            }

            rag_success = False
            try:
                response = requests.post(
                    rag_url,
                    json={
                        "question": message,
                        "patient_context": patient_context
                    },
                    timeout=8.0
                )
                if response.status_code == 200:
                    data = response.json()
                    respuesta = data.get("answer", "")
                    action = "rag_response"
                    rag_success = True
            except Exception as e:
                print(f"Error llamando al servicio RAG: {e}. Se usará la lógica de fallback local.")

            # Fallback en caso de que RAG falle o no esté disponible
            if not rag_success:
                if found_food:
                    cals = found_food["calorias"]
                    total_previsto = consumido_hoy + cals
                    respuesta = f"Hola {nombre_usuario}. Si comes '{found_food['nombre']}', sumarás {cals} calorías. "
                    respuesta += f"Llevarías un total de {int(total_previsto)} de tu meta de {meta} kcal. "
                    
                    if total_previsto > meta:
                        respuesta += f"\n\n⚠️ ¡Cuidado! Con esto te pasarías de tu meta diaria. Sugiero que tu próxima comida sea muy ligera para compensar."
                    else:
                        respuesta += f"\n\n✅ ¡Vas muy bien! Todavía tienes {int(meta - total_previsto)} kcal disponibles para el resto del día."
                    
                    action = "confirm_food"
                    food_data = found_food
                
                elif "1. conocer las calorías" in message_lc:
                    respuesta = f"🍎 ¡Claro {nombre_usuario}! Dime el nombre del alimento que quieres consultar (por ejemplo: Arroz, Pollo, Pizza...)."
                
                elif "2. saber cuál es el menú" in message_lc or "recomienda" in message_lc or "saludable" in message_lc or "menu" in message_lc:
                    disponible = meta - consumido_hoy
                    cursor.execute("""
                        SELECT nombre, calorias FROM alimentos 
                        WHERE estado = 'Activo' AND calorias < %s 
                        ORDER BY calorias ASC LIMIT 3
                    """, (max(100, disponible),))
                    recomendados = cursor.fetchall()
                    
                    if recomendados:
                        lista_rec = ", ".join([f"{r[0]} ({r[1]} kcal)" for r in recomendados])
                        respuesta = f"Hola {nombre_usuario}, para cuidar tu meta de {meta} kcal, hoy te sugiero opciones ligeras como: {lista_rec}. ¿Qué planeas comer?"
                    else:
                        respuesta = f"Hola {nombre_usuario}, te sugiero enfocarte en vegetales verdes y proteínas magras para mantenerte en tu meta de {meta} kcal."
                    action = "show_options"
                
                elif "pizza" in message_lc or "hamburguesa" in message_lc:
                    respuesta = f"Hola {nombre_usuario}. No está mal ocasionalmente, pero esas comidas suelen tener entre 500-800 kcal. Sugiero que compensas con un alimento ligero rico en fibra."
                else:
                    respuesta = f"¡Hola {nombre_usuario}! Soy tu asistente NutriBot AI. ¿Qué deseas hacer hoy?\n\n1. Conocer las calorías de un alimento.\n2. Saber cuál es el menú sugerido según mi meta."
                    action = "initial_guide"

            # 4. Guardar en historial
            cursor.execute("""
                INSERT INTO historial_chat (id_usuario, pregunta_usuario, respuesta_ia, fecha_creacion)
                VALUES (%s, %s, %s, %s)
            """, (user_id, message, respuesta, datetime.now()))
            conn.commit()

            return {
                "respuesta": respuesta,
                "action": action,
                "food": food_data,
                "stats": {
                    "meta": meta,
                    "consumido": consumido_hoy
                }
            }

        except Exception as e:
            if conn: conn.rollback()
            print(f"Error en ChatController: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if conn: conn.close()

