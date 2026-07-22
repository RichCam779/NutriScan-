
from pydantic import BaseModel
from typing import Optional, Dict, Any

class RolesCreate(BaseModel):
    data: Dict[str, Any]

class RolesUpdate(BaseModel):
    data: Dict[str, Any]
