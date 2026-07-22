from pydantic import BaseModel
from typing import Optional, Dict, Any

class ChatRequest(BaseModel):
    mensaje: str
    id_usuario: int
