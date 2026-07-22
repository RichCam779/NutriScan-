from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

from app.controllers.user_controller import UserController
from app.utils.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, LoginResponse
from datetime import timedelta

router = APIRouter(
    prefix="/auth",
    tags=["auth-google"]
)

user_controller = UserController()

# Modelo de la peticion que llega desde el frontend
class GoogleLoginRequest(BaseModel):
    id_token: str

@router.post("/google", response_model=LoginResponse)
def login_with_google(payload: GoogleLoginRequest):
    """
    Recibe el id_token de Google Identity Services (GSI),
    verifica su autenticidad con Google, y devuelve un JWT de NutriScan.
    Si el usuario no existe, se crea automaticamente con rol 3 (paciente).
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id or client_id == "TU_CLIENT_ID_AQUI.apps.googleusercontent.com":
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID no esta configurado en el servidor. Revisa el archivo .env."
        )

    try:
        # Verificar el token con los servidores de Google
        idinfo = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            client_id
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Token de Google invalido: {str(e)}")

    # Extraer datos del perfil de Google
    email = idinfo.get("email")
    nombre = idinfo.get("name") or email.split("@")[0]

    if not email:
        raise HTTPException(status_code=400, detail="El token de Google no contiene un email valido.")

    # Buscar o crear el usuario en la base de datos
    user = user_controller.get_or_create_google_user(email=email, nombre=nombre)

    # Generar JWT propio de NutriScan
    access_token = create_access_token(
        data={
            "sub": str(user["id"]),
            "email": user["email"],
            "role_id": user["id_rol"]
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access": access_token,
        "id_rol": user["id_rol"],
        "nombre": user["nombre"],
        "email": user["email"],
        "id_usuario": user["id_usuario"]
    }
