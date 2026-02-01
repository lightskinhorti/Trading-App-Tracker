import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import warnings

# Try to import sklearn - provide fallback if not available
try:
    from sklearn.linear_model import Ridge, Lasso
    from sklearn.preprocessing import StandardScaler, MinMaxScaler
    from sklearn.model_selection import TimeSeriesSplit, cross_val_score
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: sklearn not available. Using simple prediction model.")

# Try to import scipy - optional
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("Warning: scipy not available.")

from .price_service import price_service

warnings.filterwarnings('ignore')


class SimpleScaler:
    """Fallback scaler when sklearn is not available"""
    def __init__(self):
        self.mean_ = None
        self.std_ = None

    def fit_transform(self, X):
        X = np.array(X)
        self.mean_ = np.mean(X, axis=0)
        self.std_ = np.std(X, axis=0)
        self.std_[self.std_ == 0] = 1  # Avoid division by zero
        return (X - self.mean_) / self.std_

    def transform(self, X):
        X = np.array(X)
        return (X - self.mean_) / self.std_

    def inverse_transform(self, X):
        X = np.array(X)
        return X * self.std_ + self.mean_


class MLService:
    """
    Servicio de Machine Learning para predicciones y análisis de series temporales.

    Características:
    - Preprocesamiento robusto (manejo de nulos, escalado)
    - Múltiples modelos (Ridge, Lasso con regularización)
    - Features de series temporales (lags, rolling stats)
    - Validación cruzada temporal
    - Intervalos de confianza robustos
    """

    def __init__(self):
        if SKLEARN_AVAILABLE:
            self.scaler_X = StandardScaler()
            self.scaler_y = StandardScaler()
        else:
            self.scaler_X = SimpleScaler()
            self.scaler_y = SimpleScaler()
        self.confidence_threshold = 0.6

    def _preprocess_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Preprocesa los datos: maneja nulos, zeros, outliers

        Returns:
            DataFrame limpio y lista de warnings
        """
        warnings_list = []
        original_len = len(df)

        # 1. Verificar columnas necesarias
        required_cols = ['date', 'close']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Columna requerida '{col}' no encontrada")

        # 2. Convertir fecha
        df['date'] = pd.to_datetime(df['date'], errors='coerce')

        # 3. Eliminar filas con fechas inválidas
        null_dates = df['date'].isna().sum()
        if null_dates > 0:
            warnings_list.append(f"Eliminadas {null_dates} filas con fechas inválidas")
            df = df.dropna(subset=['date'])

        # 4. Manejar precios nulos o zero
        null_prices = df['close'].isna().sum()
        zero_prices = (df['close'] == 0).sum()

        if null_prices > 0:
            warnings_list.append(f"Interpoladas {null_prices} valores nulos en precios")
            df['close'] = df['close'].interpolate(method='linear')

        if zero_prices > 0:
            warnings_list.append(f"Reemplazados {zero_prices} precios zero por interpolación")
            df.loc[df['close'] == 0, 'close'] = np.nan
            df['close'] = df['close'].interpolate(method='linear')

        # 5. Eliminar cualquier nulo restante
        df = df.dropna(subset=['close'])

        # 6. Detectar y manejar outliers (>3 std)
        if len(df) > 10:
            mean_price = df['close'].mean()
            std_price = df['close'].std()

            if std_price > 0:
                z_scores = np.abs((df['close'] - mean_price) / std_price)
                outliers = (z_scores > 3).sum()

                if outliers > 0:
                    warnings_list.append(f"Detectados {outliers} outliers (>3σ), clipped")
                    lower_bound = mean_price - 3 * std_price
                    upper_bound = mean_price + 3 * std_price
                    df['close'] = df['close'].clip(lower=lower_bound, upper=upper_bound)

        # 7. Ordenar por fecha
        df = df.sort_values('date').reset_index(drop=True)

        # 8. Verificar que tenemos suficientes datos
        final_len = len(df)
        if final_len < 10:
            raise ValueError(f"Datos insuficientes después de limpieza: {final_len} filas")

        if final_len < original_len * 0.7:
            warnings_list.append(f"Perdidos más del 30% de datos ({original_len} -> {final_len})")

        return df, warnings_list

    def _create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Crea features para el modelo de ML

        Features:
        - Días desde inicio
        - Lag features (precio de días anteriores)
        - Rolling statistics (media móvil, volatilidad)
        - Día de la semana (efectos estacionales)
        - Retornos logarítmicos
        """
        df = df.copy()

        # Feature básico: días desde inicio
        df['days'] = (df['date'] - df['date'].min()).dt.days

        # Lag features
        for lag in [1, 3, 5, 7]:
            if len(df) > lag:
                df[f'lag_{lag}'] = df['close'].shift(lag)

        # Rolling statistics
        for window in [5, 10, 20]:
            if len(df) > window:
                df[f'rolling_mean_{window}'] = df['close'].rolling(window=window).mean()
                df[f'rolling_std_{window}'] = df['close'].rolling(window=window).std()

        # Retorno logarítmico
        df['log_return'] = np.log(df['close'] / df['close'].shift(1))

        # Retorno acumulado
        df['cumulative_return'] = (df['close'] / df['close'].iloc[0] - 1) * 100

        # Volatilidad móvil
        if len(df) > 10:
            df['volatility'] = df['log_return'].rolling(window=10).std() * np.sqrt(252)

        # Día de la semana (0=lunes, 6=domingo)
        df['day_of_week'] = df['date'].dt.dayofweek

        # Momentum
        if len(df) > 5:
            df['momentum_5'] = df['close'] - df['close'].shift(5)

        # RSI simplificado
        if len(df) > 14:
            delta = df['close'].diff()
            gain = delta.where(delta > 0, 0).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss.replace(0, np.nan)
            df['rsi'] = 100 - (100 / (1 + rs))

        return df

    def _select_features(self, df: pd.DataFrame) -> List[str]:
        """
        Selecciona las mejores features disponibles
        """
        # Lista de features potenciales en orden de importancia
        potential_features = [
            'days',
            'lag_1', 'lag_3', 'lag_5', 'lag_7',
            'rolling_mean_5', 'rolling_mean_10', 'rolling_mean_20',
            'rolling_std_5', 'rolling_std_10',
            'momentum_5',
            'rsi',
            'volatility',
            'day_of_week'
        ]

        # Seleccionar solo features que existen y tienen valores válidos
        selected = []
        for feat in potential_features:
            if feat in df.columns:
                # Verificar que tiene valores no-nulos en las últimas filas
                if df[feat].iloc[-10:].notna().sum() >= 5:
                    selected.append(feat)

        return selected if selected else ['days']

    def predict_prices(
        self,
        symbol: str,
        asset_type: str,
        days_ahead: int = 7,
        history_period: str = "3M"
    ) -> Dict:
        """
        Predice precios futuros usando Ridge Regression con features de series temporales.

        Pipeline:
        1. Obtener datos históricos
        2. Preprocesar (limpiar nulos, outliers)
        3. Crear features (lags, rolling stats)
        4. Escalar datos
        5. Entrenar modelo con regularización
        6. Validar con TimeSeriesSplit
        7. Generar predicciones con intervalos de confianza
        """
        result = {
            "symbol": symbol.upper(),
            "asset_type": asset_type,
            "error": None,
            "warnings": []
        }

        try:
            # 1. Obtener datos históricos
            history = price_service.get_history(symbol, asset_type, history_period)

            if not history:
                result["error"] = f"No se pudieron obtener datos históricos para {symbol}"
                return result

            if not history.get("prices"):
                result["error"] = f"No hay precios históricos para {symbol}"
                return result

            prices = history["prices"]

            if len(prices) < 15:
                result["error"] = f"Datos insuficientes: {len(prices)} puntos (mínimo 15)"
                return result

            # 2. Preprocesar datos
            df = pd.DataFrame(prices)
            df, preprocess_warnings = self._preprocess_data(df)
            result["warnings"].extend(preprocess_warnings)

            # 3. Crear features
            df = self._create_features(df)

            # 4. Seleccionar features
            feature_cols = self._select_features(df)

            # 5. Preparar datos para entrenamiento (eliminar NaN de features)
            df_train = df.dropna(subset=feature_cols + ['close'])

            if len(df_train) < 10:
                result["error"] = f"Datos insuficientes después de crear features: {len(df_train)}"
                return result

            X = df_train[feature_cols].values
            y = df_train['close'].values

            # 6. Escalar datos
            X_scaled = self.scaler_X.fit_transform(X)
            y_scaled = self.scaler_y.fit_transform(y.reshape(-1, 1)).flatten()

            if SKLEARN_AVAILABLE:
                # 7. Entrenar modelo con regularización (Ridge)
                # Alpha alto para evitar overfitting en series temporales
                model = Ridge(alpha=1.0)
                model.fit(X_scaled, y_scaled)

                # 8. Validación cruzada temporal
                n_splits = min(5, len(df_train) // 10)
                if n_splits >= 2:
                    tscv = TimeSeriesSplit(n_splits=n_splits)
                    cv_scores = cross_val_score(model, X_scaled, y_scaled, cv=tscv, scoring='r2')
                    cv_r2 = np.mean(cv_scores)
                    cv_std = np.std(cv_scores)
                else:
                    cv_r2 = None
                    cv_std = None

                # 9. Calcular métricas de entrenamiento
                y_pred_scaled = model.predict(X_scaled)
                y_pred = self.scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()

                train_r2 = r2_score(y, y_pred)
                train_rmse = np.sqrt(mean_squared_error(y, y_pred))
                train_mae = mean_absolute_error(y, y_pred)
            else:
                # Fallback: Simple linear regression using numpy
                model = None
                cv_r2 = None
                cv_std = None

                # Simple linear fit on 'days' feature
                days_idx = feature_cols.index('days') if 'days' in feature_cols else 0
                x_days = X[:, days_idx]

                # Linear regression coefficients
                n = len(x_days)
                x_mean = np.mean(x_days)
                y_mean = np.mean(y)

                numerator = np.sum((x_days - x_mean) * (y - y_mean))
                denominator = np.sum((x_days - x_mean) ** 2)

                self._simple_slope = numerator / denominator if denominator != 0 else 0
                self._simple_intercept = y_mean - self._simple_slope * x_mean
                self._days_idx = days_idx

                y_pred = self._simple_slope * x_days + self._simple_intercept

                # Calculate R² manually
                ss_res = np.sum((y - y_pred) ** 2)
                ss_tot = np.sum((y - y_mean) ** 2)
                train_r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

                # Calculate RMSE and MAE manually
                train_rmse = np.sqrt(np.mean((y - y_pred) ** 2))
                train_mae = np.mean(np.abs(y - y_pred))

            # 10. Calcular residuos para intervalos de confianza
            residuals = y - y_pred
            residual_std = np.std(residuals)

            # 11. Generar predicciones futuras
            last_row = df_train.iloc[-1]
            last_date = df_train['date'].max()
            current_price = float(df_train['close'].iloc[-1])

            predictions = []

            # Crear features para días futuros
            for i in range(1, days_ahead + 1):
                future_date = last_date + timedelta(days=i)

                # Construir features para predicción
                future_features = {}

                # Days
                future_features['days'] = last_row['days'] + i

                # Para lags y rolling, usar valores recientes (simplificado)
                for lag in [1, 3, 5, 7]:
                    col = f'lag_{lag}'
                    if col in feature_cols:
                        if i == 1:
                            future_features[col] = current_price
                        else:
                            # Usar predicción anterior como lag
                            future_features[col] = predictions[-1]['predicted_price'] if predictions else current_price

                # Rolling means: usar último valor conocido
                for window in [5, 10, 20]:
                    for stat in ['mean', 'std']:
                        col = f'rolling_{stat}_{window}'
                        if col in feature_cols:
                            future_features[col] = float(last_row.get(col, current_price if stat == 'mean' else 0))

                # Momentum
                if 'momentum_5' in feature_cols:
                    future_features['momentum_5'] = float(last_row.get('momentum_5', 0))

                # RSI
                if 'rsi' in feature_cols:
                    future_features['rsi'] = float(last_row.get('rsi', 50))

                # Volatility
                if 'volatility' in feature_cols:
                    future_features['volatility'] = float(last_row.get('volatility', 0))

                # Day of week
                if 'day_of_week' in feature_cols:
                    future_features['day_of_week'] = future_date.weekday()

                # Crear vector de features
                X_future = np.array([[future_features.get(col, 0) for col in feature_cols]])

                # Predecir
                if SKLEARN_AVAILABLE and model is not None:
                    X_future_scaled = self.scaler_X.transform(X_future)
                    y_future_scaled = model.predict(X_future_scaled)
                    y_future = self.scaler_y.inverse_transform(y_future_scaled.reshape(-1, 1)).flatten()[0]
                else:
                    # Simple prediction using linear model
                    future_days = future_features.get('days', last_row['days'] + i)
                    y_future = self._simple_slope * future_days + self._simple_intercept

                # Asegurar precio positivo
                y_future = max(0.01, y_future)

                # Calcular intervalos de confianza (aumentan con el horizonte)
                uncertainty_factor = 1 + (i * 0.15)  # 15% más incertidumbre por día
                margin = residual_std * 1.96 * uncertainty_factor

                predictions.append({
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_price": round(float(y_future), 2),
                    "lower_bound": round(max(0.01, float(y_future - margin)), 2),
                    "upper_bound": round(float(y_future + margin), 2)
                })

            # 12. Determinar tendencia
            trend = self._determine_trend(predictions, current_price)

            # 13. Calcular confianza del modelo
            volatility_pct = (residual_std / current_price) * 100

            # Confianza basada en R² y volatilidad
            if cv_r2 is not None:
                base_confidence = max(0, cv_r2 * 100)
            else:
                base_confidence = max(0, train_r2 * 100)

            # Penalizar por alta volatilidad
            volatility_penalty = min(50, volatility_pct * 2)
            confidence = max(0, min(100, base_confidence - volatility_penalty))

            return {
                "symbol": symbol.upper(),
                "asset_type": asset_type,
                "current_price": round(current_price, 2),
                "predictions": predictions,
                "trend": trend,
                "confidence": round(confidence, 2),
                "prediction_days": days_ahead,
                "metrics": {
                    "train_r2": round(train_r2, 4),
                    "cv_r2": round(cv_r2, 4) if cv_r2 else None,
                    "cv_std": round(cv_std, 4) if cv_std else None,
                    "rmse": round(train_rmse, 2),
                    "mae": round(train_mae, 2)
                },
                "historical_volatility": round(volatility_pct, 2),
                "features_used": feature_cols,
                "data_points": len(df_train),
                "warnings": result["warnings"] if result["warnings"] else None,
                "model": "Ridge Regression" if SKLEARN_AVAILABLE else "Simple Linear Regression",
                "regularization": "L2 (alpha=1.0)" if SKLEARN_AVAILABLE else "None"
            }

        except ValueError as e:
            result["error"] = str(e)
            return result
        except Exception as e:
            result["error"] = f"Error inesperado: {str(e)}"
            return result

    def _determine_trend(self, predictions: List[Dict], current_price: float) -> str:
        """Determina la tendencia basada en las predicciones"""
        if not predictions or current_price <= 0:
            return "neutral"

        last_predicted = predictions[-1]["predicted_price"]
        change_pct = ((last_predicted - current_price) / current_price) * 100

        # Tendencia más conservadora
        if change_pct > 5:
            return "bullish"
        elif change_pct < -5:
            return "bearish"
        else:
            return "neutral"

    def calculate_correlation_matrix(
        self,
        symbols: List[tuple],  # Lista de (symbol, asset_type)
        period: str = "3M"
    ) -> Dict:
        """
        Calcula la matriz de correlación entre múltiples activos.

        Usa retornos logarítmicos para mayor estabilidad estadística.
        """
        try:
            # Recopilar datos de precios
            price_data = {}
            errors = []

            for symbol, asset_type in symbols:
                try:
                    history = price_service.get_history(symbol, asset_type, period)
                    if history and history.get("prices"):
                        prices = [p["close"] for p in history["prices"]]
                        # Filtrar valores nulos o zero
                        prices = [p for p in prices if p and p > 0]
                        if len(prices) >= 10:
                            price_data[symbol] = prices
                        else:
                            errors.append(f"{symbol}: datos insuficientes ({len(prices)} puntos)")
                    else:
                        errors.append(f"{symbol}: no se encontraron datos")
                except Exception as e:
                    errors.append(f"{symbol}: error al obtener datos - {str(e)}")

            if len(price_data) < 2:
                return {
                    "error": "Datos insuficientes para calcular correlación",
                    "details": errors
                }

            # Alinear datos por longitud mínima
            min_length = min(len(prices) for prices in price_data.values())
            aligned_data = {
                symbol: prices[-min_length:]
                for symbol, prices in price_data.items()
            }

            # Crear DataFrame
            df = pd.DataFrame(aligned_data)

            # Calcular retornos logarítmicos (más estables que porcentuales)
            returns = np.log(df / df.shift(1)).dropna()

            # Eliminar infinitos
            returns = returns.replace([np.inf, -np.inf], np.nan).dropna()

            if len(returns) < 5:
                return {
                    "error": "Datos insuficientes después de calcular retornos"
                }

            # Calcular matriz de correlación
            corr_matrix = returns.corr()

            # Preparar resultado
            symbols_list = list(corr_matrix.columns)
            matrix = corr_matrix.values.tolist()

            # Extraer pares con correlación
            pairs = []
            for i, sym1 in enumerate(symbols_list):
                for j, sym2 in enumerate(symbols_list):
                    if i < j:
                        correlation = corr_matrix.iloc[i, j]
                        if not np.isnan(correlation):
                            pairs.append({
                                "symbol1": sym1,
                                "symbol2": sym2,
                                "correlation": round(float(correlation), 4)
                            })

            # Ordenar pares por correlación absoluta
            pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

            return {
                "symbols": symbols_list,
                "matrix": [[round(float(v), 4) if not np.isnan(v) else 0 for v in row] for row in matrix],
                "pairs": pairs,
                "period": period,
                "data_points": len(returns),
                "warnings": errors if errors else None
            }

        except Exception as e:
            return {
                "error": f"Error al calcular correlación: {str(e)}"
            }

    def get_trend_analysis(self, symbol: str, asset_type: str) -> Dict:
        """
        Análisis completo de tendencia de un activo
        """
        try:
            # Obtener datos de diferentes periodos
            history_1m = price_service.get_history(symbol, asset_type, "1M")
            history_3m = price_service.get_history(symbol, asset_type, "3M")

            if not history_1m or not history_3m:
                return {
                    "error": f"No se pudieron obtener datos históricos para {symbol}"
                }

            if not history_1m.get("prices") or not history_3m.get("prices"):
                return {
                    "error": f"No hay precios históricos para {symbol}"
                }

            prices_1m = [p["close"] for p in history_1m["prices"] if p.get("close") and p["close"] > 0]
            prices_3m = [p["close"] for p in history_3m["prices"] if p.get("close") and p["close"] > 0]

            if len(prices_1m) < 5 or len(prices_3m) < 10:
                return {
                    "error": f"Datos insuficientes para {symbol}"
                }

            current_price = prices_1m[-1]

            # Calcular métricas
            def calc_metrics(prices):
                if len(prices) < 2:
                    return {}

                returns = pd.Series(prices).pct_change().dropna()
                returns = returns.replace([np.inf, -np.inf], np.nan).dropna()

                if len(returns) < 2:
                    return {}

                return {
                    "change_pct": round(((prices[-1] - prices[0]) / prices[0]) * 100, 2),
                    "volatility": round(returns.std() * 100, 2),
                    "max_drawdown": self._calculate_max_drawdown(prices),
                    "sharpe_ratio": self._calculate_sharpe_ratio(returns)
                }

            metrics_1m = calc_metrics(prices_1m)
            metrics_3m = calc_metrics(prices_3m)

            # Determinar tendencia
            short_trend = "bullish" if metrics_1m.get("change_pct", 0) > 3 else (
                "bearish" if metrics_1m.get("change_pct", 0) < -3 else "neutral"
            )
            long_trend = "bullish" if metrics_3m.get("change_pct", 0) > 8 else (
                "bearish" if metrics_3m.get("change_pct", 0) < -8 else "neutral"
            )

            # Indicadores técnicos
            indicators = history_1m.get("indicators", {})

            return {
                "symbol": symbol.upper(),
                "asset_type": asset_type,
                "current_price": round(current_price, 2),
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
            return {
                "error": f"Error al analizar {symbol}: {str(e)}"
            }

    def _calculate_max_drawdown(self, prices: List[float]) -> float:
        """Calcula el máximo drawdown"""
        if len(prices) < 2:
            return 0

        peak = prices[0]
        max_dd = 0

        for price in prices:
            if price > peak:
                peak = price
            if peak > 0:
                drawdown = (peak - price) / peak * 100
                max_dd = max(max_dd, drawdown)

        return round(max_dd, 2)

    def _calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calcula el Sharpe Ratio anualizado"""
        if returns.empty or len(returns) < 2:
            return 0

        std = returns.std()
        if std == 0 or np.isnan(std):
            return 0

        # Anualizar (asumiendo datos diarios)
        annual_return = returns.mean() * 252
        annual_std = std * np.sqrt(252)

        if annual_std == 0:
            return 0

        sharpe = (annual_return - risk_free_rate) / annual_std
        return round(sharpe, 2)


ml_service = MLService()
