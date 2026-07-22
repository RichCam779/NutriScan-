from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from .routes.user_routes import router as user_router
from .routes.roles_routes import router as roles_router
from .routes.modulos_routes import router as modulos_router
from .routes.telefono_routes import router as telefono_router
from .routes.perfiles_clinicos_routes import router as perfiles_clinicos_router
from .routes.alimentos_routes import router as alimentos_router
from .routes.permisos_roles_routes import router as permisos_roles_router
from .routes.registro_consumo_routes import router as registro_consumo_router
from .routes.historial_routes import router as historial_router
from .routes.historial_chat_routes import router as historial_chat_router
from .routes.ai_routes import router as ai_router
from .routes.chat_interactive_routes import router as chat_chatbot_router
from .routes.google_auth_routes import router as google_auth_router

from .utils.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, LoginResponse, LoginRequest
from .controllers.user_controller import UserController
from datetime import timedelta

# Ajustes del sistema API
app = FastAPI(title="NutriScan API")

# Permisos de conexión (CORS)
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:5173",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lista de funciones y servicios
app.include_router(user_router)
app.include_router(roles_router)
app.include_router(modulos_router)
app.include_router(telefono_router)
app.include_router(perfiles_clinicos_router)
app.include_router(alimentos_router)
app.include_router(permisos_roles_router)
app.include_router(registro_consumo_router)
app.include_router(historial_router)
app.include_router(historial_chat_router)
app.include_router(ai_router)
app.include_router(chat_chatbot_router)
app.include_router(google_auth_router)

# Control de cuentas de usuario
user_controller = UserController()

@app.get("/")
def home():
    return {
        "message": "NutriScan API está en línea",
        "docs": "/docs"
    }

# Entrada al sistema (Login)
@app.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    user = user_controller.authenticate_user(credentials.email, credentials.password)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"], "role_id": user["id_rol"]},
        expires_delta=access_token_expires
    )
    
    return {
        "access": access_token,
        "id_rol": user["id_rol"],
        "nombre": user["nombre"],
        "email": user["email"],
        "id_usuario": user["id"]
    }

# Configuración del manual (Swagger)
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="NutriScan API",
        version="1.0.0",
        description="API de NutriScan con autenticación JWT",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    openapi_schema["security"] = [{"bearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Iniciar todo el servidor
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
