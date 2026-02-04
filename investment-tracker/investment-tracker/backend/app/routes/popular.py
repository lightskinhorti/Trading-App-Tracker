from fastapi import APIRouter
from typing import List, Dict
from ..services.price_service import price_service

router = APIRouter(prefix="/popular", tags=["popular"])

# Lista por defecto de activos populares
DEFAULT_POPULAR = [
    {"symbol": "AAPL", "type": "stock"},
    {"symbol": "GOOGL", "type": "stock"},
    {"symbol": "MSFT", "type": "stock"},
    {"symbol": "TSLA", "type": "stock"},
    {"symbol": "NVDA", "type": "stock"},
    {"symbol": "BTC", "type": "crypto"},
    {"symbol": "ETH", "type": "crypto"},
    {"symbol": "SOL", "type": "crypto"},
]


@router.get("/")
def get_popular_assets() -> List[Dict]:
    """
    Retorna datos actuales de activos populares:
    - symbol, name, current_price, daily_change, daily_change_percent
    - Mini histórico de 7 días para mini-gráfico (sparkline)
    """
    results = []

    for asset in DEFAULT_POPULAR:
        try:
            # Obtener precio actual
            price_data = price_service.get_price(asset["symbol"], asset["type"])

            if not price_data:
                continue

            # Obtener histórico de 7 días para sparkline
            history = price_service.get_history(asset["symbol"], asset["type"], period="1W")

            # Extraer solo los precios de cierre para el sparkline
            sparkline = []
            if history and "prices" in history:
                sparkline = [p.get("close", 0) for p in history["prices"]]

            results.append({
                "symbol": price_data.get("symbol", asset["symbol"]),
                "name": price_data.get("name", asset["symbol"]),
                "type": asset["type"],
                "current_price": price_data.get("current_price", 0),
                "daily_change": price_data.get("daily_change", 0),
                "daily_change_percent": price_data.get("daily_change_percent", 0),
                "sparkline": sparkline
            })
        except Exception as e:
            print(f"Error fetching popular asset {asset['symbol']}: {e}")
            continue

    return results


@router.get("/quick")
def get_popular_assets_quick() -> List[Dict]:
    """
    Version rápida sin sparklines - solo precios actuales.
    Útil para carga inicial más rápida.
    """
    results = []

    for asset in DEFAULT_POPULAR:
        try:
            price_data = price_service.get_price(asset["symbol"], asset["type"])

            if not price_data:
                continue

            results.append({
                "symbol": price_data.get("symbol", asset["symbol"]),
                "name": price_data.get("name", asset["symbol"]),
                "type": asset["type"],
                "current_price": price_data.get("current_price", 0),
                "daily_change": price_data.get("daily_change", 0),
                "daily_change_percent": price_data.get("daily_change_percent", 0),
            })
        except Exception as e:
            print(f"Error fetching popular asset {asset['symbol']}: {e}")
            continue

    return results
