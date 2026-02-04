from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models import Asset, get_db, AssetType
from ..schemas import (
    AssetCreate, AssetResponse, AssetWithPrice, PortfolioSummary,
    AssetHistory, BenchmarkResponse, PortfolioPerformance
)
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


@router.get("/search")
def search_assets(
    q: str = Query(..., description="Término de búsqueda (símbolo o nombre)"),
    type: str = Query("stock", description="Tipo de activo: stock o crypto")
):
    """
    Busca activos por nombre o símbolo.
    Retorna lista de sugerencias con: symbol, name, type
    Máximo 10 resultados.
    """
    if not q or len(q) < 1:
        return []

    results = price_service.search_assets(q, type)
    return results[:10]


@router.get("/search/{query}")
def search_assets_legacy(query: str, asset_type: str = "stock"):
    """Busca activos por nombre o símbolo (endpoint legacy)"""
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


@router.get("/history/{symbol}")
def get_asset_history(
    symbol: str,
    asset_type: str = Query("stock", description="Tipo de activo: stock o crypto"),
    period: str = Query("1M", description="Periodo: 1D, 1W, 1M, 3M, 1Y")
):
    """Obtiene histórico de precios de un activo con indicadores técnicos"""
    history_data = price_service.get_history(symbol, asset_type, period)

    if not history_data:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró historial para {symbol}"
        )

    return history_data


@router.get("/portfolio/performance")
def get_portfolio_performance(
    period: str = Query("1M", description="Periodo: 1D, 1W, 1M, 3M, 1Y"),
    db: Session = Depends(get_db)
):
    """Obtiene rendimiento histórico del portfolio"""
    assets = db.query(Asset).all()

    if not assets:
        return {
            "period": period,
            "total_invested": 0,
            "current_value": 0,
            "performance": []
        }

    # Obtener históricos de todos los activos
    all_histories = {}
    total_invested = 0

    for asset in assets:
        history = price_service.get_history(asset.symbol, asset.asset_type, period)
        if history:
            all_histories[asset.symbol] = {
                "history": history,
                "quantity": asset.quantity,
                "purchase_price": asset.purchase_price
            }
            total_invested += asset.quantity * asset.purchase_price

    if not all_histories:
        return {
            "period": period,
            "total_invested": total_invested,
            "current_value": 0,
            "performance": []
        }

    # Combinar historial del portfolio
    # Usar el activo con más datos como referencia temporal
    reference_history = max(all_histories.values(), key=lambda x: len(x["history"]["prices"]))
    reference_dates = [p["date"] for p in reference_history["history"]["prices"]]

    performance = []
    first_value = None

    for i, date in enumerate(reference_dates):
        portfolio_value = 0

        for symbol, data in all_histories.items():
            prices = data["history"]["prices"]
            # Buscar precio más cercano a esta fecha
            if i < len(prices):
                price = prices[i]["close"]
            else:
                price = prices[-1]["close"] if prices else 0

            portfolio_value += price * data["quantity"]

        if first_value is None:
            first_value = portfolio_value if portfolio_value > 0 else 1

        timestamp = reference_history["history"]["prices"][i]["timestamp"] if i < len(reference_history["history"]["prices"]) else 0

        performance.append({
            "date": date,
            "timestamp": timestamp,
            "value": portfolio_value,
            "normalized": (portfolio_value / first_value) * 100
        })

    current_value = performance[-1]["value"] if performance else 0

    return {
        "period": period,
        "total_invested": total_invested,
        "current_value": current_value,
        "performance": performance
    }


@router.get("/benchmarks")
def get_benchmarks(
    period: str = Query("1M", description="Periodo: 1D, 1W, 1M, 3M, 1Y")
):
    """Obtiene datos de benchmarks (S&P500 y Bitcoin) normalizados"""
    benchmark_data = price_service.get_benchmark_data(period)

    if not benchmark_data:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener datos de benchmarks"
        )

    return benchmark_data
