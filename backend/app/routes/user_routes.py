from fastapi import APIRouter, HTTPException, Request
import requests
from app.controllers.user_controller import UserController
from app.models.user_model import User, BiotypeUpdate
from app.utils.auth import verify_token, TokenData
from typing import List
import os

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

user_controller = UserController()

# Conexión con el servicio de ubicaciones externo
NODE_SERVICE_URL = os.getenv("NODE_SERVICE_URL", "https://proyecto-rc-jju7.vercel.app/api/ubicaciones") 

@router.get("/locations")
def get_external_locations():
    try:
        response = requests.get(NODE_SERVICE_URL, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="El servicio de ubicaciones devolvió un error.")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Tiempo de espera agotado.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="Error de conexión.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# Registro libre para nuevos usuarios
@router.post("/register", response_model=dict)
async def register_user(user: User):
    return user_controller.create_user(user)

# Funciones para crear, ver y borrar usuarios
@router.post("/", response_model=dict)
async def create_user(user: User, request: Request):
    await verify_token(request)
    return user_controller.create_user(user)

@router.get("/", response_model=dict)
async def get_active_users(request: Request):
    await verify_token(request)
    return user_controller.get_active_users()

@router.get("/inactive", response_model=dict)
async def get_inactive_users(request: Request):
    await verify_token(request)
    return user_controller.get_inactive_users()

@router.put("/{user_id}", response_model=dict)
async def update_user(user_id: int, user: User, request: Request):
    await verify_token(request)
    user.id = user_id
    return user_controller.update_user(user)

@router.delete("/{user_id}", response_model=dict)
async def deactivate(user_id: int, request: Request):
    await verify_token(request)
    return user_controller.deactivate(user_id)

@router.post("/{user_id}/reactivate", response_model=dict)
async def reactivate(user_id: int, request: Request):
    await verify_token(request)
    return user_controller.reactivate(user_id)

# Actualizar el tipo de cuerpo (biotipo)
@router.put("/{user_id}/biotype")
async def update_biotype(user_id: int, data: BiotypeUpdate, request: Request): 
    await verify_token(request)
    return user_controller.update_biotype(user_id, data.biotipo, data.confianza_ia)

# Mensajes entre nutricionista y paciente
from pydantic import BaseModel
class MensajeCreate(BaseModel):
    mensaje: str

@router.post("/{user_id}/mensajes")
async def send_mensaje(user_id: int, data: MensajeCreate, request: Request):
    await verify_token(request)
    return user_controller.send_mensaje(user_id, data.mensaje)

@router.get("/{user_id}/mensajes")
async def get_mensajes(user_id: int, request: Request):
    token_data = await verify_token(request)
    if token_data.user_id != user_id and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No tienes permiso para ver los mensajes de otro usuario")
    return user_controller.get_mensajes(user_id)

@router.put("/mensajes/{mensaje_id}/leido")
async def mark_mensaje_leido(mensaje_id: int, request: Request):
    await verify_token(request)
    return user_controller.mark_mensaje_leido(mensaje_id)

# Pasos para recuperar la contraseña olvidada
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    return user_controller.request_password_reset(data.email)

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    return user_controller.reset_password(data.token, data.new_password)
@router.put("/{user_id}/reset-password-admin")
async def admin_reset_password(user_id: int, data: ResetPasswordRequest, request: Request):
    token_data = await verify_token(request)
    # Solo el Admin (rol 1) puede usar esta ruta
    if token_data.role_id != 1:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
    return user_controller.admin_reset_password(user_id, data.new_password)
