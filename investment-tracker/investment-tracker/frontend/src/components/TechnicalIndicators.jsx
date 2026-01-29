import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { assetsApi } from '../services/api';

function TechnicalIndicators({ asset }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await assetsApi.getAssetHistory(
          asset.symbol,
          asset.asset_type,
          '3M' // Usar 3 meses para tener suficientes datos para indicadores
        );
        setHistoryData(response.data);
      } catch (err) {
        setError('Error al cargar indicadores');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [asset.symbol, asset.asset_type]);

  const indicators = historyData?.indicators || {};
  const prices = historyData?.prices || [];

  // Preparar datos para el gráfico RSI
  const rsiData = prices.map((price, index) => ({
    date: price.date.split(' ')[0].split('-').slice(1).join('/'),
    rsi: indicators.rsi?.[index] || null,
  })).filter(d => d.rsi !== null);

  // Análisis de señales
  const getSignal = () => {
    const rsi = indicators.current_rsi;
    const sma20 = indicators.current_sma20;
    const sma50 = indicators.current_sma50;
    const currentPrice = prices[prices.length - 1]?.close || 0;

    const signals = [];

    // Señales RSI
    if (rsi > 70) {
      signals.push({ type: 'warning', text: 'RSI en zona de sobrecompra (>70)', icon: AlertCircle });
    } else if (rsi < 30) {
      signals.push({ type: 'success', text: 'RSI en zona de sobreventa (<30)', icon: TrendingUp });
    }

    // Señales SMA
    if (sma20 && sma50) {
      if (sma20 > sma50) {
        signals.push({ type: 'success', text: 'SMA20 por encima de SMA50 (tendencia alcista)', icon: TrendingUp });
      } else {
        signals.push({ type: 'warning', text: 'SMA20 por debajo de SMA50 (tendencia bajista)', icon: TrendingDown });
      }
    }

    // Precio vs SMAs
    if (currentPrice && sma20) {
      if (currentPrice > sma20) {
        signals.push({ type: 'info', text: 'Precio por encima de SMA20', icon: TrendingUp });
      } else {
        signals.push({ type: 'info', text: 'Precio por debajo de SMA20', icon: TrendingDown });
      }
    }

    return signals;
  };

  const signals = getSignal();

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
        <div className="text-center text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-blue-500" />
        <h3 className="text-xl font-bold">Indicadores Técnicos - {asset.symbol}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Indicadores actuales */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-300">Valores Actuales</h4>

          {/* RSI */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">RSI (14 periodos)</span>
              <span className={`text-xl font-bold ${
                indicators.current_rsi > 70 ? 'text-red-400' :
                indicators.current_rsi < 30 ? 'text-green-400' : 'text-gray-200'
              }`}>
                {indicators.current_rsi?.toFixed(2) || '-'}
              </span>
            </div>
            {/* RSI Gauge */}
            <div className="relative h-3 bg-gray-600 rounded-full overflow-hidden">
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-green-500/30" />
                <div className="w-[40%] bg-gray-500/30" />
                <div className="w-[30%] bg-red-500/30" />
              </div>
              {indicators.current_rsi && (
                <div
                  className="absolute top-0 w-2 h-full bg-white rounded-full transform -translate-x-1/2"
                  style={{ left: `${indicators.current_rsi}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Sobreventa (0-30)</span>
              <span>Neutral (30-70)</span>
              <span>Sobrecompra (70-100)</span>
            </div>
          </div>

          {/* SMAs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <span className="text-gray-400 text-sm">SMA 20</span>
              <p className="text-xl font-bold text-amber-400 mt-1">
                ${indicators.current_sma20?.toFixed(2) || '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Media móvil simple 20 días</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <span className="text-gray-400 text-sm">SMA 50</span>
              <p className="text-xl font-bold text-purple-400 mt-1">
                ${indicators.current_sma50?.toFixed(2) || '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Media móvil simple 50 días</p>
            </div>
          </div>

          {/* Señales de trading */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h5 className="text-gray-400 text-sm mb-3">Señales de Análisis</h5>
            <div className="space-y-2">
              {signals.length > 0 ? signals.map((signal, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    signal.type === 'success' ? 'bg-green-500/10 text-green-400' :
                    signal.type === 'warning' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <signal.icon className="w-4 h-4" />
                  <span className="text-sm">{signal.text}</span>
                </div>
              )) : (
                <p className="text-gray-500 text-sm">No hay señales significativas</p>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico RSI */}
        <div>
          <h4 className="text-lg font-semibold text-gray-300 mb-4">Evolución RSI</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rsiData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  domain={[0, 100]}
                  ticks={[0, 30, 50, 70, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [value?.toFixed(2), 'RSI']}
                />
                <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Sobrecompra', fill: '#EF4444', fontSize: 10 }} />
                <ReferenceLine y={30} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Sobreventa', fill: '#10B981', fontSize: 10 }} />
                <ReferenceLine y={50} stroke="#6B7280" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leyenda explicativa */}
      <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
        <h5 className="text-sm font-semibold text-gray-300 mb-2">Guía de interpretación</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
          <div>
            <p className="font-medium text-gray-300">RSI (Relative Strength Index)</p>
            <p>Mide la velocidad y cambio de los movimientos de precio. Valores por encima de 70 indican sobrecompra, por debajo de 30 indican sobreventa.</p>
          </div>
          <div>
            <p className="font-medium text-gray-300">SMA (Simple Moving Average)</p>
            <p>Media móvil que suaviza las fluctuaciones de precio. Cuando SMA20 cruza por encima de SMA50, puede indicar tendencia alcista (Golden Cross).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TechnicalIndicators;
