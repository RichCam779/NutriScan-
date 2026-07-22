
from pydantic import BaseModel
from typing import Optional, Dict, Any

class Perfiles_clinicosCreate(BaseModel):
    data: Dict[str, Any]

class Perfiles_clinicosUpdate(BaseModel):
    data: Dict[str, Any]
