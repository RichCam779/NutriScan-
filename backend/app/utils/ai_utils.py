from ultralytics import YOLO
import cv2
import numpy as np
import os
from datetime import datetime

# ============================================================
# MAPA DE CLASES COCO → COMIDAS BARRANQUILLERAS
# Estrategia: mapear la detección visual más cercana de YOLO
# al alimento local más probable de Barranquilla
# ============================================================

# Clases de comida en COCO dataset (IDs 46-55 + algunos objetos relacionados)
COCO_FOOD_CLASS_IDS = [
    45,  # bowl   (tazón  → sopa → sancocho, mote de queso)
    46,  # banana
    47,  # apple
    48,  # sandwich
    49,  # orange
    50,  # broccoli
    51,  # carrot
    52,  # hot dog (perro caliente → butifarra, empanada cilíndrica)
    53,  # pizza   (circular → arepa de huevo, patacón)
    54,  # donut   (circular frito → carimañola, bollo de yuca)
    55,  # cake    (postre → dulce de papayuela)
    41,  # cup
]

# Mapeo COCO class name → nombre estándar en BD (alimentos NO locales)
COCO_TO_DB_NAME = {
    "apple":    "Manzana",
    "banana":   "Platano",
    "orange":   "Naranja",
    "sandwich": "Sandwich",
    "broccoli": "Brocoli",
    "pizza":    "Pizza",
    "cake":     "Pastel",
    "donut":    "Dona",
    "hot dog":  "Perro Caliente",
    "carrot":   "Zanahoria",
    "bowl":     "Arroz Blanco",
    "cup":      "Te Verde",
}

# ============================================================
# TABLA DE EQUIVALENCIAS VISUALES PARA COMIDAS BARRANQUILLERAS
# Clave  = clase COCO detectada por YOLO
# Valor  = lista de candidatos barranquilleros con su peso de
#          prioridad (mayor = más probable) y descriptores de
#          color / forma que disparan un bonus de puntuación
# ============================================================
BARRANQUILLA_FOOD_MAP = {
    # pizza / circular frito → arepa de huevo o patacón
    "pizza": [
        {"nombre": "Arepa de Huevo",     "prioridad": 10, "keywords": ["circular", "dorado", "frito", "amarillo", "naranja"]},
        {"nombre": "Patacon con Hogao",  "prioridad": 8,  "keywords": ["plano", "marron", "dorado", "frito"]},
    ],
    # donut / circular con hueco → carimañola o bollo de yuca
    "donut": [
        {"nombre": "Carimanola",         "prioridad": 10, "keywords": ["ovalado", "frito", "dorado", "naranja"]},
        {"nombre": "Bollo de Yuca",      "prioridad": 7,  "keywords": ["cilindrico", "verde", "envuelto"]},
    ],
    # hot dog / cilíndrico → butifarra o empanada
    "hot dog": [
        {"nombre": "Butifarra de Soledad", "prioridad": 10, "keywords": ["rojo", "cilindrico", "naranja", "frito"]},
        {"nombre": "Empanada Barranquillera", "prioridad": 8, "keywords": ["dorado", "frito", "naranja"]},
    ],
    # bowl / tazón → sancocho o mote de queso
    "bowl": [
        {"nombre": "Sancocho de Gallina", "prioridad": 10, "keywords": ["amarillo", "dorado", "naranja"]},
        {"nombre": "Mote de Queso",       "prioridad": 8,  "keywords": ["blanco", "crema", "claro"]},
        {"nombre": "Arroz de Lisa",       "prioridad": 6,  "keywords": ["blanco", "claro"]},
    ],
    # sandwich → empanada o arepa (masa rellena)
    "sandwich": [
        {"nombre": "Empanada Barranquillera", "prioridad": 9, "keywords": ["frito", "dorado", "naranja"]},
        {"nombre": "Arepa de Huevo",          "prioridad": 7, "keywords": ["circular", "amarillo", "frito"]},
    ],
    # cake / postre → dulce de papayuela
    "cake": [
        {"nombre": "Dulce de Papayuela",  "prioridad": 10, "keywords": ["rojo", "naranja", "amarillo", "claro"]},
    ],
    # banana → bollo de yuca (formas alargadas envueltas)
    "banana": [
        {"nombre": "Bollo de Yuca",       "prioridad": 8, "keywords": ["verde", "envuelto"]},
    ],
    # orange → empanada / arepa / dulce (objetos naranjas/dorados circulares)
    "orange": [
        {"nombre": "Empanada Barranquillera", "prioridad": 10, "keywords": ["frito", "dorado", "marron", "naranja"]},
        {"nombre": "Arepa de Huevo",          "prioridad": 8,  "keywords": ["circular", "amarillo", "naranja"]},
        {"nombre": "Dulce de Papayuela",      "prioridad": 5,  "keywords": ["rojo", "claro"]},
    ],
    # apple → empanada / arepa (objetos redondeados y pequeños)
    "apple": [
        {"nombre": "Empanada Barranquillera", "prioridad": 10, "keywords": ["frito", "dorado", "marron", "naranja"]},
        {"nombre": "Arepa de Huevo",          "prioridad": 8,  "keywords": ["circular", "amarillo", "naranja"]},
    ],
}

