from fastapi import HTTPException, UploadFile
from app.utils.ai_utils import YOLOHandler, BARRANQUILLA_FOODS_DB
from app.controllers.perfiles_clinicos_controller import Perfiles_clinicosController
from app.controllers.alimentos_controller import AlimentosController
from app.controllers.registro_consumo_controller import Registro_consumoController
from datetime import datetime
import os

class AIController:
    def __init__(self):
        # AI_INIT
        self.yolo = YOLOHandler()
        self.perfil_controller = Perfiles_clinicosController()
        self.alimento_controller = AlimentosController()
        self.consumo_controller = Registro_consumoController()

    async def analyze_biotype_anonymous(self, file: UploadFile):
        image_bytes = await file.read()
        biotype, confidence = self.yolo.detect_and_analyze_biotype(image_bytes)
        
        if not biotype:
            raise HTTPException(status_code=400, detail="No se pudo detectar una persona en la foto")
            
        return {
            "resultado": "Análisis completado",
            "biotipo_detectado": biotype,
            "confianza": f"{confidence:.2f}%"
        }

    async def analyze_biotype(self, user_id: int, file: UploadFile):
        # RUN_ANALYSIS
        image_bytes = await file.read()
        biotype, confidence = self.yolo.detect_and_analyze_biotype(image_bytes)
        
        if not biotype:
            raise HTTPException(status_code=400, detail="No se pudo detectar una persona en la foto")
            
        try:
            from app.config.db_config import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # DB_USER_CHECK
            cursor.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = %s", (user_id,))
            if not cursor.fetchone():
                 conn.close()
                 raise HTTPException(status_code=404, detail=f"El usuario con ID {user_id} no existe")

            # PC_SEARCH
            cursor.execute("SELECT id_perfil FROM perfiles_clinicos WHERE id_usuario = %s", (user_id,))
            row = cursor.fetchone()
            
            if not row:
                # DYNAMIC_PROFILE_CREATE
                cursor.execute(
                    "INSERT INTO perfiles_clinicos (id_usuario, biotipo, confianza_ia) VALUES (%s, %s, %s) RETURNING id_perfil",
                    (user_id, biotype, confidence / 100.0)
                )
                id_perfil = cursor.fetchone()[0]
                conn.commit()
            else:
                id_perfil = row[0]
                # PROFILE_UPDATE
                cursor.execute(
                    "UPDATE perfiles_clinicos SET biotipo = %s, confianza_ia = %s, fecha_actualizacion = %s WHERE id_perfil = %s",
                    (biotype, confidence / 100.0, datetime.now(), id_perfil)
                )
                conn.commit()
            
            conn.close()
            
            return {
                "resultado": "Análisis completado",
                "biotipo_detectado": biotype,
                "confianza": f"{confidence:.2f}%",
                "id_perfil": id_perfil
            }
            
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error en analyze_biotype: {e}")
            raise HTTPException(status_code=500, detail=f"Error al procesar biótipo: {str(e)}")

    async def analyze_food(self, user_id: int, file: UploadFile):
        image_bytes = await file.read()
        
        # FOOD_DETECTION — El nuevo YOLOHandler retorna label_es y es_local
        detections = self.yolo.detect_food(image_bytes)
        
        if not detections:
            raise HTTPException(status_code=400, detail="No se detectaron alimentos reconocibles")
            
        # DB_SEARCH
        from app.config.db_config import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        detected_foods_summary = []
        total_calories = 0
        total_proteins = 0.0
        total_carbs = 0.0
        total_fats = 0.0
        
        for detection in detections:
            conf = detection["confidence"]
            # Si la confianza es menor al 35%, ignorar la detección para evitar falsos positivos
            if conf < 0.35:
                continue

            translated_name = detection.get("label_es", detection["label"])
            es_local = detection.get("es_local", False)

            # Búsqueda exacta primero (para comidas barranquilleras), luego ILIKE
            food_db = None
            columns = []

            if es_local:
                # Búsqueda exacta por nombre barranquillero
                cursor.execute(
                    "SELECT * FROM alimentos WHERE nombre = %s AND estado = 'Activo' LIMIT 1",
                    (translated_name,)
                )
                columns = [desc[0] for desc in cursor.description]
                food_db = cursor.fetchone()

            if not food_db:
                # Búsqueda difusa como respaldo
                cursor.execute(
                    "SELECT * FROM alimentos WHERE nombre ILIKE %s AND estado = 'Activo' LIMIT 1",
                    (f"%{translated_name}%",)
                )
                columns = [desc[0] for desc in cursor.description]
                food_db = cursor.fetchone()
            
            if food_db:
                food_data = dict(zip(columns, food_db))
                
                calorias      = int(food_data.get("calorias", 0))
                proteinas     = float(food_data.get("proteinas_g", 0.0) or 0.0)
                carbohidratos = float(food_data.get("carbohidratos_g", 0.0) or 0.0)
                grasas        = float(food_data.get("grasas_g", 0.0) or 0.0)
                
                detected_foods_summary.append({
                    "nombre":        food_data["nombre"],
                    "calorias":      calorias,
                    "proteinas":     proteinas,
                    "carbohidratos": carbohidratos,
                    "grasas":        grasas,
                    "confianza_ia":  round(conf * 100, 2) if conf <= 1.0 else round(conf, 2),
                    "id_alimento":   food_data["id_alimento"],
                    "es_local":      es_local,
                    "categoria":     food_data.get("categoria", ""),
                })
                total_calories += calorias
                total_proteins += proteinas
                total_carbs    += carbohidratos
                total_fats     += grasas
            else:
                detected_foods_summary.append({
                    "nombre":        translated_name,
                    "calorias":      0,
                    "proteinas":     0.0,
                    "carbohidratos": 0.0,
                    "grasas":        0.0,
                    "confianza_ia":  round(conf * 100, 2) if conf <= 1.0 else round(conf, 2),
                    "id_alimento":   None,
                    "es_local":      es_local,
                    "mensaje":       "No encontrado en inventario de calorías",
                })

        # ------------------------------------------------------------
        # Heurística de plato balanceado: si hay carbohidratos y
        # vegetales pero no proteína, inferir Pechuga de Pollo
        # ------------------------------------------------------------
        has_carbs   = any(i.get("nombre") in ["Arroz Blanco", "Arroz de Lisa"] for i in detected_foods_summary)
        has_veggies = any(i.get("nombre") in ["Brocoli", "Zanahoria"] for i in detected_foods_summary)
        has_protein = any(i.get("nombre") in ["Pechuga de Pollo", "Carne de Res Magra"] for i in detected_foods_summary)
        
        if has_carbs and has_veggies and not has_protein:
            cursor.execute("SELECT * FROM alimentos WHERE nombre = 'Pechuga de Pollo' AND estado = 'Activo' LIMIT 1")
            columns_p = [desc[0] for desc in cursor.description]
            food_db_p = cursor.fetchone()
            if food_db_p:
                food_data_p    = dict(zip(columns_p, food_db_p))
                calorias_p     = int(food_data_p.get("calorias", 165))
                proteinas_p    = float(food_data_p.get("proteinas_g", 31.0) or 31.0)
                carbohidratos_p = float(food_data_p.get("carbohidratos_g", 0.0) or 0.0)
                grasas_p       = float(food_data_p.get("grasas_g", 3.6) or 3.6)
                
                detected_foods_summary.append({
                    "nombre":        "Pechuga de Pollo",
                    "calorias":      calorias_p,
                    "proteinas":     proteinas_p,
                    "carbohidratos": carbohidratos_p,
                    "grasas":        grasas_p,
                    "confianza_ia":  85.0,
                    "id_alimento":   food_data_p["id_alimento"],
                    "es_local":      False,
                    "mensaje":       "Detectado por composición típica del plato",
                })
                total_calories += calorias_p
                total_proteins += proteinas_p
                total_carbs    += carbohidratos_p
                total_fats     += grasas_p

        conn.close()
        
        if not detected_foods_summary:
            raise HTTPException(status_code=400, detail="Ninguno de los alimentos detectados fue procesado correctamente.")
        
        # Contabilizar cuántos alimentos locales se detectaron
        locales_detectados = [i for i in detected_foods_summary if i.get("es_local")]
        
        # Generar nombre resumido del combo
        names_list  = [item["nombre"] for item in detected_foods_summary]
        from collections import Counter
        counts       = Counter(names_list)
        summary_name = ", ".join([f"{count}x {name}" for name, count in counts.items()])
        
        # Calcular confianza promedio
        avg_confidence = sum([item["confianza_ia"] for item in detected_foods_summary]) / len(detected_foods_summary)
        
        # Identificador del primer alimento válido
        first_valid_id = next(
            (item["id_alimento"] for item in detected_foods_summary if item["id_alimento"] is not None),
            None
        )
        
        return {
            "alimento_detectado":   summary_name,
            "calorias":             total_calories,
            "proteinas":            round(total_proteins, 2),
            "carbohidratos":        round(total_carbs, 2),
            "grasas":               round(total_fats, 2),
            "confianza_ia":         round(avg_confidence, 2),
            "id_alimento":          first_valid_id,
            "alimentos_detectados": detected_foods_summary,
            "locales_detectados":   len(locales_detectados),
            "mensaje":              "Combo de Alimentos Procesado con Éxito" if first_valid_id else "Alimentos reconocidos por IA",
        }
