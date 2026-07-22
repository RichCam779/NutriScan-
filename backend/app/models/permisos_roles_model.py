
from pydantic import BaseModel
from typing import Optional, Dict, Any

class Permisos_rolesCreate(BaseModel):
    data: Dict[str, Any]

class Permisos_rolesUpdate(BaseModel):
    data: Dict[str, Any]
