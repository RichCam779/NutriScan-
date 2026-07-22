import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from app.config import settings

# IMPORTACIÓN CORRECTA: Traemos get_answer e initialize_chain según el mapa del archivo del profesor
from app.rag_chain import get_answer, initialize_chain 

# Configuración de registros (logs) en la consola para monitorear las peticiones
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde al comando /start cuando el usuario inicia el bot en Telegram."""
    user_name = update.effective_user.first_name
    await update.message.reply_text(
        f"¡Hola {user_name}! Bienvenido al asistente inteligente de NutriScan 🥑.\n\n"
        "Puedes hacerme cualquier pregunta técnica, nutricional o de arquitectura sobre el prototipo "
        "y buscaré la respuesta dentro de la documentación indexada en ChromaDB."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Procesa los mensajes de texto normales que le envíes al bot."""
    user_question = update.message.text
    
    # Activa el indicador "Escribiendo..." en el chat de Telegram del usuario
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
    
    try:
        # Ejecuta la consulta usando la función nativa del proyecto
        response = get_answer(user_question)
        
        # Validamos si la respuesta viene dentro de un diccionario o como texto directo
        if isinstance(response, dict):
            answer = response.get("answer", "No se encontró una respuesta estructurada.")
        else:
            answer = response
        
        # Envía la respuesta generada por el LLM de vuelta al celular
        await update.message.reply_text(answer)
        
    except Exception as e:
        logging.error(f"Error al procesar la consulta en el RAG: {e}")
        await update.message.reply_text(
            "⚠️ Lo siento, ocurrió un error interno en el servidor al consultar la base de datos de NutriScan."
        )

def main():
    """Inicializa los componentes del RAG y enciende el Bot de Telegram."""
    
    # 1. FORZAR LA INICIALIZACIÓN: Cargamos ChromaDB y conectamos Groq de forma autónoma
    print("📦 [CONFIG] Inicializando la cadena RAG y montando la base de datos...")
    initialize_chain()
    
    # Validamos que el Token del archivo .env no esté vacío
    if not settings.TELEGRAM_BOT_TOKEN:
        print("❌ ERROR CRÍTICO: La variable TELEGRAM_BOT_TOKEN no está configurada en tu archivo .env")
        return

    # 2. CONEXIÓN CON TELEGRAM: Construimos la aplicación usando tu token válido
    application = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()

    # Mapeamos las funciones a los eventos del chat
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # 3. ARRANCAR ESCUCHA: Iniciamos el bucle en tiempo real (Polling)
    print("🤖 [ÉXITO] ¡Bot de Telegram de NutriScan activo y escuchando mensajes!")
    application.run_polling()

if __name__ == "__main__":
    main()