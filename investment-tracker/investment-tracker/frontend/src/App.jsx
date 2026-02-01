import { useState, useEffect } from 'react';
import { Plus, RefreshCw, TrendingUp, BarChart2, Activity, X, Bell, Brain, Grid3X3 } from 'lucide-react';
import { assetsApi } from './services/api';
import PortfolioSummary from './components/PortfolioSummary';
import AssetList from './components/AssetList';
import AddAssetModal from './components/AddAssetModal';
import PriceChart from './components/PriceChart';
import PortfolioChart from './components/PortfolioChart';
import TechnicalIndicators from './components/TechnicalIndicators';
import AlertsManager from './components/AlertsManager';
import PredictionChart from './components/PredictionChart';
import CorrelationMatrix from './components/CorrelationMatrix';

function App() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio', 'analysis', 'benchmarks'
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchPortfolio = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError('');

    try {
      const response = await assetsApi.getPortfolio();
      setPortfolio(response.data);
    } catch (err) {
      setError('Error al cargar el portfolio. ¿Está el servidor funcionando?');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este activo del portfolio?')) return;

    try {
      await assetsApi.deleteAsset(id);
      fetchPortfolio();
    } catch (err) {
      setError('Error al eliminar el activo');
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Auto-refresh cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPortfolio(true);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold">Investment Tracker</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchPortfolio(true)}
                disabled={refreshing}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Añadir Activo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-800/50 border-b border-gray-700 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 min-w-max">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'portfolio'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Análisis
              {selectedAsset && <span className="ml-1 text-xs bg-blue-600 px-2 py-0.5 rounded">{selectedAsset.symbol}</span>}
            </button>
            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'benchmarks'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Benchmarks
            </button>
            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'predictions'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Brain className="w-4 h-4" />
              Predicciones
            </button>
            <button
              onClick={() => setActiveTab('correlation')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'correlation'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Correlación
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'alerts'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              Alertas
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && portfolio && (
              <>
                <PortfolioSummary portfolio={portfolio} />
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-200">Tus Activos</h2>
                    <p className="text-sm text-gray-400">Haz clic en un activo para ver su análisis</p>
                  </div>
                  <AssetListWithChart
                    assets={portfolio.assets}
                    onDelete={handleDelete}
                    onSelect={handleAssetSelect}
                  />
                </div>
              </>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                {selectedAsset ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Análisis de {selectedAsset.symbol}</h2>
                      <button
                        onClick={() => setSelectedAsset(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cerrar análisis
                      </button>
                    </div>
                    <PriceChart asset={selectedAsset} />
                    <TechnicalIndicators asset={selectedAsset} />
                  </>
                ) : (
                  <div className="bg-gray-800 rounded-xl p-12 text-center">
                    <BarChart2 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg">Selecciona un activo para ver su análisis</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Ve a la pestaña Portfolio y haz clic en cualquier activo
                    </p>
                    {portfolio?.assets?.length > 0 && (
                      <div className="mt-6">
                        <p className="text-gray-400 text-sm mb-3">O selecciona uno aquí:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {portfolio.assets.map((asset) => (
                            <button
                              key={asset.id}
                              onClick={() => setSelectedAsset(asset)}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              {asset.symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Benchmarks Tab */}
            {activeTab === 'benchmarks' && (
              <PortfolioChart />
            )}

            {/* Predictions Tab */}
            {activeTab === 'predictions' && (
              <div className="space-y-6">
                {selectedAsset ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Predicción ML - {selectedAsset.symbol}</h2>
                      <button
                        onClick={() => setSelectedAsset(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cerrar
                      </button>
                    </div>
                    <PredictionChart asset={selectedAsset} />
                  </>
                ) : (
                  <div className="bg-gray-800 rounded-xl p-12 text-center">
                    <Brain className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg">Selecciona un activo para ver predicciones</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Las predicciones usan Machine Learning para estimar precios futuros
                    </p>
                    {portfolio?.assets?.length > 0 && (
                      <div className="mt-6">
                        <p className="text-gray-400 text-sm mb-3">Selecciona un activo:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {portfolio.assets.map((asset) => (
                            <button
                              key={asset.id}
                              onClick={() => setSelectedAsset(asset)}
                              className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors"
                            >
                              {asset.symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Correlation Tab */}
            {activeTab === 'correlation' && (
              <CorrelationMatrix />
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <AlertsManager portfolio={portfolio} />
            )}
          </>
        )}
      </main>

      {/* Modal */}
      <AddAssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssetAdded={() => fetchPortfolio()}
      />
    </div>
  );
}

// Componente AssetList extendido con selección
function AssetListWithChart({ assets, onDelete, onSelect }) {
  if (assets.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-12 text-center">
        <p className="text-gray-400">No tienes activos en tu portfolio</p>
        <p className="text-gray-500 text-sm mt-2">Añade acciones o criptomonedas para empezar</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="text-left p-4 text-gray-400 font-medium">Activo</th>
            <th className="text-right p-4 text-gray-400 font-medium">Cantidad</th>
            <th className="text-right p-4 text-gray-400 font-medium">Precio Compra</th>
            <th className="text-right p-4 text-gray-400 font-medium">Precio Actual</th>
            <th className="text-right p-4 text-gray-400 font-medium">Valor</th>
            <th className="text-right p-4 text-gray-400 font-medium">P/L</th>
            <th className="text-right p-4 text-gray-400 font-medium">24h</th>
            <th className="text-right p-4 text-gray-400 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const isProfitable = asset.profit_loss >= 0;
            const isDailyPositive = asset.daily_change_percent >= 0;

            return (
              <tr
                key={asset.id}
                className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors"
                onClick={() => onSelect(asset)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${asset.asset_type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                      {asset.asset_type === 'crypto' ? (
                        <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z" />
                        </svg>
                      ) : (
                        <BarChart2 className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{asset.symbol}</p>
                      <p className="text-sm text-gray-400">{asset.name}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">{asset.quantity}</td>
                <td className="p-4 text-right">${asset.purchase_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right">${asset.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-semibold">
                  ${asset.current_value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </td>
                <td className={`p-4 text-right ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{isProfitable ? '+' : ''}{asset.profit_loss_percent.toFixed(2)}%</span>
                  </div>
                </td>
                <td className={`p-4 text-right ${isDailyPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isDailyPositive ? '+' : ''}{asset.daily_change_percent.toFixed(2)}%
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(asset);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Ver gráfico"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(asset.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
