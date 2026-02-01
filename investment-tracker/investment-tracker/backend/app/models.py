from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, create_engine, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./portfolio.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class AssetType(str, enum.Enum):
    STOCK = "stock"
    CRYPTO = "crypto"


class AlertType(str, enum.Enum):
    PRICE_ABOVE = "price_above"      # Precio sube por encima de X
    PRICE_BELOW = "price_below"      # Precio baja por debajo de X
    PERCENT_CHANGE = "percent_change"  # Cambio porcentual (+ o -)


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISABLED = "disabled"


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"
    BOTH = "both"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    asset_type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=False)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    asset_type = Column(String, nullable=False)
    alert_type = Column(String, nullable=False)  # price_above, price_below, percent_change
    target_value = Column(Float, nullable=False)  # Precio objetivo o % de cambio
    current_price_at_creation = Column(Float, nullable=True)  # Precio al crear la alerta
    notification_channel = Column(String, default="email")  # email, telegram, both
    email = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    status = Column(String, default="active")  # active, triggered, disabled
    message = Column(String, nullable=True)  # Mensaje personalizado
    triggered_at = Column(DateTime, nullable=True)
    triggered_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=True)
    telegram_bot_token = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    smtp_server = Column(String, default="smtp.gmail.com")
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
