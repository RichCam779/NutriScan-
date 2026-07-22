
from fastapi import APIRouter, Request, HTTPException
from app.controllers.telefono_controller import TelefonoController
from app.models.telefono_model import TelefonoCreate, TelefonoUpdate
from app.utils.auth import verify_token

router = APIRouter(
    prefix="/telefono",
    tags=["telefono"]
)

controller = TelefonoController()

@router.get("/")
async def get_all(request: Request):
    await verify_token(request)
    return controller.get_all()

@router.get("/{item_id}")
async def get_by_id(item_id: int, request: Request):
    await verify_token(request)
    return controller.get_by_id(item_id)

@router.get("/usuario/{user_id}")
async def get_by_usuario_id(user_id: int, request: Request):
    token_data = await verify_token(request)
    if token_data.user_id != user_id and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No tienes permiso para ver el teléfono de otro usuario")
    return controller.get_by_usuario_id(user_id)

@router.post("/")
async def create(data: TelefonoCreate, request: Request):
    await verify_token(request)
    return controller.create(data.data)

@router.put("/{item_id}")
async def update(item_id: int, data: TelefonoUpdate, request: Request):
    await verify_token(request)
    return controller.update(item_id, data.data)

@router.delete("/{item_id}") # Se mantiene el método HTTP DELETE para la API, pero llama a deactivate
async def deactivate(item_id: int, request: Request):
    await verify_token(request)
    return controller.deactivate(item_id)
