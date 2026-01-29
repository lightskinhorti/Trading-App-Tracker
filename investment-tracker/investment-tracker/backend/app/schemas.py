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
