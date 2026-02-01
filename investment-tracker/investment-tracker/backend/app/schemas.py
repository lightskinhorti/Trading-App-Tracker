from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum


class AssetType(str, Enum):
    STOCK = "stock"
    CRYPTO = "crypto"


class AssetCreate(BaseModel):
    symbol: str
    name: str
    asset_type: AssetType
    quantity: float
    purchase_price: float
    purchase_date: Optional[datetime] = None


class AssetResponse(BaseModel):
    id: int
    symbol: str
    name: str
    asset_type: str
    quantity: float
    purchase_price: float
    purchase_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AssetWithPrice(AssetResponse):
    current_price: float
    current_value: float
    total_invested: float
    profit_loss: float
    profit_loss_percent: float
    daily_change: float
    daily_change_percent: float


class PortfolioSummary(BaseModel):
    total_invested: float
    current_value: float
    total_profit_loss: float
    total_profit_loss_percent: float
    assets: list[AssetWithPrice]


class PricePoint(BaseModel):
    date: str
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    normalized: Optional[float] = None


class TechnicalIndicators(BaseModel):
    sma20: list[Optional[float]]
    sma50: list[Optional[float]]
    rsi: Optional[list[Optional[float]]] = None
    current_sma20: Optional[float] = None
    current_sma50: Optional[float] = None
    current_rsi: Optional[float] = None


class AssetHistory(BaseModel):
    symbol: str
    period: str
    prices: list[PricePoint]
    indicators: TechnicalIndicators


class BenchmarkData(BaseModel):
    symbol: str
    name: str
    prices: list[PricePoint]


class BenchmarkResponse(BaseModel):
    period: str
    sp500: BenchmarkData
    btc: BenchmarkData


class PortfolioPerformancePoint(BaseModel):
    date: str
    timestamp: int
    value: float
    normalized: float


class PortfolioPerformance(BaseModel):
    period: str
    total_invested: float
    current_value: float
    performance: list[PortfolioPerformancePoint]


# ============ Fase 3: Alertas ============

class AlertType(str, Enum):
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_CHANGE = "percent_change"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISABLED = "disabled"


class NotificationChannel(str, Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"
    BOTH = "both"


class AlertCreate(BaseModel):
    symbol: str
    asset_type: AssetType
    alert_type: AlertType
    target_value: float  # Precio objetivo o porcentaje de cambio
    notification_channel: NotificationChannel = NotificationChannel.EMAIL
    email: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    message: Optional[str] = None


class AlertResponse(BaseModel):
    id: int
    symbol: str
    asset_type: str
    alert_type: str
    target_value: float
    current_price_at_creation: Optional[float]
    notification_channel: str
    email: Optional[str]
    telegram_chat_id: Optional[str]
    status: str
    message: Optional[str]
    triggered_at: Optional[datetime]
    triggered_price: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    target_value: Optional[float] = None
    notification_channel: Optional[NotificationChannel] = None
    email: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    message: Optional[str] = None
    status: Optional[AlertStatus] = None


class NotificationSettingsCreate(BaseModel):
    email: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None


class NotificationSettingsResponse(BaseModel):
    id: int
    email: Optional[str]
    telegram_chat_id: Optional[str]
    smtp_server: str
    smtp_port: int
    has_telegram_token: bool = False
    has_smtp_credentials: bool = False

    class Config:
        from_attributes = True


# ============ Fase 3: Predicciones ML ============

class PredictionPoint(BaseModel):
    date: str
    predicted_price: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class PredictionResponse(BaseModel):
    symbol: str
    current_price: float
    predictions: list[PredictionPoint]
    trend: str  # "bullish", "bearish", "neutral"
    confidence: float  # 0-100
    prediction_days: int


# ============ Fase 3: Correlación ============

class CorrelationPair(BaseModel):
    symbol1: str
    symbol2: str
    correlation: float


class CorrelationMatrix(BaseModel):
    symbols: list[str]
    matrix: list[list[float]]
    pairs: list[CorrelationPair]
