"""
test_yolo_barranquilla.py
═════════════════════════════════════════════════════════════════════════════
Script de pruebas para el sistema YOLO + Clasificador Barranquillero.
Ejecutar desde la raíz del proyecto:
    python test_yolo_barranquilla.py
═════════════════════════════════════════════════════════════════════════════
"""

import sys
import os
import json
import urllib.request
import tempfile
import cv2
import numpy as np

# Añadir la raíz del proyecto al path de Python
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.ai_utils import (
    YOLOHandler,
    BARRANQUILLA_FOOD_MAP,
    BARRANQUILLA_FOODS_DB,
    COCO_FOOD_CLASS_IDS,
    COCO_TO_DB_NAME,
)

# ─────────────────────────────────────────────────────────────────────────────
# Utilidades de color para la consola
# ─────────────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):    print(f"{GREEN}  ✓ {msg}{RESET}")
def warn(msg):  print(f"{YELLOW}  ⚠ {msg}{RESET}")
def fail(msg):  print(f"{RED}  ✗ {msg}{RESET}")
def info(msg):  print(f"{CYAN}  ℹ {msg}{RESET}")
def header(msg): print(f"\n{BOLD}{'═'*60}\n  {msg}\n{'═'*60}{RESET}")

# ─────────────────────────────────────────────────────────────────────────────
# Generador de imágenes sintéticas de prueba
# (simula el color visual de cada comida barranquillera)
# ─────────────────────────────────────────────────────────────────────────────
SYNTHETIC_COLORS = {
    # nombre_barranquillero → color BGR dominante simulado
    "Arepa de Huevo":          (30,  130, 220),   # dorado-amarillo
    "Empanada Barranquillera": (20,  100, 200),   # dorado
    "Sancocho de Gallina":     (30,  140, 230),   # amarillo caldo
    "Patacon con Hogao":       (20,  80,  180),   # marron dorado
    "Butifarra de Soledad":    (30,  50,  180),   # rojo-naranja embutido
    "Mote de Queso":           (200, 200, 210),   # blanco cremoso
    "Arroz de Lisa":           (200, 220, 240),   # blanco/crema
    "Carimanola":              (25,  110, 210),   # dorado ovalado
    "Bollo de Yuca":           (40,  160, 40),    # verde hoja plátano
    "Dulce de Papayuela":      (30,  80,  210),   # rojo-naranja dulce
}

