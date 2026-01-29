import yfinance as yf
from pycoingecko import CoinGeckoAPI
from typing import Optional
import httpx


class PriceService:
    def __init__(self):
        self.cg = CoinGeckoAPI()
        self._crypto_list = None

    def get_stock_price(self, symbol: str) -> dict:
        """Obtiene precio actual de una acción via Yahoo Finance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="2d")
            
            current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
            previous_close = info.get("previousClose", current_price)
            
            daily_change = current_price - previous_close
            daily_change_percent = (daily_change / previous_close * 100) if previous_close else 0

            return {
                "symbol": symbol.upper(),
                "name": info.get("shortName", symbol),
                "current_price": current_price,
                "previous_close": previous_close,
                "daily_change": daily_change,
                "daily_change_percent": daily_change_percent,
                "currency": info.get("currency", "USD")
            }
        except Exception as e:
            print(f"Error fetching stock {symbol}: {e}")
            return None

    def get_crypto_price(self, symbol: str) -> dict:
        """Obtiene precio actual de una crypto via CoinGecko"""
        try:
            # CoinGecko usa IDs, no símbolos. Mapeamos los más comunes
            symbol_to_id = {
                "BTC": "bitcoin",
                "ETH": "ethereum",
                "SOL": "solana",
                "ADA": "cardano",
                "DOT": "polkadot",
                "MATIC": "matic-network",
                "LINK": "chainlink",
                "UNI": "uniswap",
                "AVAX": "avalanche-2",
                "XRP": "ripple",
                "DOGE": "dogecoin",
                "SHIB": "shiba-inu",
                "LTC": "litecoin",
                "BNB": "binancecoin",
                "ATOM": "cosmos",
            }
            
            coin_id = symbol_to_id.get(symbol.upper())
            if not coin_id:
                # Intentar buscar por símbolo
                coin_id = symbol.lower()

            data = self.cg.get_coin_by_id(
                id=coin_id,
                localization=False,
                tickers=False,
                community_data=False,
                developer_data=False
            )
            
            market_data = data.get("market_data", {})
            current_price = market_data.get("current_price", {}).get("usd", 0)
            price_change_24h = market_data.get("price_change_24h", 0)
            price_change_percent_24h = market_data.get("price_change_percentage_24h", 0)

            return {
                "symbol": symbol.upper(),
                "name": data.get("name", symbol),
                "current_price": current_price,
                "daily_change": price_change_24h,
                "daily_change_percent": price_change_percent_24h,
                "currency": "USD"
            }
        except Exception as e:
            print(f"Error fetching crypto {symbol}: {e}")
            return None

    def get_price(self, symbol: str, asset_type: str) -> dict:
        """Obtiene precio según el tipo de activo"""
        if asset_type == "crypto":
            return self.get_crypto_price(symbol)
        else:
            return self.get_stock_price(symbol)

    def search_stock(self, query: str) -> list:
        """Busca acciones por nombre o símbolo"""
        try:
            ticker = yf.Ticker(query)
            info = ticker.info
            if info.get("shortName"):
                return [{
                    "symbol": query.upper(),
                    "name": info.get("shortName", query),
                    "type": "stock"
                }]
            return []
        except:
            return []

    def search_crypto(self, query: str) -> list:
        """Busca cryptos por nombre o símbolo"""
        try:
            search_results = self.cg.search(query)
            coins = search_results.get("coins", [])[:5]
            return [{
                "symbol": coin.get("symbol", "").upper(),
                "name": coin.get("name", ""),
                "type": "crypto",
                "coin_id": coin.get("id")
            } for coin in coins]
        except Exception as e:
            print(f"Error searching crypto: {e}")
            return []


price_service = PriceService()
