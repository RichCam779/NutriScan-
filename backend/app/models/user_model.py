from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# USER_MODEL
class User(BaseModel):
    id: Optional[int] = None
    identificacion: Optional[str] = None
    nombre_completo: str
    email: EmailStr
    genero: Optional[str] = "N/A"
    pais: Optional[str] = "N/A"
    departamento: Optional[str] = "N/A"
    ciudad: Optional[str] = "N/A"
    telefono: Optional[str] = None
    tipo_telefono: Optional[str] = "Personal"
    edad: Optional[int] = None
    peso_kg: Optional[float] = None
    altura_cm: Optional[float] = None
    meta_calorica: Optional[int] = None
    password_hash: Optional[str] = None
    id_rol: int
    biotipo: Optional[str] = None
    confianza_ia: Optional[float] = None
    estado: Optional[str] = "Activo"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# BIOTYPE_MODEL
class BiotypeUpdate(BaseModel):
    biotipo: str
    confianza_ia: float