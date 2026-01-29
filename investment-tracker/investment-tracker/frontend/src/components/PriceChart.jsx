import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { assetsApi } from '../services/api';

const PERIODS = [
  { label: '1D', value: '1D' },
  { label: '1S', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1A', value: '1Y' },
];

function PriceChart({ asset, onClose }) {
  const [period, setPeriod] = useState('1M');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await assetsApi.getAssetHistory(
        asset.symbol,
        asset.asset_type,
        period
      );
      setHistoryData(response.data);
    } catch (err) {
      setError('Error al cargar datos históricos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [asset.symbol, period]);

  const formatPrice = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (period === '1D') {
      return dateStr.split(' ')[1]?.substring(0, 5) || dateStr;
    }
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  // Preparar datos para el gráfico
  const chartData = historyData?.prices?.map((price, index) => ({
    date: formatDate(price.date),
    fullDate: price.date,
    close: price.close,
    sma20: historyData.indicators?.sma20?.[index] || null,
    sma50: historyData.indicators?.sma50?.[index] || null,
  })) || [];

  const indicators = historyData?.indicators || {};
  const firstPrice = chartData[0]?.close || 0;
  const lastPrice = chartData[chartData.length - 1]?.close || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-xl font-bold">{asset.symbol}</h3>
            <p className="text-gray-400 text-sm">{asset.name}</p>
          </div>
          <div className={`flex items-center gap-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span className="text-lg font-semibold">
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price info */}
      <div className="flex items-center gap-6 mb-4">
        <div>
          <span className="text-3xl font-bold">${lastPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
          <span className={`ml-3 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}${priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* SMA Toggle */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showSMA}
            onChange={(e) => setShowSMA(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Mostrar medias móviles (SMA)</span>
        </label>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-80">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-80 text-red-400">
          {error}
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={formatPrice}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value, name) => {
                  const labels = {
                    close: 'Precio',
                    sma20: 'SMA 20',
                    sma50: 'SMA 50',
                  };
                  return [value ? `$${value.toFixed(2)}` : '-', labels[name] || name];
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="close"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth={2}
                dot={false}
                name="Precio"
              />
              {showSMA && (
                <>
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="5 5"
                    name="SMA 20"
                  />
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    stroke="#8B5CF6"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="5 5"
                    name="SMA 50"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Technical Indicators Summary */}
      {!loading && !error && indicators && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">SMA 20</p>
            <p className="text-lg font-semibold text-amber-400">
              {indicators.current_sma20 ? `$${indicators.current_sma20.toFixed(2)}` : '-'}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">SMA 50</p>
            <p className="text-lg font-semibold text-purple-400">
              {indicators.current_sma50 ? `$${indicators.current_sma50.toFixed(2)}` : '-'}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">RSI (14)</p>
            <p className={`text-lg font-semibold ${
              indicators.current_rsi > 70 ? 'text-red-400' :
              indicators.current_rsi < 30 ? 'text-green-400' : 'text-gray-200'
            }`}>
              {indicators.current_rsi ? indicators.current_rsi.toFixed(2) : '-'}
              {indicators.current_rsi > 70 && <span className="text-xs ml-1">(Sobrecompra)</span>}
              {indicators.current_rsi < 30 && <span className="text-xs ml-1">(Sobreventa)</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceChart;
