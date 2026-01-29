import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, ComposedChart, Legend
} from 'recharts';
import { Brain, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { analysisApi, assetsApi } from '../services/api';

function PredictionChart({ asset }) {
  const [prediction, setPrediction] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [predRes, histRes] = await Promise.all([
        analysisApi.getPrediction(asset.symbol, asset.asset_type, days),
        assetsApi.getAssetHistory(asset.symbol, asset.asset_type, '1M')
      ]);
      setPrediction(predRes.data);
      setHistoryData(histRes.data);
    } catch (err) {
      setError('Error al cargar predicciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [asset.symbol, days]);

  const formatDate = (dateStr) => {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  // Preparar datos combinados (histórico + predicción)
  const chartData = [];

  // Añadir últimos datos históricos
  if (historyData?.prices) {
    const lastPrices = historyData.prices.slice(-14); // Últimos 14 días
    lastPrices.forEach(p => {
      chartData.push({
        date: formatDate(p.date),
        fullDate: p.date,
        actual: p.close,
        predicted: null,
        lower: null,
        upper: null,
        type: 'historical'
      });
    });
  }

  // Añadir predicciones
  if (prediction?.predictions) {
    prediction.predictions.forEach((p, i) => {
      chartData.push({
        date: formatDate(p.date),
        fullDate: p.date,
        actual: i === 0 ? prediction.current_price : null, // Conectar con último precio real
        predicted: p.predicted_price,
        lower: p.lower_bound,
        upper: p.upper_bound,
        type: 'prediction'
      });
    });
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'bullish': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'bearish': return <TrendingDown className="w-5 h-5 text-red-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-center h-64 text-red-400">
          <AlertCircle className="w-6 h-6 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-purple-500" />
          <h3 className="text-xl font-bold">Predicción ML - {asset.symbol}</h3>
        </div>

        {/* Selector de días */}
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Prediction summary cards */}
      {prediction && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Precio Actual</p>
            <p className="text-xl font-bold">${prediction.current_price?.toFixed(2)}</p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Predicción ({days}d)</p>
            <p className="text-xl font-bold text-purple-400">
              ${prediction.predictions?.[prediction.predictions.length - 1]?.predicted_price?.toFixed(2)}
            </p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Tendencia</p>
            <div className={`flex items-center gap-2 ${getTrendColor(prediction.trend)}`}>
              {getTrendIcon(prediction.trend)}
              <span className="text-lg font-bold capitalize">{prediction.trend}</span>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Confianza</p>
            <p className={`text-xl font-bold ${getConfidenceColor(prediction.confidence)}`}>
              {prediction.confidence?.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                const labels = {
                  actual: 'Precio Real',
                  predicted: 'Predicción',
                  upper: 'Límite Superior',
                  lower: 'Límite Inferior'
                };
                return [value ? `$${value.toFixed(2)}` : '-', labels[name] || name];
              }}
            />
            <Legend />

            {/* Banda de confianza */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="#8B5CF6"
              fillOpacity={0.1}
              name="Límite Superior"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="#8B5CF6"
              fillOpacity={0.1}
              name="Límite Inferior"
            />

            {/* Precio real */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Precio Real"
              connectNulls
            />

            {/* Predicción */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#8B5CF6', r: 3 }}
              name="Predicción"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            Las predicciones se basan en análisis estadístico de datos históricos.
            No constituyen asesoramiento financiero. Invierte con precaución.
          </span>
        </p>
      </div>

      {/* Model info */}
      {prediction && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="text-gray-400">
            <span className="text-gray-500">Modelo R²: </span>
            <span className="text-gray-300">{(prediction.model_r2 * 100).toFixed(2)}%</span>
          </div>
          <div className="text-gray-400">
            <span className="text-gray-500">Volatilidad histórica: </span>
            <span className="text-gray-300">{prediction.historical_volatility?.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionChart;