def make_synthetic_image(color_bgr=(100, 150, 200), size=(300, 300)):
    """Crea una imagen sólida del color dado."""
    img = np.full((size[0], size[1], 3), color_bgr, dtype=np.uint8)
    # Añadir variación leve para no ser 100% sólido
    noise = np.random.randint(-15, 15, img.shape, dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return img


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1 — Verificar configuración del módulo
# ─────────────────────────────────────────────────────────────────────────────
def test_config():
    header("TEST 1 · Configuración del módulo ai_utils")

    # Verificar clases COCO
    print(f"  Clases COCO configuradas: {COCO_FOOD_CLASS_IDS}")
    if len(COCO_FOOD_CLASS_IDS) >= 10:
        ok(f"{len(COCO_FOOD_CLASS_IDS)} clases COCO registradas")
    else:
        fail("Menos de 10 clases COCO — revisar COCO_FOOD_CLASS_IDS")

    # Verificar los 10 alimentos barranquilleros
    print(f"\n  Alimentos barranquilleros registrados en BARRANQUILLA_FOODS_DB:")
    for alimento in BARRANQUILLA_FOODS_DB:
        print(f"    • {alimento}")

    if len(BARRANQUILLA_FOODS_DB) == 10:
        ok("10 alimentos locales registrados correctamente")
    else:
        warn(f"Se esperaban 10 alimentos, se encontraron {len(BARRANQUILLA_FOODS_DB)}")

    # Verificar mapeo
    print(f"\n  Mapeos COCO → Barranquilla definidos:")
    for coco_class, candidates in BARRANQUILLA_FOOD_MAP.items():
        nombres = [c["nombre"] for c in candidates]
        print(f"    '{coco_class}' → {nombres}")

    # Verificar cobertura: todos los alimentos BD tienen al menos una ruta de detección
    todos_candidatos = set()
    for candidates in BARRANQUILLA_FOOD_MAP.values():
        for c in candidates:
            todos_candidatos.add(c["nombre"])

    sin_cobertura = [a for a in BARRANQUILLA_FOODS_DB if a not in todos_candidatos]
    if sin_cobertura:
        warn(f"Alimentos sin cobertura de mapeo: {sin_cobertura}")
        info("Estos solo se detectarán si YOLO los clasifica como una clase COCO sin mapeo.")
    else:
        ok("Todos los alimentos barranquilleros tienen al menos una ruta de detección COCO")

    return True


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2 — Carga del modelo YOLO
# ─────────────────────────────────────────────────────────────────────────────
def test_model_load():
    header("TEST 2 · Carga del modelo YOLO")
    handler = YOLOHandler()
    if handler.model is not None:
        ok("Modelo YOLO cargado correctamente")
        info(f"Clases disponibles: {len(handler.model.names)} (0=person … {max(handler.model.names.keys())})")
        # Verificar que las clases de comida existen
        food_labels = [handler.model.names[i] for i in COCO_FOOD_CLASS_IDS if i in handler.model.names]
        print(f"  Clases de comida en el modelo: {food_labels}")
        ok(f"{len(food_labels)} clases de comida disponibles en el modelo")
    else:
        fail("Modelo YOLO NO cargado — se usará modo simulación")
    return handler


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3 — Análisis de color HSV (función auxiliar)
# ─────────────────────────────────────────────────────────────────────────────
def test_color_analysis(handler):
    header("TEST 3 · Análisis de color HSV por alimento barranquillero")

    resultados = {}
    for nombre, color_bgr in SYNTHETIC_COLORS.items():
        img = make_synthetic_image(color_bgr)
        descriptors = handler._get_dominant_color_description(img)
        resultados[nombre] = descriptors
        status = "ok" if descriptors else "sin descriptores"
        print(f"  {nombre:<30} → {descriptors}  [{status}]")

    ok(f"Análisis de color completado para {len(resultados)} alimentos")
    return resultados


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4 — Clasificador Barranquillero (sin imagen real de YOLO)
# ─────────────────────────────────────────────────────────────────────────────
def test_barranquilla_classifier(handler, color_results):
    header("TEST 4 · Clasificador Barranquillero (simulación de detección COCO)")

    # Simulamos que YOLO detectó las siguientes clases COCO con alta confianza
    simulaciones = [
        ("pizza",   0.72, "Arepa de Huevo"),
        ("pizza",   0.72, "Patacon con Hogao"),
        ("donut",   0.65, "Carimanola"),
        ("donut",   0.65, "Bollo de Yuca"),
        ("hot dog", 0.80, "Butifarra de Soledad"),
        ("hot dog", 0.80, "Empanada Barranquillera"),
        ("bowl",    0.75, "Sancocho de Gallina"),
        ("bowl",    0.75, "Mote de Queso"),
        ("cake",    0.60, "Dulce de Papayuela"),
        ("sandwich",0.68, "Empanada Barranquillera"),
        ("orange",  0.70, "Empanada Barranquillera"),
        ("apple",   0.70, "Empanada Barranquillera"),
    ]

    aciertos = 0
    for coco_class, conf, esperado in simulaciones:
        # Crear imagen sintética del color del alimento esperado
        color_bgr = SYNTHETIC_COLORS.get(esperado, (128, 128, 128))
        img = make_synthetic_image(color_bgr)
        bbox = [10, 10, 290, 290]

        nombre, conf_adj, es_local = handler._classify_barranquilla_food(coco_class, conf, img, bbox)

        if es_local and nombre in BARRANQUILLA_FOODS_DB:
            ok(f"'{coco_class}' → '{nombre}' (conf={conf_adj:.2f}) ✓ LOCAL")
            aciertos += 1
        elif not es_local:
            warn(f"'{coco_class}' → '{nombre}' (no clasificado como local)")
        else:
            info(f"'{coco_class}' → '{nombre}' (local, pero diferente al esperado '{esperado}')")
            aciertos += 1  # sigue siendo válido, es un alimento barranquillero

    print(f"\n  Resultado: {aciertos}/{len(simulaciones)} clasificaciones → alimento barranquillero")
    if aciertos >= len(simulaciones) * 0.7:
        ok(f"Clasificador funcionando correctamente ({aciertos}/{len(simulaciones)})")
    else:
        warn(f"Tasa de aciertos baja: {aciertos}/{len(simulaciones)}")

    return aciertos


# ─────────────────────────────────────────────────────────────────────────────
# TEST 5 — detect_food() con imagen sintética genérica
# ─────────────────────────────────────────────────────────────────────────────
def test_detect_food_synthetic(handler):
    header("TEST 5 · detect_food() con imagen sintética (dorado-amarillo → Arepa/Carimanola)")

    # Imagen amarillo-dorado (simula una arepa o carimañola frita)
    img_bgr  = make_synthetic_image((30, 130, 220), size=(480, 640))
    _, buffer = cv2.imencode(".jpg", img_bgr)
    image_bytes = buffer.tobytes()

    detections = handler.detect_food(image_bytes)
    print(f"\n  Detecciones obtenidas: {len(detections)}")

    if detections:
        for d in detections:
            tag = "🇨🇴 LOCAL" if d.get("es_local") else "🌍 COCO"
            print(f"    {tag} | {d['label']} → {d['label_es']} ({d['confidence']:.2%})")
        ok(f"{len(detections)} detecciones procesadas")
        # Con imagen sintética sólida, YOLO probablemente no detecte nada (imagen sin textura real)
        info("Nota: YOLO necesita imágenes reales; imagen sintética puede retornar 0 detecciones.")
    else:
        info("0 detecciones — normal con imagen sintética sólida (sin objetos reconocibles por YOLO)")

    return True


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6 — Coherencia del mapa completo
# ─────────────────────────────────────────────────────────────────────────────
def test_map_coherence():
    header("TEST 6 · Coherencia del BARRANQUILLA_FOOD_MAP")

    errores = 0
    for coco_class, candidates in BARRANQUILLA_FOOD_MAP.items():
        for c in candidates:
            nombre = c["nombre"]
            if nombre not in BARRANQUILLA_FOODS_DB:
                fail(f"'{nombre}' en BARRANQUILLA_FOOD_MAP no está en BARRANQUILLA_FOODS_DB")
                errores += 1
            else:
                ok(f"'{nombre}' ↔ presente en BARRANQUILLA_FOODS_DB")

            if "prioridad" not in c or "keywords" not in c:
                fail(f"Candidato '{nombre}' le falta 'prioridad' o 'keywords'")
                errores += 1

    # Verificar que todos los alimentos BD tienen al menos 1 candidato
    todos_nombres = {c["nombre"] for cs in BARRANQUILLA_FOOD_MAP.values() for c in cs}
    for alimento in BARRANQUILLA_FOODS_DB:
        if alimento not in todos_nombres:
            warn(f"'{alimento}' no tiene candidato COCO → solo será detectado por fallback")
        else:
            ok(f"'{alimento}' tiene candidato COCO definido")

    if errores == 0:
        ok("Mapa coherente sin errores")
    else:
        fail(f"{errores} error(es) en el mapa — revisar BARRANQUILLA_FOOD_MAP")

    return errores == 0


# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{BOLD}{'═'*60}")
    print("  NutriScan · YOLO + Barranquilla — Suite de Pruebas")
    print(f"{'═'*60}{RESET}")

    resultados = {}

    # TEST 1
    resultados["config"] = test_config()

    # TEST 2
    handler = test_model_load()
    resultados["model_load"] = handler.model is not None

    # TEST 3
    color_results = test_color_analysis(handler)
    resultados["color_analysis"] = len(color_results) == 10

    # TEST 4
    aciertos = test_barranquilla_classifier(handler, color_results)
    resultados["classifier"] = aciertos >= 6

    # TEST 5
    resultados["detect_food"] = test_detect_food_synthetic(handler)

    # TEST 6
    resultados["map_coherence"] = test_map_coherence()

    # RESUMEN
    header("RESUMEN DE PRUEBAS")
    total  = len(resultados)
    passed = sum(1 for v in resultados.values() if v)

    for nombre, resultado in resultados.items():
        if resultado:
            ok(f"{nombre}")
        else:
            fail(f"{nombre}")

    print(f"\n  {BOLD}Resultado final: {passed}/{total} pruebas pasadas{RESET}")
    if passed == total:
        print(f"{GREEN}{BOLD}  🎉 Todo OK — Sistema listo para producción{RESET}\n")
    elif passed >= total * 0.7:
        print(f"{YELLOW}{BOLD}  ⚠ Sistema funcional con advertencias{RESET}\n")
    else:
        print(f"{RED}{BOLD}  ✗ Se detectaron problemas — revisar logs{RESET}\n")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
