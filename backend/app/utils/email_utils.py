import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

# EMAIL_CONFIG
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp-mail.outlook.com") 
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "nutriscanbot@outlook.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

def send_reset_email(target_email: str, token: str):
    reset_link = f"http://localhost:5173/reset-password?token={token}"

    if not SMTP_PASSWORD or SMTP_PASSWORD == "tupasswordaqui":
        print("\n" + "="*50)
        print("MODO DESARROLLO: ENVÍO DE EMAIL OMITIDO")
        print(f"ENLACE DE RECUPERACIÓN: {reset_link}")
        print("="*50 + "\n")
        return False

    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = target_email
    msg['Subject'] = "NutriScan - Restablecer tu contraseña"

    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #198754; text-align: center;">Recuperación de Contraseña</h2>
            <p>Hola,</p>
            <p>Has solicitado restablecer tu contraseña en <strong>NutriScan</strong>. Haz clic en el botón de abajo para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #198754; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
            </div>
            <p>Este enlace expirará en 15 minutos.</p>
            <p>Si no solicitaste esto, puedes ignorar este correo.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 NutriScan Team</p>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print("\n" + "!"*50)
        print(f"ERROR SMTP: {e}")
        print("No se pudo enviar el correo, pero aquí tienes el enlace para tu prueba:")
        print(f"ENLACE DE RECUPERACIÓN: {reset_link}")
        print("!"*50 + "\n")
        return False
