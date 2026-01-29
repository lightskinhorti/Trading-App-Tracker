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