# Nombres exactos en BD de los 10 alimentos barranquilleros
BARRANQUILLA_FOODS_DB = [
    "Arepa de Huevo",
    "Empanada Barranquillera",
    "Sancocho de Gallina",
    "Patacon con Hogao",
    "Butifarra de Soledad",
    "Mote de Queso",
    "Arroz de Lisa",
    "Carimanola",
    "Bollo de Yuca",
    "Dulce de Papayuela",
]


class YOLOHandler:
    def __init__(self, model_name="yolov8n.pt"):
        # Buscar el archivo del "cerebro" de la IA
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.model_path = os.path.join(base_path, model_name)

        # Si no lo encuentra, intentar carga directa (ultralytics descargará si es necesario)
        if not os.path.exists(self.model_path):
            self.model_path = model_name

        try:
            print(f"Cargando modelo YOLO desde: {self.model_path}")
            self.model = YOLO(self.model_path)
            print("Modelo YOLO cargado correctamente.")
        except Exception as e:
            print(f"Error al inicializar YOLO: {e}. El sistema entrará en modo de resultados simulados.")
            self.model = None

    # ----------------------------------------------------------
    # ANÁLISIS DE BIOTIPO
    # ----------------------------------------------------------
    def detect_and_analyze_biotype(self, image_bytes):
        """
        Analiza el biotipo basado en la detección de una persona.
        """
        if not self.model:
            print("Aviso: Modo simulación (modelo no cargado).")
            return "Mesomorfo", 0.70

        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # El número 0 significa "Persona"
            results = self.model(img, classes=[0])

            if len(results) == 0 or len(results[0].boxes) == 0:
                return None, 0.0

            # Elegir a la persona con mayor confianza
            best_box = results[0].boxes[0]
            conf = float(best_box.conf[0])

            # Calcular biotipo por proporción ancho/alto del bounding box
            x1, y1, x2, y2 = best_box.xyxy[0]
            height = y2 - y1
            width = x2 - x1
            ratio = width / height

            if ratio < 0.35:
                biotype = "Ectomorfo"
            elif ratio > 0.50:
                biotype = "Endomorfo"
            else:
                biotype = "Mesomorfo"

            return biotype, conf * 100
        except Exception as e:
            print(f"Error durante la inferencia de biotipo: {e}")
            return "Mesomorfo", 50.0

    # ----------------------------------------------------------
    # ANÁLISIS DE COLOR DOMINANTE (Auxiliar)
    # ----------------------------------------------------------
    def _get_dominant_color_description(self, img, bbox=None):
        """
        Devuelve una lista de descriptores de color/textura del área de interés.
        Ayuda a diferenciar comidas visualmente similares entre sí.
        """
        try:
            if bbox is not None:
                x1, y1, x2, y2 = [int(v) for v in bbox]
                roi = img[y1:y2, x1:x2]
            else:
                roi = img

            if roi.size == 0:
                return []

            # Calcular color promedio en BGR → HSV
            roi_hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            avg_h = float(np.mean(roi_hsv[:, :, 0]))
            avg_s = float(np.mean(roi_hsv[:, :, 1]))
            avg_v = float(np.mean(roi_hsv[:, :, 2]))

            descriptors = []

            # Brillo (qué tan claro/oscuro)
            if avg_v > 180:
                descriptors.append("claro")
            elif avg_v < 80:
                descriptors.append("oscuro")

            # Saturación (colorido vs gris/blanco)
            if avg_s < 40:
                descriptors.append("blanco")
                descriptors.append("crema")

            # Tono de color (solo si hay suficiente saturación)
            if avg_s > 50:
                if avg_h < 15 or avg_h > 165:
                    descriptors.append("rojo")
                elif 15 <= avg_h < 30:
                    descriptors.append("naranja")
                    descriptors.append("dorado")
                elif 30 <= avg_h < 45:
                    descriptors.append("amarillo")
                    descriptors.append("dorado")
                elif 45 <= avg_h < 85:
                    descriptors.append("verde")
                elif 85 <= avg_h < 130:
                    descriptors.append("azul")
                elif 130 <= avg_h < 165:
                    descriptors.append("morado")

            # Aspecto frito (color marrón-dorado específico → zona HSV tostada)
            if 10 <= avg_h <= 30 and avg_s > 60 and 80 <= avg_v <= 200:
                descriptors.append("frito")
                descriptors.append("dorado")
                descriptors.append("marron")

            return descriptors
        except Exception as e:
            print(f"Error analizando color: {e}")
            return []

    # ----------------------------------------------------------
    # CLASIFICADOR PRINCIPAL: COMIDA BARRANQUILLERA
    # Sistema multi-etapa: YOLO → Análisis Visual → Mapeo Semántico
    # ----------------------------------------------------------
    def _classify_barranquilla_food(self, coco_label, confidence, img, bbox):
        """
        Dada una detección YOLO (clase COCO), determina si corresponde
        a una comida barranquillera usando análisis de color/contexto.

        Retorna: (nombre_barranquillero, confianza_ajustada, es_local)
        """
        candidates = BARRANQUILLA_FOOD_MAP.get(coco_label, [])
        if not candidates:
            # No hay mapeo barranquillero → retornar traducción estándar
            db_name = COCO_TO_DB_NAME.get(coco_label, coco_label)
            return db_name, confidence, False

        # Analizar color dominante del área detectada
        color_tags = self._get_dominant_color_description(img, bbox)
        print(f"[YOLO→Barranquilla] Clase COCO: '{coco_label}' | Colores detectados: {color_tags}")

        # Puntuar cada candidato barranquillero
        best_candidate = None
        best_score = -1

        for candidate in candidates:
            score = candidate["prioridad"]
            matched = False
            # Bonus por coincidencia de descriptores de color/forma
            for keyword in candidate["keywords"]:
                if keyword in color_tags:
                    score += 3
                    matched = True

            # Si no hay ninguna coincidencia visual de palabras clave, penalizar drásticamente el score
            if not matched:
                score -= 15

            print(f"  Candidato: '{candidate['nombre']}' → Score={score}")
            if score > best_score:
                best_score = score
                best_candidate = candidate

        # Solo aceptar el candidato si su score es positivo (evitar fallbacks incorrectos)
        if best_candidate and best_score > 0:
            matched_keywords = sum(1 for kw in best_candidate["keywords"] if kw in color_tags)
            # Ajustar confianza:
            # >= 2 coincidencias visuales → boost fuerte
            # 1 coincidencia              → boost leve
            # 0 coincidencias            → penalización (mapeo solo por forma)
            matched_keywords = sum(1 for kw in best_candidate["keywords"] if kw in color_tags)
            if matched_keywords >= 2:
                adjusted_conf = min(confidence * 1.15, 0.95)
            elif matched_keywords == 1:
                adjusted_conf = confidence * 1.05
            else:
                adjusted_conf = confidence * 0.85

            print(f"  ✓ Seleccionado: '{best_candidate['nombre']}' (confianza ajustada: {adjusted_conf:.2f})")
            return best_candidate["nombre"], adjusted_conf, True

        # Fallback
        db_name = COCO_TO_DB_NAME.get(coco_label, coco_label)
        return db_name, confidence, False

    # ----------------------------------------------------------
    # DETECCIÓN DE ALIMENTOS (Método Principal)
    # ----------------------------------------------------------
    def detect_food(self, image_bytes):
        """
        Detecta alimentos en la imagen.
        Combina detección YOLO con clasificación barranquillera multi-etapa.

        Retorna lista de dicts con:
          - label       : clase YOLO original
          - label_es    : nombre en español / nombre barranquillero
          - confidence  : confianza ajustada (0.0 - 1.0)
          - es_local    : True si es una comida típica barranquillera
          - bbox        : coordenadas [x1, y1, x2, y2]
        """
        if not self.model:
            return [{"label": "Generic Food", "confidence": 0.50, "label_es": "Alimento Genérico", "es_local": False}]

        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # Umbral bajo de confianza para no perder detecciones de comidas difíciles
            results = self.model(img, classes=COCO_FOOD_CLASS_IDS, conf=0.20)

            detections = []
            if len(results) > 0:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0])
                    coco_label = self.model.names[cls_id]
                    raw_conf = float(box.conf[0])
                    bbox = box.xyxy[0].tolist()

                    # Clasificación barranquillera multi-etapa
                    nombre_final, conf_ajustada, es_local = self._classify_barranquilla_food(
                        coco_label, raw_conf, img, bbox
                    )

                    detections.append({
                        "label":      coco_label,    # clase YOLO original
                        "label_es":   nombre_final,  # nombre en español / local
                        "confidence": conf_ajustada,
                        "es_local":   es_local,      # True si es comida barranquillera
                        "bbox":       bbox,
                    })

            # Ordenar por confianza descendente, priorizando alimentos locales
            detections.sort(key=lambda x: (x["es_local"], x["confidence"]), reverse=True)

            print(f"[YOLO] {len(detections)} detecciones encontradas.")
            for d in detections:
                tag = "🇨🇴 LOCAL" if d["es_local"] else "🌍 COCO"
                print(f"  {tag} | {d['label']} → {d['label_es']} ({d['confidence']:.2%})")

            return detections

        except Exception as e:
            print(f"Error durante la inferencia de comida: {e}")
            return []
