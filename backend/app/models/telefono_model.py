
from pydantic import BaseModel
from typing import Optional, Dict, Any

class TelefonoCreate(BaseModel):
    data: Dict[str, Any]

class TelefonoUpdate(BaseModel):
    data: Dict[str, Any]
