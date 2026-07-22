
from fastapi import APIRouter, Request, HTTPException
from app.controllers.modulos_controller import ModulosController
from app.models.modulos_model import ModulosCreate, ModulosUpdate
from app.utils.auth import verify_token

router = APIRouter(
    prefix="/modulos",
    tags=["modulos"]
)

controller = ModulosController()

@router.get("/")
async def get_all(request: Request):
    await verify_token(request)
    return controller.get_all()

@router.get("/{item_id}")
async def get_by_id(item_id: int, request: Request):
    await verify_token(request)
    return controller.get_by_id(item_id)

@router.post("/")
async def create(data: ModulosCreate, request: Request):
    await verify_token(request)
    return controller.create(data.data)

@router.put("/{item_id}")
async def update(item_id: int, data: ModulosUpdate, request: Request):
    await verify_token(request)
    return controller.update(item_id, data.data)

@router.delete("/{item_id}") # Se mantiene el método HTTP DELETE para la API, pero llama a deactivate
async def deactivate(item_id: int, request: Request):
    await verify_token(request)
    return controller.deactivate(item_id)
