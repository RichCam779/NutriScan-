
from fastapi import APIRouter, Request, HTTPException
from app.controllers.registro_consumo_controller import Registro_consumoController
from app.models.registro_consumo_model import Registro_consumoCreate, Registro_consumoUpdate
from app.utils.auth import verify_token

router = APIRouter(
    prefix="/registro_consumo",
    tags=["registro_consumo"]
)

controller = Registro_consumoController()

@router.get("/")
async def get_all(request: Request):
    await verify_token(request)
    return controller.get_all()

# IMPORTANT: Specific routes MUST come before generic /{item_id} to avoid route conflicts
@router.get("/usuario/{id_usuario}/hoy")
async def get_by_usuario_today(id_usuario: int, request: Request):
    token_data = await verify_token(request)
    # Seguridad: Un usuario solo puede ver su propio registro, a menos que sea Admin (1) o Nutricionista (2)
    if token_data.user_id != id_usuario and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No tienes permiso para ver los registros de otro usuario")
    return controller.get_by_usuario_today(id_usuario)

@router.get("/usuario/{id_usuario}")
async def get_by_usuario(id_usuario: int, request: Request):
    token_data = await verify_token(request)
    if token_data.user_id != id_usuario and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No tienes permiso para ver los registros de otro usuario")
    return controller.get_by_usuario(id_usuario)

@router.get("/{item_id}")
async def get_by_id(item_id: int, request: Request):
    await verify_token(request)
    return controller.get_by_id(item_id)

@router.post("/")
async def create(data: Registro_consumoCreate, request: Request):
    await verify_token(request)
    return controller.create(data.data)

@router.put("/{item_id}")
async def update(item_id: int, data: Registro_consumoUpdate, request: Request):
    await verify_token(request)
    return controller.update(item_id, data.data)

@router.delete("/{item_id}") # Se mantiene el método HTTP DELETE para la API, pero llama a deactivate
async def deactivate(item_id: int, request: Request):
    await verify_token(request)
    return controller.deactivate(item_id)
