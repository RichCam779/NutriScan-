from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from app.controllers.ai_controller import AIController

router = APIRouter(prefix="/ai", tags=["AI Analysis"])

# Instanciar el controlador de IA
# El modelo YOLOv8n se cargará una vez al arrancar (o al primer uso)
ai_controller = AIController()

@router.post("/biotype-anonymous")
async def analyze_biotype_anonymous(file: UploadFile = File(...)):
    """
    Recibe una foto de la persona de forma anónima y dice qué tipo de cuerpo tiene.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")
    
    return await ai_controller.analyze_biotype_anonymous(file)

@router.post("/biotype/{user_id}")
async def analyze_biotype(user_id: int, file: UploadFile = File(...), request: Request = None):
    """
    Recibe una foto de la persona y dice qué tipo de cuerpo tiene.
    """
    from app.utils.auth import verify_token
    token_data = await verify_token(request)
    if token_data.user_id != user_id and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No tienes permiso para realizar esta acción para otro usuario")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")
    
    return await ai_controller.analyze_biotype(user_id, file)

@router.post("/food-recognition/{user_id}")
async def analyze_food(user_id: int, file: UploadFile = File(...), request: Request = None):
    """
    Recibe una foto de comida, dice qué es y cuántas calorías tiene.
    """
    from app.utils.auth import verify_token
    token_data = await verify_token(request)
    if token_data.user_id != user_id and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No tienes permiso para realizar esta acción para otro usuario")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")
        
    return await ai_controller.analyze_food(user_id, file)
