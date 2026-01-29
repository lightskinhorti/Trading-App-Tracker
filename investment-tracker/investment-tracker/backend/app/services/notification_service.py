import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os


class NotificationService:
    def __init__(self):
        # Configuración por defecto desde variables de entorno
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.default_email = os.getenv("DEFAULT_EMAIL")
        self.default_telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        smtp_username: Optional[str] = None,
        smtp_password: Optional[str] = None
    ) -> bool:
        """Envía un email con la alerta"""
        try:
            username = smtp_username or self.smtp_username
            password = smtp_password or self.smtp_password

            if not username or not password:
                print("SMTP credentials not configured")
                return False

            msg = MIMEMultipart()
            msg['From'] = username
            msg['To'] = to_email
            msg['Subject'] = subject

            # Cuerpo HTML del email
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a2e; color: #eee; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #16213e; border-radius: 10px; padding: 20px;">
                    <h2 style="color: #4ade80;">📈 Investment Tracker Alert</h2>
                    <div style="background-color: #1a1a2e; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        {body}
                    </div>
                    <p style="color: #888; font-size: 12px; margin-top: 20px;">
                        Esta alerta fue generada automáticamente por Investment Tracker.
                    </p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(username, password)
                server.send_message(msg)

            print(f"Email sent to {to_email}")
            return True

        except Exception as e:
            print(f"Error sending email: {e}")
            return False

    async def send_telegram(
        self,
        chat_id: str,
        message: str,
        bot_token: Optional[str] = None
    ) -> bool:
        """Envía un mensaje de Telegram con la alerta"""
        try:
            token = bot_token or self.telegram_bot_token

            if not token:
                print("Telegram bot token not configured")
                return False

            url = f"https://api.telegram.org/bot{token}/sendMessage"

            # Formato del mensaje para Telegram
            formatted_message = f"""
🚨 *Investment Tracker Alert*

{message}

_Alerta automática_
            """

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": formatted_message,
                        "parse_mode": "Markdown"
                    }
                )

                if response.status_code == 200:
                    print(f"Telegram message sent to {chat_id}")
                    return True
                else:
                    print(f"Telegram error: {response.text}")
                    return False

        except Exception as e:
            print(f"Error sending Telegram: {e}")
            return False

    async def send_alert(
        self,
        symbol: str,
        alert_type: str,
        target_value: float,
        current_price: float,
        channel: str,
        email: Optional[str] = None,
        telegram_chat_id: Optional[str] = None,
        custom_message: Optional[str] = None
    ) -> dict:
        """Envía una alerta por el canal especificado"""

        # Construir mensaje
        if alert_type == "price_above":
            direction = "superado"
            emoji = "📈"
        elif alert_type == "price_below":
            direction = "caído por debajo de"
            emoji = "📉"
        else:  # percent_change
            change_pct = ((current_price - target_value) / target_value) * 100
            direction = f"cambiado un {abs(change_pct):.2f}%"
            emoji = "📊"

        base_message = f"""
{emoji} *{symbol}* ha {direction} tu objetivo!

💰 Precio objetivo: ${target_value:.2f}
💵 Precio actual: ${current_price:.2f}

{f'📝 {custom_message}' if custom_message else ''}
        """.strip()

        results = {"email": None, "telegram": None}

        # Enviar por email
        if channel in ["email", "both"]:
            target_email = email or self.default_email
            if target_email:
                subject = f"🚨 Alerta de precio: {symbol}"
                results["email"] = await self.send_email(
                    to_email=target_email,
                    subject=subject,
                    body=base_message.replace("*", "<strong>").replace("_", "<em>")
                )

        # Enviar por Telegram
        if channel in ["telegram", "both"]:
            target_chat = telegram_chat_id or self.default_telegram_chat_id
            if target_chat:
                results["telegram"] = await self.send_telegram(
                    chat_id=target_chat,
                    message=base_message
                )

        return results


notification_service = NotificationService()
