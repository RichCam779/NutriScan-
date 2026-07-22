import sys
import os
sys.path.append(r"c:\NutriScan\backend")

from app.controllers.user_controller import UserController
from app.models.user_model import User

controller = UserController()
mock_user = User(
    nombre_completo="Test Create Admin User",
    email="testcreateadmin@gmail.com",
    identificacion="999991234",
    password_hash="TestPass123*",
    id_rol=3,
    genero="Masculino"
)

try:
    res = controller.create_user(mock_user)
    print("SUCCESS:", res)
except Exception as e:
    import traceback
    print("FAILED:")
    traceback.print_exc()
