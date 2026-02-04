import { useState, useEffect } from 'react';
import { TrendingUp, Bitcoin, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { assetsApi } from '../services/api';
import SparklineChart from './SparklineChart';

function PopularAssets({ onAddAsset }) {
  const [popularAssets, setPopularAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPopularAssets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError('');

    try {
      const response = await assetsApi.getPopularAssets();
      setPopularAssets(response.data || []);
    } catch (err) {
      console.error('Error fetching popular assets:', err);
      setError('No se pudieron cargar los activos populares');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPopularAssets();
  }, []);

  const getAssetIcon = (type) => {
    if (type === 'crypto') {
      return <Bitcoin className="w-5 h-5 text-orange-400" />;
    }
    return <TrendingUp className="w-5 h-5 text-blue-400" />;
  };

  const formatPrice = (price) => {
    if (price >= 1000) {
      return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Activos Populares</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-600 rounded w-16 mb-2" />
              <div className="h-6 bg-gray-600 rounded w-24 mb-2" />
              <div className="h-10 bg-gray-600 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Activos Populares</h2>
          <button
            onClick={() => fetchPopularAssets(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center py-8 text-gray-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Activos Populares</h2>
        <button
          onClick={() => fetchPopularAssets(true)}
          disabled={refreshing}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {popularAssets.map((asset) => {
          const isPositive = asset.daily_change_percent >= 0;

          return (
            <div
              key={asset.symbol}
              className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors group"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${
                    asset.type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                  }`}>
                    {getAssetIcon(asset.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{asset.symbol}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[80px]">{asset.name}</p>
                  </div>
                </div>

                {/* Boton añadir (visible en hover) */}
                {onAddAsset && (
                  <button
                    onClick={() => onAddAsset(asset)}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Añadir al portfolio"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Precio */}
              <div className="mb-2">
                <p className="text-lg font-bold">
                  ${formatPrice(asset.current_price)}
                </p>
                <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{asset.daily_change_percent?.toFixed(2) || '0.00'}%
                </p>
              </div>

              {/* Sparkline */}
              {asset.sparkline && asset.sparkline.length > 0 && (
                <div className="h-10">
                  <SparklineChart data={asset.sparkline} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {popularAssets.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          No hay activos populares disponibles
        </div>
      )}
    </div>
  );
}

export default PopularAssets;
