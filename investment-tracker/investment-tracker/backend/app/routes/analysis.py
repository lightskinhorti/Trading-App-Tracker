from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..models import Asset, get_db
from ..schemas import PredictionResponse, CorrelationMatrix
from ..services.ml_service import ml_service

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/predict/{symbol}")
def get_price_prediction(
    symbol: str,
    asset_type: str = Query("stock", description="Tipo de activo: stock o crypto"),
    days: int = Query(7, ge=1, le=30, description="Días a predecir (1-30)")
):
    """
    Obtiene predicción de precios usando ML (Ridge Regression con regularización)

    - **symbol**: Símbolo del activo (ej: AAPL, BTC)
    - **asset_type**: Tipo de activo (stock o crypto)
    - **days**: Número de días a predecir (máximo 30)

    El modelo incluye:
    - Preprocesamiento robusto (manejo de nulos, outliers)
    - Features de series temporales (lags, rolling stats, momentum)
    - Validación cruzada temporal
    - Intervalos de confianza
    """
    prediction = ml_service.predict_prices(
        symbol=symbol,
        asset_type=asset_type,
        days_ahead=days,
        history_period="3M"
    )

    # Verificar si hay error en la respuesta
    if prediction.get("error"):
        raise HTTPException(
            status_code=400,
            detail=prediction["error"]
        )

    return prediction


@router.get("/trend/{symbol}")
def get_trend_analysis(
    symbol: str,
    asset_type: str = Query("stock", description="Tipo de activo: stock o crypto")
):
    """
    Obtiene análisis completo de tendencia de un activo

    Incluye:
    - Tendencia a corto plazo (1 mes)
    - Tendencia a largo plazo (3 meses)
    - Indicadores técnicos (RSI, SMA)
    - Métricas de riesgo (volatilidad, max drawdown, Sharpe ratio)
    """
    analysis = ml_service.get_trend_analysis(symbol, asset_type)

    # Verificar si hay error en la respuesta
    if analysis.get("error"):
        raise HTTPException(
            status_code=400,
            detail=analysis["error"]
        )

    return analysis


@router.post("/correlation")
def calculate_correlation(
    symbols: List[str] = Query(..., description="Lista de símbolos a comparar"),
    asset_types: List[str] = Query(..., description="Tipos de activo correspondientes"),
    period: str = Query("3M", description="Periodo de análisis")
):
    """
    Calcula la matriz de correlación entre múltiples activos

    Ejemplo: /analysis/correlation?symbols=AAPL&symbols=GOOGL&symbols=BTC&asset_types=stock&asset_types=stock&asset_types=crypto
    """
    if len(symbols) != len(asset_types):
        raise HTTPException(
            status_code=400,
            detail="El número de símbolos debe coincidir con el número de tipos"
        )

    if len(symbols) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 2 activos para calcular correlación"
        )

    # Crear lista de tuplas (symbol, asset_type)
    assets = list(zip(symbols, asset_types))

    correlation = ml_service.calculate_correlation_matrix(assets, period)

    # Verificar si hay error en la respuesta
    if correlation.get("error"):
        raise HTTPException(
            status_code=400,
            detail=correlation["error"]
        )

    return correlation


@router.get("/correlation/portfolio")
def get_portfolio_correlation(
    period: str = Query("3M", description="Periodo de análisis"),
    db: Session = Depends(get_db)
):
    """
    Calcula la matriz de correlación de todos los activos del portfolio
    """
    # Obtener activos del portfolio
    assets = db.query(Asset).all()

    if len(assets) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 2 activos en el portfolio para calcular correlación"
        )

    # Crear lista de tuplas
    asset_list = [(asset.symbol, asset.asset_type) for asset in assets]

    correlation = ml_service.calculate_correlation_matrix(asset_list, period)

    # Verificar si hay error en la respuesta
    if correlation.get("error"):
        raise HTTPException(
            status_code=400,
            detail=correlation["error"]
        )

    return correlation


@router.get("/recommendations")
def get_investment_recommendations(
    db: Session = Depends(get_db)
):
    """
    Genera recomendaciones básicas basadas en el análisis del portfolio
    """
    assets = db.query(Asset).all()

    if not assets:
        return {
            "recommendations": [],
            "message": "No hay activos en el portfolio para analizar"
        }

    recommendations = []

    for asset in assets:
        try:
            analysis = ml_service.get_trend_analysis(asset.symbol, asset.asset_type)

            if analysis:
                rsi = analysis.get("technical", {}).get("rsi")
                short_trend = analysis.get("short_term", {}).get("trend")
                long_trend = analysis.get("long_term", {}).get("trend")

                # Generar recomendaciones basadas en indicadores
                if rsi:
                    if rsi > 70:
                        recommendations.append({
                            "symbol": asset.symbol,
                            "type": "warning",
                            "indicator": "RSI",
                            "message": f"{asset.symbol} está en zona de sobrecompra (RSI: {rsi:.1f}). Considera tomar ganancias."
                        })
                    elif rsi < 30:
                        recommendations.append({
                            "symbol": asset.symbol,
                            "type": "opportunity",
                            "indicator": "RSI",
                            "message": f"{asset.symbol} está en zona de sobreventa (RSI: {rsi:.1f}). Posible oportunidad de compra."
                        })

                # Tendencia contradictoria
                if short_trend == "bearish" and long_trend == "bullish":
                    recommendations.append({
                        "symbol": asset.symbol,
                        "type": "info",
                        "indicator": "Trend",
                        "message": f"{asset.symbol}: Corrección a corto plazo en tendencia alcista. Posible punto de entrada."
                    })
                elif short_trend == "bullish" and long_trend == "bearish":
                    recommendations.append({
                        "symbol": asset.symbol,
                        "type": "warning",
                        "indicator": "Trend",
                        "message": f"{asset.symbol}: Rebote en tendencia bajista. Precaución."
                    })

        except Exception as e:
            print(f"Error analyzing {asset.symbol}: {e}")

    # Calcular diversificación si hay suficientes activos
    if len(assets) >= 2:
        try:
            asset_list = [(a.symbol, a.asset_type) for a in assets]
            correlation = ml_service.calculate_correlation_matrix(asset_list, "3M")

            if correlation:
                high_corr_pairs = [
                    p for p in correlation.get("pairs", [])
                    if abs(p["correlation"]) > 0.8
                ]

                if high_corr_pairs:
                    for pair in high_corr_pairs[:3]:  # Top 3 más correlacionados
                        recommendations.append({
                            "symbol": f"{pair['symbol1']}/{pair['symbol2']}",
                            "type": "diversification",
                            "indicator": "Correlation",
                            "message": f"Alta correlación ({pair['correlation']:.2f}) entre {pair['symbol1']} y {pair['symbol2']}. Considera diversificar."
                        })
        except Exception as e:
            print(f"Error calculating portfolio correlation: {e}")

    return {
        "recommendations": recommendations,
        "total_assets_analyzed": len(assets),
        "warnings": len([r for r in recommendations if r["type"] == "warning"]),
        "opportunities": len([r for r in recommendations if r["type"] == "opportunity"])
    }
