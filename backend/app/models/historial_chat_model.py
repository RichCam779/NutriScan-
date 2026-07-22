
from pydantic import BaseModel
from typing import Optional, Dict, Any

class Historial_chatCreate(BaseModel):
    data: Dict[str, Any]

class Historial_chatUpdate(BaseModel):
    data: Dict[str, Any]
