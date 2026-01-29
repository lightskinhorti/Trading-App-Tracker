import { useState, useEffect } from 'react';
import { Grid3X3, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { analysisApi } from '../services/api';

function CorrelationMatrix() {
  const [correlation, setCorrelation] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('3M');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [corrRes, recRes] = await Promise.all([
        analysisApi.getPortfolioCorrelation(period),
        analysisApi.getRecommendations()
      ]);
      setCorrelation(corrRes.data);
      setRecommendations(recRes.data);
    } catch (err) {
      if (err.response?.status === 400) {
        setError('Se necesitan al menos 2 activos en el portfolio para calcular correlación');
      } else {
        setError('Error al cargar datos de correlación');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const getCorrelationColor = (value) => {
    // Escala de colores: rojo (correlación negativa) -> blanco (0) -> verde (correlación positiva)
    if (value === 1) return 'bg-blue-500'; // Diagonal (correlación consigo mismo)

    const absValue = Math.abs(value);
    const intensity = Math.round(absValue * 100);

    if (value > 0) {
      // Correlación positiva: verde
      if (value > 0.7) return 'bg-green-600';
      if (value > 0.4) return 'bg-green-500/70';
      if (value > 0.2) return 'bg-green-500/40';
      return 'bg-green-500/20';
    } else {
      // Correlación negativa: rojo
      if (value < -0.7) return 'bg-red-600';
      if (value < -0.4) return 'bg-red-500/70';
      if (value < -0.2) return 'bg-red-500/40';
      return 'bg-red-500/20';
    }
  };

  const getCorrelationText = (value) => {
    if (value === 1) return 'text-white';
    if (Math.abs(value) > 0.5) return 'text-white';
    return 'text-gray-200';
  };

  const getCorrelationInterpretation = (value) => {
    const abs = Math.abs(value);
    if (abs >= 0.8) return { label: 'Muy fuerte', color: 'text-purple-400' };
    if (abs >= 0.6) return { label: 'Fuerte', color: 'text-blue-400' };
    if (abs >= 0.4) return { label: 'Moderada', color: 'text-cyan-400' };
    if (abs >= 0.2) return { label: 'Débil', color: 'text-gray-400' };
    return { label: 'Muy débil', color: 'text-gray-500' };
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
        <div className="flex items-center gap-3 mb-4">
          <Grid3X3 className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold">Matriz de Correlación</h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Correlation Matrix */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Grid3X3 className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-bold">Matriz de Correlación</h3>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            {['1M', '3M', '1Y'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {correlation && (
          <>
            {/* Matrix visualization */}
            <div className="overflow-x-auto">
              <table className="mx-auto">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {correlation.symbols.map(symbol => (
                      <th key={symbol} className="p-2 text-sm font-medium text-gray-300 min-w-[60px]">
                        {symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlation.matrix.map((row, i) => (
                    <tr key={correlation.symbols[i]}>
                      <td className="p-2 text-sm font-medium text-gray-300">{correlation.symbols[i]}</td>
                      {row.map((value, j) => (
                        <td key={j} className="p-1">
                          <div
                            className={`w-14 h-14 flex items-center justify-center rounded-lg ${getCorrelationColor(value)} ${getCorrelationText(value)}`}
                            title={`${correlation.symbols[i]} vs ${correlation.symbols[j]}: ${value.toFixed(2)}`}
                          >
                            <span className="text-sm font-medium">
                              {value.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-600"></div>
                <span className="text-gray-400">Correlación negativa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-600"></div>
                <span className="text-gray-400">Sin correlación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600"></div>
                <span className="text-gray-400">Correlación positiva</span>
              </div>
            </div>

            {/* Top correlation pairs */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Pares más correlacionados</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {correlation.pairs.slice(0, 4).map((pair, i) => {
                  const interp = getCorrelationInterpretation(pair.correlation);
                  return (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pair.symbol1}</span>
                        <span className="text-gray-500">↔</span>
                        <span className="font-medium">{pair.symbol2}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${pair.correlation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pair.correlation.toFixed(3)}
                        </span>
                        <span className={`ml-2 text-xs ${interp.color}`}>({interp.label})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 text-xs text-gray-500">
              <p>Basado en {correlation.data_points} puntos de datos del periodo {correlation.period}</p>
            </div>
          </>
        )}
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-amber-500" />
            <h3 className="text-xl font-bold">Recomendaciones de Análisis</h3>
          </div>

          <div className="space-y-3">
            {recommendations.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  rec.type === 'warning' ? 'bg-red-500/10 border-red-500/30' :
                  rec.type === 'opportunity' ? 'bg-green-500/10 border-green-500/30' :
                  rec.type === 'diversification' ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                    rec.type === 'warning' ? 'bg-red-500/20 text-red-400' :
                    rec.type === 'opportunity' ? 'bg-green-500/20 text-green-400' :
                    rec.type === 'diversification' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {rec.symbol}
                  </span>
                  <p className="text-gray-300 text-sm">{rec.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4 text-sm text-gray-400">
            <span>Activos analizados: {recommendations.total_assets_analyzed}</span>
            <span className="text-red-400">Alertas: {recommendations.warnings}</span>
            <span className="text-green-400">Oportunidades: {recommendations.opportunities}</span>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">¿Qué es la correlación?</h4>
        <p className="text-xs text-gray-500">
          La correlación mide cómo se mueven dos activos entre sí. Un valor de +1 significa que se mueven
          perfectamente juntos, -1 que se mueven en direcciones opuestas, y 0 que no tienen relación.
          Para diversificar bien tu portfolio, busca activos con correlación baja o negativa entre sí.
        </p>
      </div>
    </div>
  );
}

export default CorrelationMatrix;
