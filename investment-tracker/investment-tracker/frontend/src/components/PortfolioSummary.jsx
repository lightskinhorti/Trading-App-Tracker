import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

function PortfolioSummary({ portfolio }) {
  const isPositive = portfolio.total_profit_loss >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-5 h-5 text-blue-400" />
          <span className="text-gray-400 text-sm">Total Invertido</span>
        </div>
        <p className="text-2xl font-bold">
          ${portfolio.total_invested.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          <span className="text-gray-400 text-sm">Valor Actual</span>
        </div>
        <p className="text-2xl font-bold">
          ${portfolio.current_value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
          <span className="text-gray-400 text-sm">Ganancia/Pérdida</span>
        </div>
        <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}${portfolio.total_profit_loss.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
          <span className="text-gray-400 text-sm">Rendimiento</span>
        </div>
        <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{portfolio.total_profit_loss_percent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export default PortfolioSummary;
