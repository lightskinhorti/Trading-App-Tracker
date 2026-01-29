import { Trash2, TrendingUp, TrendingDown, Bitcoin, BarChart3 } from 'lucide-react';

function AssetList({ assets, onDelete }) {
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
            <th className="text-right p-4 text-gray-400 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const isProfitable = asset.profit_loss >= 0;
            const isDailyPositive = asset.daily_change_percent >= 0;

            return (
              <tr key={asset.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${asset.asset_type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                      {asset.asset_type === 'crypto' ? (
                        <Bitcoin className="w-5 h-5 text-orange-400" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-blue-400" />
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
                    {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{isProfitable ? '+' : ''}{asset.profit_loss_percent.toFixed(2)}%</span>
                  </div>
                </td>
                <td className={`p-4 text-right ${isDailyPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isDailyPositive ? '+' : ''}{asset.daily_change_percent.toFixed(2)}%
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AssetList;
