from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from fastapi import HTTPException, status
from starlette.requests import Request
from dotenv import load_dotenv

# Cargar datos del sistema
load_dotenv()

# Ajustes de las llaves de seguridad
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "tu_clave_secreta_super_segura_cambiar_en_produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Protección de las contraseñas
# Usamos sha256_crypt para evitar errores de compatibilidad con bcrypt en algunas versiones de Windows
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Estructura de los datos de usuario
class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role_id: Optional[int] = None

class LoginResponse(BaseModel):
    access: str
    id_rol: int
    nombre: str
    email: str
    id_usuario: int

class LoginRequest(BaseModel):
    email: str
    password: str


# Función para revisar si la contraseña es correcta
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return plain_password == hashed_password

# Función para encriptar la contraseña
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Función para crear el pase de entrada (Token)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Función para revisar el pase de entrada
async def verify_token(request: Request) -> TokenData:
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        parts = auth_header.split()
        if len(parts) == 2:
            scheme, token = parts
            if scheme.lower() != "bearer":
                raise HTTPException(status_code=401, detail="Esquema inválido")
        elif len(parts) == 1:
            token = parts[0]
        else:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        email: str = payload.get("email")
        role_id: int = payload.get("role_id")
        
        if user_id_str is None or email is None:
            raise HTTPException(status_code=401, detail="Token incompleto")
        
        return TokenData(user_id=int(user_id_str), email=email, role_id=role_id)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")

# Crear pase para cambiar la contraseña
def create_reset_token(email: str) -> str:
    # El token de reseteo dura 15 minutos
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": email, "exp": expire, "type": "reset"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Revisar el pase para cambiar la contraseña
def verify_reset_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub") # Devuelve el email
    except Exception:
        return None
