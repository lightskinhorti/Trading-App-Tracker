import { useState, useEffect } from 'react';
import { Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { assetsApi } from './services/api';
import PortfolioSummary from './components/PortfolioSummary';
import AssetList from './components/AssetList';
import AddAssetModal from './components/AddAssetModal';

function App() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

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
        ) : portfolio ? (
          <>
            <PortfolioSummary portfolio={portfolio} />
            <AssetList assets={portfolio.assets} onDelete={handleDelete} />
          </>
        ) : null}
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

export default App;
