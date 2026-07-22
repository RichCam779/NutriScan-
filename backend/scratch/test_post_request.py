import requests
from jose import jwt

payload = {
    "nombre_completo": "Test Frontend Payload User",
    "email": "testfrontpayload@gmail.com",
    "identificacion": "9999912345",
    "password_hash": "Nutri123*",
    "id_rol": 3,
    "genero": "Masculino",
    "estado": "Activo",
    "pais": "Colombia",
    "departamento": "Cundinamarca",
    "ciudad": "Bogotá"
}

token = jwt.encode({"sub": "1", "email": "juan.admin@app.com", "role_id": 1}, "NutriScan2026SecureKey!@", algorithm="HS256")
headers = {"Authorization": f"Bearer {token}"}

try:
    res = requests.post("http://localhost:8000/users/", json=payload, headers=headers)
    print("STATUS CODE:", res.status_code)
    print("RESPONSE:", res.json())
except Exception as e:
    print("ERROR:", e)
