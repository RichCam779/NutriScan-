
from pydantic import BaseModel
from typing import Optional, Dict, Any

class HistorialCreate(BaseModel):
    data: Dict[str, Any]

class HistorialUpdate(BaseModel):
    data: Dict[str, Any]
