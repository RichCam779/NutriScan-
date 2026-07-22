from fastapi import APIRouter, HTTPException, Request
from app.controllers.chat_interactive_controller import ChatController
from app.models.chat_model import ChatRequest
from app.utils.auth import verify_token

router = APIRouter(prefix="/chatbot", tags=["Chat Interaction"])
chat_controller = ChatController()

@router.post("/message")
async def chat_message(req: ChatRequest, request: Request):
    """
    Recibe un mensaje de chat y responde interactivamente.
    """
    token_data = await verify_token(request)
    if token_data.user_id != req.id_usuario and token_data.role_id not in [1, 2]:
         raise HTTPException(status_code=403, detail="No puedes enviar mensajes por otro usuario")

    return await chat_controller.processed_chat(req.id_usuario, req.mensaje)
