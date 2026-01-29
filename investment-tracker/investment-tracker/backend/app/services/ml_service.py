import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from scipy import stats

from .price_service import price_service


class MLService:
    """Servicio de Machine Learning para predicciones y análisis"""

    def __init__(self):
        self.confidence_threshold = 0.6

    def predict_prices(
        self,
        symbol: str,
        asset_type: str,
        days_ahead: int = 7,
        history_period: str = "3M"
    ) -> Dict:
        """
        Predice precios futuros usando regresión polinomial
        y análisis de tendencias
        """
        try:
            # Obtener datos históricos
            history = price_service.get_history(symbol, asset_type, history_period)

            if not history or not history.get("prices"):
                return None

            prices = history["prices"]
            df = pd.DataFrame(prices)

            # Preparar datos
            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values("date")
            df["days"] = (df["date"] - df["date"].min()).dt.days

            X = df["days"].values.reshape(-1, 1)
            y = df["close"].values

            # Modelo de regresión polinomial (grado 2 para capturar tendencias)
            poly_features = PolynomialFeatures(degree=2)
            X_poly = poly_features.fit_transform(X)

            model = LinearRegression()
            model.fit(X_poly, y)

            # Calcular R² para confianza
            y_pred_train = model.predict(X_poly)
            r2_score = 1 - (np.sum((y - y_pred_train) ** 2) / np.sum((y - np.mean(y)) ** 2))

            # Generar predicciones
            last_day = df["days"].max()
            last_date = df["date"].max()
            current_price = float(df["close"].iloc[-1])

            predictions = []
            future_days = np.array(range(last_day + 1, last_day + days_ahead + 1)).reshape(-1, 1)
            future_X_poly = poly_features.transform(future_days)
            future_prices = model.predict(future_X_poly)

            # Calcular bandas de confianza (basado en desviación estándar histórica)
            residuals = y - y_pred_train
            std_residuals = np.std(residuals)

            for i, (day, price) in enumerate(zip(future_days.flatten(), future_prices)):
                future_date = last_date + timedelta(days=i + 1)

                # Aumentar incertidumbre con el tiempo
                uncertainty_factor = 1 + (i * 0.1)
                margin = std_residuals * 1.96 * uncertainty_factor  # 95% intervalo de confianza

                predictions.append({
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_price": max(0, float(price)),  # Precio no puede ser negativo
                    "lower_bound": max(0, float(price - margin)),
                    "upper_bound": float(price + margin)
                })

            # Determinar tendencia
            trend = self._determine_trend(predictions, current_price)

            # Calcular confianza basada en R² y volatilidad
            volatility = np.std(y) / np.mean(y)  # Coeficiente de variación
            confidence = max(0, min(100, r2_score * 100 * (1 - volatility)))

            return {
                "symbol": symbol.upper(),
                "current_price": current_price,
                "predictions": predictions,
                "trend": trend,
                "confidence": round(confidence, 2),
                "prediction_days": days_ahead,
                "model_r2": round(r2_score, 4),
                "historical_volatility": round(volatility * 100, 2)
            }

        except Exception as e:
            print(f"Error predicting prices for {symbol}: {e}")
            return None

    def _determine_trend(self, predictions: List[Dict], current_price: float) -> str:
        """Determina la tendencia basada en las predicciones"""
        if not predictions:
            return "neutral"

        last_predicted = predictions[-1]["predicted_price"]
        change_pct = ((last_predicted - current_price) / current_price) * 100

        if change_pct > 3:
            return "bullish"
        elif change_pct < -3:
            return "bearish"
        else:
            return "neutral"

    def calculate_correlation_matrix(
        self,
        symbols: List[tuple],  # Lista de (symbol, asset_type)
        period: str = "3M"
    ) -> Dict:
        """
        Calcula la matriz de correlación entre múltiples activos
        """
        try:
            # Recopilar datos de precios
            price_data = {}

            for symbol, asset_type in symbols:
                history = price_service.get_history(symbol, asset_type, period)
                if history and history.get("prices"):
                    prices = [p["close"] for p in history["prices"]]
                    price_data[symbol] = prices

            if len(price_data) < 2:
                return None

            # Alinear datos por longitud mínima
            min_length = min(len(prices) for prices in price_data.values())
            aligned_data = {
                symbol: prices[-min_length:]
                for symbol, prices in price_data.items()
            }

            # Crear DataFrame
            df = pd.DataFrame(aligned_data)

            # Calcular retornos diarios (mejor para correlación)
            returns = df.pct_change().dropna()

            # Calcular matriz de correlación
            corr_matrix = returns.corr()

            # Preparar resultado
            symbols_list = list(corr_matrix.columns)
            matrix = corr_matrix.values.tolist()

            # Extraer pares con correlación significativa
            pairs = []
            for i, sym1 in enumerate(symbols_list):
                for j, sym2 in enumerate(symbols_list):
                    if i < j:  # Solo pares únicos
                        correlation = corr_matrix.iloc[i, j]
                        pairs.append({
                            "symbol1": sym1,
                            "symbol2": sym2,
                            "correlation": round(float(correlation), 4)
                        })

            # Ordenar pares por correlación absoluta
            pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

            return {
                "symbols": symbols_list,
                "matrix": [[round(float(v), 4) for v in row] for row in matrix],
                "pairs": pairs,
                "period": period,
                "data_points": min_length
            }

        except Exception as e:
            print(f"Error calculating correlation: {e}")
            return None

    def get_trend_analysis(self, symbol: str, asset_type: str) -> Dict:
        """
        Análisis completo de tendencia de un activo
        """
        try:
            # Obtener datos de diferentes periodos
            history_1m = price_service.get_history(symbol, asset_type, "1M")
            history_3m = price_service.get_history(symbol, asset_type, "3M")

            if not history_1m or not history_3m:
                return None

            prices_1m = [p["close"] for p in history_1m["prices"]]
            prices_3m = [p["close"] for p in history_3m["prices"]]

            current_price = prices_1m[-1] if prices_1m else 0

            # Calcular métricas
            def calc_metrics(prices):
                if not prices:
                    return {}
                returns = pd.Series(prices).pct_change().dropna()
                return {
                    "change_pct": ((prices[-1] - prices[0]) / prices[0]) * 100,
                    "volatility": returns.std() * 100,
                    "max_drawdown": self._calculate_max_drawdown(prices),
                    "sharpe_ratio": self._calculate_sharpe_ratio(returns)
                }

            metrics_1m = calc_metrics(prices_1m)
            metrics_3m = calc_metrics(prices_3m)

            # Determinar tendencia general
            short_trend = "bullish" if metrics_1m.get("change_pct", 0) > 2 else (
                "bearish" if metrics_1m.get("change_pct", 0) < -2 else "neutral"
            )
            long_trend = "bullish" if metrics_3m.get("change_pct", 0) > 5 else (
                "bearish" if metrics_3m.get("change_pct", 0) < -5 else "neutral"
            )

            # Indicadores técnicos del servicio de precios
            indicators = history_1m.get("indicators", {})

            return {
                "symbol": symbol.upper(),
                "current_price": current_price,
                "short_term": {
                    "period": "1M",
                    "trend": short_trend,
                    **metrics_1m
                },
                "long_term": {
                    "period": "3M",
                    "trend": long_trend,
                    **metrics_3m
                },
                "technical": {
                    "rsi": indicators.get("current_rsi"),
                    "sma20": indicators.get("current_sma20"),
                    "sma50": indicators.get("current_sma50"),
                    "price_vs_sma20": (
                        "above" if current_price > (indicators.get("current_sma20") or 0)
                        else "below"
                    ) if indicators.get("current_sma20") else None
                }
            }

        except Exception as e:
            print(f"Error analyzing trend for {symbol}: {e}")
            return None

    def _calculate_max_drawdown(self, prices: List[float]) -> float:
        """Calcula el máximo drawdown"""
        if not prices:
            return 0

        peak = prices[0]
        max_dd = 0

        for price in prices:
            if price > peak:
                peak = price
            drawdown = (peak - price) / peak * 100
            max_dd = max(max_dd, drawdown)

        return round(max_dd, 2)

    def _calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calcula el Sharpe Ratio anualizado"""
        if returns.empty or returns.std() == 0:
            return 0

        # Anualizar (asumiendo datos diarios)
        annual_return = returns.mean() * 252
        annual_std = returns.std() * np.sqrt(252)

        sharpe = (annual_return - risk_free_rate) / annual_std if annual_std > 0 else 0
        return round(sharpe, 2)


ml_service = MLService()
