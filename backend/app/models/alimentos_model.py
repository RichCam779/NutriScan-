
from pydantic import BaseModel
from typing import Optional, Dict, Any

class AlimentosCreate(BaseModel):
    data: Dict[str, Any]

class AlimentosUpdate(BaseModel):
    data: Dict[str, Any]
