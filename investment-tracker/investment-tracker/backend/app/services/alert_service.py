from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import asyncio

from ..models import Alert, AlertStatus
from .price_service import price_service
from .notification_service import notification_service


class AlertService:
    async def check_alert_condition(self, alert: Alert, current_price: float) -> bool:
        """Verifica si una alerta debe ser disparada"""
        if alert.alert_type == "price_above":
            return current_price >= alert.target_value

        elif alert.alert_type == "price_below":
            return current_price <= alert.target_value

        elif alert.alert_type == "percent_change":
            if alert.current_price_at_creation:
                change_pct = abs(
                    (current_price - alert.current_price_at_creation)
                    / alert.current_price_at_creation * 100
                )
                return change_pct >= abs(alert.target_value)

        return False

    async def process_alert(self, alert: Alert, current_price: float, db: Session) -> bool:
        """Procesa y dispara una alerta si cumple las condiciones"""
        try:
            should_trigger = await self.check_alert_condition(alert, current_price)

            if should_trigger:
                # Enviar notificación
                result = await notification_service.send_alert(
                    symbol=alert.symbol,
                    alert_type=alert.alert_type,
                    target_value=alert.target_value,
                    current_price=current_price,
                    channel=alert.notification_channel,
                    email=alert.email,
                    telegram_chat_id=alert.telegram_chat_id,
                    custom_message=alert.message
                )

                # Actualizar estado de la alerta
                alert.status = AlertStatus.TRIGGERED.value
                alert.triggered_at = datetime.utcnow()
                alert.triggered_price = current_price
                db.commit()

                print(f"Alert triggered: {alert.symbol} - {alert.alert_type}")
                return True

            return False

        except Exception as e:
            print(f"Error processing alert {alert.id}: {e}")
            return False

    async def check_all_alerts(self, db: Session) -> dict:
        """Verifica todas las alertas activas"""
        results = {
            "checked": 0,
            "triggered": 0,
            "errors": 0
        }

        # Obtener todas las alertas activas
        active_alerts = db.query(Alert).filter(
            Alert.status == AlertStatus.ACTIVE.value
        ).all()

        # Agrupar por símbolo para optimizar llamadas a API
        alerts_by_symbol = {}
        for alert in active_alerts:
            key = (alert.symbol, alert.asset_type)
            if key not in alerts_by_symbol:
                alerts_by_symbol[key] = []
            alerts_by_symbol[key].append(alert)

        # Procesar cada grupo de alertas
        for (symbol, asset_type), alerts in alerts_by_symbol.items():
            try:
                # Obtener precio actual
                price_data = price_service.get_price(symbol, asset_type)

                if price_data:
                    current_price = price_data.get("current_price", 0)

                    for alert in alerts:
                        results["checked"] += 1
                        triggered = await self.process_alert(alert, current_price, db)
                        if triggered:
                            results["triggered"] += 1
                else:
                    results["errors"] += len(alerts)

            except Exception as e:
                print(f"Error checking alerts for {symbol}: {e}")
                results["errors"] += len(alerts)

        return results

    def get_alert_summary(self, alert: Alert, current_price: Optional[float] = None) -> dict:
        """Genera un resumen del estado de una alerta"""
        summary = {
            "id": alert.id,
            "symbol": alert.symbol,
            "type": alert.alert_type,
            "target": alert.target_value,
            "status": alert.status,
            "created_at": alert.created_at.isoformat() if alert.created_at else None
        }

        if current_price and alert.current_price_at_creation:
            if alert.alert_type == "price_above":
                distance = alert.target_value - current_price
                summary["distance"] = distance
                summary["distance_percent"] = (distance / current_price) * 100

            elif alert.alert_type == "price_below":
                distance = current_price - alert.target_value
                summary["distance"] = distance
                summary["distance_percent"] = (distance / current_price) * 100

            elif alert.alert_type == "percent_change":
                current_change = abs(
                    (current_price - alert.current_price_at_creation)
                    / alert.current_price_at_creation * 100
                )
                summary["current_change"] = current_change
                summary["remaining"] = alert.target_value - current_change

        return summary


alert_service = AlertService()
