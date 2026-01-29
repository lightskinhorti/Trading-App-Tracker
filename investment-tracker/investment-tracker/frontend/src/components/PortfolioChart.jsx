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
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import { assetsApi } from '../services/api';

const PERIODS = [
  { label: '1S', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1A', value: '1Y' },
];

function PortfolioChart() {
  const [period, setPeriod] = useState('1M');
  const [portfolioData, setPortfolioData] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBenchmarks, setShowBenchmarks] = useState({ sp500: true, btc: true });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [portfolioRes, benchmarkRes] = await Promise.all([
        assetsApi.getPortfolioPerformance(period),
        assetsApi.getBenchmarks(period),
      ]);
      setPortfolioData(portfolioRes.data);
      setBenchmarkData(benchmarkRes.data);
    } catch (err) {
      setError('Error al cargar datos de rendimiento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split(' ')[0].split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  // Preparar datos combinados para el gráfico
  const prepareChartData = () => {
    if (!portfolioData?.performance?.length) return [];

    // Usar fechas del portfolio como referencia
    const portfolioPerf = portfolioData.performance;

    // Normalizar datos del portfolio
    const firstPortfolioValue = portfolioPerf[0]?.value || 1;

    return portfolioPerf.map((point, index) => {
      const sp500Point = benchmarkData?.sp500?.prices?.[index];
      const btcPoint = benchmarkData?.btc?.prices?.[index];

      return {
        date: formatDate(point.date),
        fullDate: point.date,
        portfolio: (point.value / firstPortfolioValue) * 100,
        portfolioValue: point.value,
        sp500: sp500Point?.normalized || null,
        btc: btcPoint?.normalized || null,
      };
    });
  };

  const chartData = prepareChartData();

  // Calcular rendimiento
  const getPerformance = (data, key) => {
    if (!data || data.length < 2) return { value: 0, percent: 0 };
    const first = data[0]?.[key] || 100;
    const last = data[data.length - 1]?.[key] || 100;
    return {
      value: last - first,
      percent: ((last - first) / first) * 100,
    };
  };

  const portfolioPerf = getPerformance(chartData, 'portfolio');
  const sp500Perf = getPerformance(chartData, 'sp500');
  const btcPerf = getPerformance(chartData, 'btc');

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-gray-400 text-sm mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.value?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold">Rendimiento vs Benchmarks</h3>
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

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Mi Portfolio</span>
            <div className="w-3 h-3 rounded-full bg-blue-500" />
          </div>
          <div className={`flex items-center gap-2 mt-2 ${portfolioPerf.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {portfolioPerf.percent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-xl font-bold">
              {portfolioPerf.percent >= 0 ? '+' : ''}{portfolioPerf.percent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">S&P 500</span>
            <div className="w-3 h-3 rounded-full bg-amber-500" />
          </div>
          <div className={`flex items-center gap-2 mt-2 ${sp500Perf.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {sp500Perf.percent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-xl font-bold">
              {sp500Perf.percent >= 0 ? '+' : ''}{sp500Perf.percent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Bitcoin</span>
            <div className="w-3 h-3 rounded-full bg-orange-500" />
          </div>
          <div className={`flex items-center gap-2 mt-2 ${btcPerf.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {btcPerf.percent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-xl font-bold">
              {btcPerf.percent >= 0 ? '+' : ''}{btcPerf.percent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Benchmark toggles */}
      <div className="flex items-center gap-6 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showBenchmarks.sp500}
            onChange={(e) => setShowBenchmarks(prev => ({ ...prev, sp500: e.target.checked }))}
            className="rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-gray-300">S&P 500</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showBenchmarks.btc}
            onChange={(e) => setShowBenchmarks(prev => ({ ...prev, btc: e.target.checked }))}
            className="rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-300">Bitcoin</span>
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
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-80 text-gray-400">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay datos del portfolio para mostrar</p>
            <p className="text-sm text-gray-500 mt-1">Añade activos a tu portfolio para ver el rendimiento</p>
          </div>
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
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={false}
                name="Mi Portfolio"
              />
              {showBenchmarks.sp500 && (
                <Line
                  type="monotone"
                  dataKey="sp500"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                  name="S&P 500"
                />
              )}
              {showBenchmarks.btc && (
                <Line
                  type="monotone"
                  dataKey="btc"
                  stroke="#F97316"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="3 3"
                  name="Bitcoin"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Explanation */}
      <p className="text-gray-500 text-xs mt-4">
        * Los valores están normalizados a base 100 para facilitar la comparación del rendimiento relativo.
      </p>
    </div>
  );
}

export default PortfolioChart;
