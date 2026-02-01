import yfinance as yf
from pycoingecko import CoinGeckoAPI
from typing import Optional, List, Dict
import httpx
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

# Try to import ta library, provide fallback if not available
try:
    import ta
    TA_AVAILABLE = True
except ImportError:
    TA_AVAILABLE = False
    print("Warning: ta library not available. Using manual indicator calculations.")

# Usar datos mock por defecto para desarrollo rápido
# En producción con acceso a internet, cambiar a "false"
USE_MOCK_DATA = os.environ.get("USE_MOCK_DATA", "true").lower() == "true"

# Caché simple para evitar regenerar datos
_price_cache = {}
_history_cache = {}
CACHE_TTL = 60  # segundos


class PriceService:
    def __init__(self):
        self.cg = CoinGeckoAPI()
        self._crypto_list = None
        self._mock_base_prices = {
            # Stocks
            "AAPL": {"name": "Apple Inc.", "price": 178.50, "type": "stock"},
            "GOOGL": {"name": "Alphabet Inc.", "price": 141.80, "type": "stock"},
            "MSFT": {"name": "Microsoft Corporation", "price": 378.90, "type": "stock"},
            "AMZN": {"name": "Amazon.com Inc.", "price": 178.25, "type": "stock"},
            "TSLA": {"name": "Tesla Inc.", "price": 248.50, "type": "stock"},
            "NVDA": {"name": "NVIDIA Corporation", "price": 875.30, "type": "stock"},
            "META": {"name": "Meta Platforms Inc.", "price": 505.75, "type": "stock"},
            "^GSPC": {"name": "S&P 500", "price": 5021.84, "type": "index"},
            # Cryptos
            "BTC": {"name": "Bitcoin", "price": 64250.00, "type": "crypto"},
            "ETH": {"name": "Ethereum", "price": 3450.00, "type": "crypto"},
            "SOL": {"name": "Solana", "price": 142.50, "type": "crypto"},
            "ADA": {"name": "Cardano", "price": 0.58, "type": "crypto"},
            "XRP": {"name": "Ripple", "price": 0.52, "type": "crypto"},
            "DOGE": {"name": "Dogecoin", "price": 0.12, "type": "crypto"},
        }

    def _generate_mock_history(self, symbol: str, period: str, base_price: float) -> List[Dict]:
        """Genera datos históricos mock para desarrollo"""
        days_map = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365}
        num_days = days_map.get(period, 30)

        # Más puntos de datos para periodos cortos
        if period == "1D":
            num_points = 24  # Datos por hora
        else:
            num_points = num_days

        prices = []
        current_price = base_price

        # Generar tendencia aleatoria pero realista
        trend = random.uniform(-0.15, 0.25)  # Tendencia entre -15% y +25%
        volatility = 0.02 if symbol in ["^GSPC"] else 0.03  # S&P500 menos volátil

        for i in range(num_points):
            if period == "1D":
                date = datetime.now() - timedelta(hours=num_points - i)
                date_str = date.strftime("%Y-%m-%d %H:%M:%S")
            else:
                date = datetime.now() - timedelta(days=num_days - i)
                date_str = date.strftime("%Y-%m-%d")

            # Calcular precio con tendencia y ruido
            progress = i / num_points
            trend_factor = 1 + (trend * progress)
            noise = random.gauss(0, volatility)
            daily_price = base_price * trend_factor * (1 + noise)

            prices.append({
                "date": date_str,
                "timestamp": int(date.timestamp() * 1000),
                "open": daily_price * (1 + random.uniform(-0.01, 0.01)),
                "high": daily_price * (1 + random.uniform(0, 0.02)),
                "low": daily_price * (1 - random.uniform(0, 0.02)),
                "close": daily_price,
                "volume": random.randint(1000000, 50000000)
            })

        return prices

    def _get_mock_price(self, symbol: str, asset_type: str) -> Dict:
        """Genera precio mock para desarrollo con caché"""
        global _price_cache
        symbol_upper = symbol.upper()
        cache_key = f"price_{symbol_upper}"
        now = datetime.now().timestamp()

        # Usar caché si existe y no ha expirado
        if cache_key in _price_cache:
            cached_data, cached_time = _price_cache[cache_key]
            if now - cached_time < CACHE_TTL:
                return cached_data

        if symbol_upper in self._mock_base_prices:
            data = self._mock_base_prices[symbol_upper]
            base_price = data["price"]
            name = data["name"]
        else:
            base_price = random.uniform(10, 500)
            name = symbol_upper

        daily_change_pct = random.uniform(-5, 5)
        daily_change = base_price * daily_change_pct / 100
        current_price = base_price + daily_change

        result = {
            "symbol": symbol_upper,
            "name": name,
            "current_price": round(current_price, 2),
            "previous_close": round(base_price, 2),
            "daily_change": round(daily_change, 2),
            "daily_change_percent": round(daily_change_pct, 2),
            "currency": "USD"
        }

        # Guardar en caché
        _price_cache[cache_key] = (result, now)
        return result

    def get_stock_price(self, symbol: str) -> dict:
        """Obtiene precio actual de una acción via Yahoo Finance"""
        try:
            if USE_MOCK_DATA:
                return self._get_mock_price(symbol, "stock")

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
            # Fallback a datos mock si la API falla
            print(f"Using mock data for {symbol}")
            return self._get_mock_price(symbol, "stock")

    def get_crypto_price(self, symbol: str) -> dict:
        """Obtiene precio actual de una crypto via CoinGecko"""
        try:
            if USE_MOCK_DATA:
                return self._get_mock_price(symbol, "crypto")

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
            # Fallback a datos mock si la API falla
            print(f"Using mock data for {symbol}")
            return self._get_mock_price(symbol, "crypto")

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

    def _get_mock_history_data(self, symbol: str, period: str, asset_type: str) -> Dict:
        """Genera datos históricos mock completos con indicadores (con caché)"""
        global _history_cache
        symbol_upper = symbol.upper()
        cache_key = f"history_{symbol_upper}_{period}"
        now = datetime.now().timestamp()

        # Usar caché si existe y no ha expirado (5 minutos para históricos)
        if cache_key in _history_cache:
            cached_data, cached_time = _history_cache[cache_key]
            if now - cached_time < 300:  # 5 minutos
                return cached_data

        if symbol_upper in self._mock_base_prices:
            base_price = self._mock_base_prices[symbol_upper]["price"]
        else:
            base_price = random.uniform(10, 500)

        prices = self._generate_mock_history(symbol, period, base_price)

        # Crear DataFrame para calcular indicadores
        df = pd.DataFrame(prices)
        df["Close"] = df["close"]
        indicators = self._calculate_indicators(df)

        result = {
            "symbol": symbol_upper,
            "period": period,
            "prices": prices,
            "indicators": indicators
        }

        # Guardar en caché
        _history_cache[cache_key] = (result, now)
        return result

    def _period_to_yf(self, period: str) -> str:
        """Convierte periodo a formato yfinance"""
        period_map = {
            "1D": "1d",
            "1W": "5d",
            "1M": "1mo",
            "3M": "3mo",
            "1Y": "1y"
        }
        return period_map.get(period, "1mo")

    def _period_to_days(self, period: str) -> int:
        """Convierte periodo a días para CoinGecko"""
        period_map = {
            "1D": 1,
            "1W": 7,
            "1M": 30,
            "3M": 90,
            "1Y": 365
        }
        return period_map.get(period, 30)

    def get_stock_history(self, symbol: str, period: str = "1M") -> Dict:
        """Obtiene histórico de precios de una acción"""
        try:
            if USE_MOCK_DATA:
                return self._get_mock_history_data(symbol, period, "stock")

            ticker = yf.Ticker(symbol)
            yf_period = self._period_to_yf(period)

            # Para periodos cortos, usar intervalos más pequeños
            interval = "1h" if period == "1D" else "1d"
            hist = ticker.history(period=yf_period, interval=interval)

            if hist.empty:
                return self._get_mock_history_data(symbol, period, "stock")

            # Convertir a lista de puntos de datos
            prices = []
            for date, row in hist.iterrows():
                prices.append({
                    "date": date.strftime("%Y-%m-%d %H:%M:%S") if period == "1D" else date.strftime("%Y-%m-%d"),
                    "timestamp": int(date.timestamp() * 1000),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"])
                })

            # Calcular indicadores técnicos
            indicators = self._calculate_indicators(hist)

            return {
                "symbol": symbol.upper(),
                "period": period,
                "prices": prices,
                "indicators": indicators
            }
        except Exception as e:
            print(f"Error fetching stock history {symbol}: {e}")
            print(f"Using mock history data for {symbol}")
            return self._get_mock_history_data(symbol, period, "stock")

    def get_crypto_history(self, symbol: str, period: str = "1M") -> Dict:
        """Obtiene histórico de precios de una crypto"""
        try:
            if USE_MOCK_DATA:
                return self._get_mock_history_data(symbol, period, "crypto")

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

            coin_id = symbol_to_id.get(symbol.upper(), symbol.lower())
            days = self._period_to_days(period)

            data = self.cg.get_coin_market_chart_by_id(
                id=coin_id,
                vs_currency="usd",
                days=days
            )

            prices_data = data.get("prices", [])

            # Convertir a DataFrame para calcular indicadores
            df = pd.DataFrame(prices_data, columns=["timestamp", "close"])
            df["date"] = pd.to_datetime(df["timestamp"], unit="ms")

            prices = []
            for _, row in df.iterrows():
                prices.append({
                    "date": row["date"].strftime("%Y-%m-%d %H:%M:%S") if period == "1D" else row["date"].strftime("%Y-%m-%d"),
                    "timestamp": int(row["timestamp"]),
                    "close": float(row["close"]),
                    "open": float(row["close"]),
                    "high": float(row["close"]),
                    "low": float(row["close"]),
                    "volume": 0
                })

            # Calcular indicadores con datos de cierre
            hist_df = pd.DataFrame({"Close": df["close"]})
            indicators = self._calculate_indicators(hist_df)

            return {
                "symbol": symbol.upper(),
                "period": period,
                "prices": prices,
                "indicators": indicators
            }
        except Exception as e:
            print(f"Error fetching crypto history {symbol}: {e}")
            print(f"Using mock history data for {symbol}")
            return self._get_mock_history_data(symbol, period, "crypto")

    def _calculate_rsi_manual(self, prices: pd.Series, window: int = 14) -> pd.Series:
        """Calculate RSI manually without ta library"""
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def _calculate_indicators(self, df: pd.DataFrame) -> Dict:
        """Calcula indicadores técnicos (SMA, RSI)"""
        indicators = {
            "sma20": [],
            "sma50": [],
            "rsi": None,
            "current_sma20": None,
            "current_sma50": None,
            "current_rsi": None
        }

        try:
            close_col = "Close" if "Close" in df.columns else "close"
            close_prices = df[close_col].astype(float)

            if len(close_prices) < 14:
                return indicators

            if TA_AVAILABLE:
                # Use ta library
                sma20 = ta.trend.sma_indicator(close_prices, window=20)
                sma50 = ta.trend.sma_indicator(close_prices, window=50)
                rsi = ta.momentum.rsi(close_prices, window=14)
            else:
                # Manual calculations
                sma20 = close_prices.rolling(window=20).mean()
                sma50 = close_prices.rolling(window=50).mean()
                rsi = self._calculate_rsi_manual(close_prices, window=14)

            # Valores actuales
            indicators["current_sma20"] = float(sma20.iloc[-1]) if not pd.isna(sma20.iloc[-1]) else None
            indicators["current_sma50"] = float(sma50.iloc[-1]) if not pd.isna(sma50.iloc[-1]) else None
            indicators["current_rsi"] = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None

            # Series para gráficos
            for i, (sma20_val, sma50_val, rsi_val) in enumerate(zip(sma20, sma50, rsi)):
                indicators["sma20"].append(float(sma20_val) if not pd.isna(sma20_val) else None)
                indicators["sma50"].append(float(sma50_val) if not pd.isna(sma50_val) else None)

            indicators["rsi"] = [float(v) if not pd.isna(v) else None for v in rsi]

        except Exception as e:
            print(f"Error calculating indicators: {e}")

        return indicators

    def get_history(self, symbol: str, asset_type: str, period: str = "1M") -> Dict:
        """Obtiene histórico según tipo de activo"""
        if asset_type == "crypto":
            return self.get_crypto_history(symbol, period)
        else:
            return self.get_stock_history(symbol, period)

    def get_benchmark_data(self, period: str = "1M") -> Dict:
        """Obtiene datos de benchmarks (S&P500 y BTC) normalizados"""
        try:
            # S&P 500
            sp500_data = self.get_stock_history("^GSPC", period)

            # Bitcoin
            btc_data = self.get_crypto_history("BTC", period)

            # Si alguno falla, generar datos mock
            if not sp500_data:
                sp500_data = self._get_mock_history_data("^GSPC", period, "index")
            if not btc_data:
                btc_data = self._get_mock_history_data("BTC", period, "crypto")

            # Normalizar precios (base 100)
            def normalize_prices(prices):
                if not prices:
                    return []
                first_price = prices[0]["close"]
                if first_price == 0:
                    first_price = 1
                return [
                    {
                        **p,
                        "normalized": (p["close"] / first_price) * 100
                    }
                    for p in prices
                ]

            return {
                "period": period,
                "sp500": {
                    "symbol": "^GSPC",
                    "name": "S&P 500",
                    "prices": normalize_prices(sp500_data["prices"])
                },
                "btc": {
                    "symbol": "BTC",
                    "name": "Bitcoin",
                    "prices": normalize_prices(btc_data["prices"])
                }
            }
        except Exception as e:
            print(f"Error fetching benchmark data: {e}")
            # Fallback completo a datos mock
            return {
                "period": period,
                "sp500": {
                    "symbol": "^GSPC",
                    "name": "S&P 500",
                    "prices": self._generate_mock_history("^GSPC", period, 5021.84)
                },
                "btc": {
                    "symbol": "BTC",
                    "name": "Bitcoin",
                    "prices": self._generate_mock_history("BTC", period, 64250.00)
                }
            }


price_service = PriceService()
