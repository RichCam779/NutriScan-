
from pydantic import BaseModel
from typing import Optional, Dict, Any

class ModulosCreate(BaseModel):
    data: Dict[str, Any]

class ModulosUpdate(BaseModel):
    data: Dict[str, Any]
