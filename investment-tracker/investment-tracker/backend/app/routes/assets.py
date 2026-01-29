from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..models import Asset, get_db, AssetType
from ..schemas import AssetCreate, AssetResponse, AssetWithPrice, PortfolioSummary
from ..services.price_service import price_service

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/", response_model=AssetResponse)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    """Añade un nuevo activo al portfolio"""
    
    # Verificar que el símbolo existe
    price_data = price_service.get_price(asset.symbol, asset.asset_type.value)
    if not price_data:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo encontrar el activo {asset.symbol}"
        )
    
    db_asset = Asset(
        symbol=asset.symbol.upper(),
        name=price_data.get("name", asset.name),
        asset_type=asset.asset_type.value,
        quantity=asset.quantity,
        purchase_price=asset.purchase_price,
        purchase_date=asset.purchase_date
    )
    
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    return db_asset


@router.get("/", response_model=List[AssetResponse])
def get_assets(db: Session = Depends(get_db)):
    """Obtiene todos los activos del portfolio"""
    return db.query(Asset).all()


@router.get("/portfolio", response_model=PortfolioSummary)
def get_portfolio(db: Session = Depends(get_db)):
    """Obtiene resumen del portfolio con precios actuales"""
    assets = db.query(Asset).all()
    
    assets_with_prices = []
    total_invested = 0
    current_value = 0
    
    for asset in assets:
        price_data = price_service.get_price(asset.symbol, asset.asset_type)
        
        if price_data:
            current_price = price_data.get("current_price", 0)
            asset_current_value = current_price * asset.quantity
            asset_total_invested = asset.purchase_price * asset.quantity
            profit_loss = asset_current_value - asset_total_invested
            profit_loss_percent = (profit_loss / asset_total_invested * 100) if asset_total_invested else 0
            
            total_invested += asset_total_invested
            current_value += asset_current_value
            
            assets_with_prices.append(AssetWithPrice(
                id=asset.id,
                symbol=asset.symbol,
                name=asset.name,
                asset_type=asset.asset_type,
                quantity=asset.quantity,
                purchase_price=asset.purchase_price,
                purchase_date=asset.purchase_date,
                created_at=asset.created_at,
                current_price=current_price,
                current_value=asset_current_value,
                total_invested=asset_total_invested,
                profit_loss=profit_loss,
                profit_loss_percent=profit_loss_percent,
                daily_change=price_data.get("daily_change", 0),
                daily_change_percent=price_data.get("daily_change_percent", 0)
            ))
    
    total_profit_loss = current_value - total_invested
    total_profit_loss_percent = (total_profit_loss / total_invested * 100) if total_invested else 0
    
    return PortfolioSummary(
        total_invested=total_invested,
        current_value=current_value,
        total_profit_loss=total_profit_loss,
        total_profit_loss_percent=total_profit_loss_percent,
        assets=assets_with_prices
    )


@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    """Elimina un activo del portfolio"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    db.delete(asset)
    db.commit()
    
    return {"message": "Activo eliminado correctamente"}


@router.get("/search/{query}")
def search_assets(query: str, asset_type: str = "stock"):
    """Busca activos por nombre o símbolo"""
    if asset_type == "crypto":
        results = price_service.search_crypto(query)
    else:
        results = price_service.search_stock(query)
    
    return results


@router.get("/price/{symbol}")
def get_price(symbol: str, asset_type: str = "stock"):
    """Obtiene precio actual de un activo"""
    price_data = price_service.get_price(symbol, asset_type)
    
    if not price_data:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró el activo {symbol}"
        )
    
    return price_data
