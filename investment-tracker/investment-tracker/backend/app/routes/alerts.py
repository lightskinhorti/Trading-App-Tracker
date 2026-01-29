from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..models import Alert, NotificationSettings, get_db, AlertStatus
from ..schemas import (
    AlertCreate, AlertResponse, AlertUpdate,
    NotificationSettingsCreate, NotificationSettingsResponse
)
from ..services.price_service import price_service
from ..services.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/", response_model=AlertResponse)
def create_alert(alert_data: AlertCreate, db: Session = Depends(get_db)):
    """Crear una nueva alerta de precio"""

    # Obtener precio actual para guardar referencia
    price_data = price_service.get_price(alert_data.symbol, alert_data.asset_type)
    current_price = price_data.get("current_price") if price_data else None

    alert = Alert(
        symbol=alert_data.symbol.upper(),
        asset_type=alert_data.asset_type,
        alert_type=alert_data.alert_type,
        target_value=alert_data.target_value,
        current_price_at_creation=current_price,
        notification_channel=alert_data.notification_channel,
        email=alert_data.email,
        telegram_chat_id=alert_data.telegram_chat_id,
        message=alert_data.message,
        status=AlertStatus.ACTIVE.value
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return alert


@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    status: str = None,
    symbol: str = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las alertas con filtros opcionales"""
    query = db.query(Alert)

    if status:
        query = query.filter(Alert.status == status)
    if symbol:
        query = query.filter(Alert.symbol == symbol.upper())

    return query.order_by(Alert.created_at.desc()).all()


@router.get("/active", response_model=List[AlertResponse])
def get_active_alerts(db: Session = Depends(get_db)):
    """Obtener solo alertas activas"""
    return db.query(Alert).filter(
        Alert.status == AlertStatus.ACTIVE.value
    ).order_by(Alert.created_at.desc()).all()


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """Obtener una alerta específica"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return alert


@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    alert_data: AlertUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar una alerta"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    update_data = alert_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)

    db.commit()
    db.refresh(alert)

    return alert


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    """Eliminar una alerta"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    db.delete(alert)
    db.commit()

    return {"message": "Alerta eliminada correctamente"}


@router.post("/{alert_id}/disable", response_model=AlertResponse)
def disable_alert(alert_id: int, db: Session = Depends(get_db)):
    """Desactivar una alerta"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    alert.status = AlertStatus.DISABLED.value
    db.commit()
    db.refresh(alert)

    return alert


@router.post("/{alert_id}/enable", response_model=AlertResponse)
def enable_alert(alert_id: int, db: Session = Depends(get_db)):
    """Reactivar una alerta"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    alert.status = AlertStatus.ACTIVE.value
    alert.triggered_at = None
    alert.triggered_price = None
    db.commit()
    db.refresh(alert)

    return alert


@router.post("/check")
async def check_alerts(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Verificar todas las alertas activas manualmente"""
    results = await alert_service.check_all_alerts(db)
    return {
        "message": "Verificación de alertas completada",
        "results": results
    }


@router.get("/summary/stats")
def get_alerts_stats(db: Session = Depends(get_db)):
    """Obtener estadísticas de alertas"""
    total = db.query(Alert).count()
    active = db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE.value).count()
    triggered = db.query(Alert).filter(Alert.status == AlertStatus.TRIGGERED.value).count()
    disabled = db.query(Alert).filter(Alert.status == AlertStatus.DISABLED.value).count()

    return {
        "total": total,
        "active": active,
        "triggered": triggered,
        "disabled": disabled
    }


# ============ Notification Settings ============

@router.post("/settings", response_model=NotificationSettingsResponse)
def save_notification_settings(
    settings: NotificationSettingsCreate,
    db: Session = Depends(get_db)
):
    """Guardar configuración de notificaciones"""
    # Buscar configuración existente o crear nueva
    existing = db.query(NotificationSettings).first()

    if existing:
        for key, value in settings.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        result = existing
    else:
        new_settings = NotificationSettings(**settings.model_dump())
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        result = new_settings

    # Preparar respuesta (ocultar credenciales sensibles)
    return NotificationSettingsResponse(
        id=result.id,
        email=result.email,
        telegram_chat_id=result.telegram_chat_id,
        smtp_server=result.smtp_server,
        smtp_port=result.smtp_port,
        has_telegram_token=bool(result.telegram_bot_token),
        has_smtp_credentials=bool(result.smtp_username and result.smtp_password)
    )


@router.get("/settings/current", response_model=NotificationSettingsResponse)
def get_notification_settings(db: Session = Depends(get_db)):
    """Obtener configuración de notificaciones actual"""
    settings = db.query(NotificationSettings).first()

    if not settings:
        raise HTTPException(status_code=404, detail="No hay configuración de notificaciones")

    return NotificationSettingsResponse(
        id=settings.id,
        email=settings.email,
        telegram_chat_id=settings.telegram_chat_id,
        smtp_server=settings.smtp_server,
        smtp_port=settings.smtp_port,
        has_telegram_token=bool(settings.telegram_bot_token),
        has_smtp_credentials=bool(settings.smtp_username and settings.smtp_password)
    )


@router.post("/test/email")
async def test_email_notification(
    email: str,
    db: Session = Depends(get_db)
):
    """Enviar email de prueba"""
    from ..services.notification_service import notification_service

    result = await notification_service.send_email(
        to_email=email,
        subject="🧪 Test - Investment Tracker",
        body="<h3>¡Funciona!</h3><p>Las notificaciones por email están configuradas correctamente.</p>"
    )

    if result:
        return {"message": "Email de prueba enviado correctamente"}
    else:
        raise HTTPException(status_code=500, detail="Error al enviar email de prueba")


@router.post("/test/telegram")
async def test_telegram_notification(
    chat_id: str,
    db: Session = Depends(get_db)
):
    """Enviar mensaje de Telegram de prueba"""
    from ..services.notification_service import notification_service

    result = await notification_service.send_telegram(
        chat_id=chat_id,
        message="🧪 *Test - Investment Tracker*\n\n¡Funciona! Las notificaciones por Telegram están configuradas correctamente."
    )

    if result:
        return {"message": "Mensaje de Telegram enviado correctamente"}
    else:
        raise HTTPException(status_code=500, detail="Error al enviar mensaje de Telegram")
