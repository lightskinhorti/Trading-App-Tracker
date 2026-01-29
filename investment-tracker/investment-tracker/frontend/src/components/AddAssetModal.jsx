import { useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { assetsApi } from '../services/api';

function AddAssetModal({ isOpen, onClose, onAssetAdded }) {
  const [assetType, setAssetType] = useState('stock');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [priceInfo, setPriceInfo] = useState(null);

  const handleSearch = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError('');
    setPriceInfo(null);

    try {
      const response = await assetsApi.getPrice(symbol, assetType);
      setPriceInfo(response.data);
    } catch (err) {
      setError('No se encontró el activo. Verifica el símbolo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!symbol || !quantity || !purchasePrice) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await assetsApi.createAsset({
        symbol: symbol.toUpperCase(),
        name: priceInfo?.name || symbol,
        asset_type: assetType,
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice),
      });

      onAssetAdded();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al añadir el activo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSymbol('');
    setQuantity('');
    setPurchasePrice('');
    setPriceInfo(null);
    setError('');
    onClose();
  };

  const usePriceAsPurchase = () => {
    if (priceInfo?.current_price) {
      setPurchasePrice(priceInfo.current_price.toString());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Añadir Activo</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tipo de activo */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setAssetType('stock')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                assetType === 'stock'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Acción
            </button>
            <button
              type="button"
              onClick={() => setAssetType('crypto')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                assetType === 'crypto'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Crypto
            </button>
          </div>

          {/* Símbolo */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Símbolo {assetType === 'stock' ? '(ej: AAPL, MSFT)' : '(ej: BTC, ETH)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={assetType === 'stock' ? 'AAPL' : 'BTC'}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || !symbol}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Info del precio actual */}
          {priceInfo && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <p className="font-semibold">{priceInfo.name}</p>
              <p className="text-2xl font-bold mt-1">
                ${priceInfo.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-sm ${priceInfo.daily_change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceInfo.daily_change_percent >= 0 ? '+' : ''}{priceInfo.daily_change_percent.toFixed(2)}% hoy
              </p>
            </div>
          )}

          {/* Cantidad */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Cantidad</label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10"
            />
          </div>

          {/* Precio de compra */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Precio de compra (USD)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="150.00"
              />
              {priceInfo && (
                <button
                  type="button"
                  onClick={usePriceAsPurchase}
                  className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"
                >
                  Usar actual
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Añadiendo...' : 'Añadir al Portfolio'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddAssetModal;
