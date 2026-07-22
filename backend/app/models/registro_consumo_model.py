
from pydantic import BaseModel
from typing import Optional, Dict, Any

class Registro_consumoCreate(BaseModel):
    data: Dict[str, Any]

class Registro_consumoUpdate(BaseModel):
    data: Dict[str, Any]
