import { useState, useEffect } from 'react';
import {
  Bell, BellOff, Plus, Trash2, Mail, MessageCircle,
  TrendingUp, TrendingDown, Percent, RefreshCw, X, Check
} from 'lucide-react';
import { alertsApi, assetsApi } from '../services/api';

const ALERT_TYPES = [
  { value: 'price_above', label: 'Precio supera', icon: TrendingUp, color: 'text-green-400' },
  { value: 'price_below', label: 'Precio cae bajo', icon: TrendingDown, color: 'text-red-400' },
  { value: 'percent_change', label: 'Cambio %', icon: Percent, color: 'text-blue-400' },
];

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'telegram', label: 'Telegram', icon: MessageCircle },
  { value: 'both', label: 'Ambos', icon: Bell },
];

function AlertsManager({ portfolio }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ active: 0, triggered: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        alertsApi.getAlerts(),
        alertsApi.getAlertsStats()
      ]);
      setAlerts(alertsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta alerta?')) return;
    try {
      await alertsApi.deleteAlert(id);
      fetchAlerts();
    } catch (err) {
      setError('Error al eliminar alerta');
    }
  };

  const handleToggle = async (alert) => {
    try {
      if (alert.status === 'active') {
        await alertsApi.disableAlert(alert.id);
      } else {
        await alertsApi.enableAlert(alert.id);
      }
      fetchAlerts();
    } catch (err) {
      setError('Error al cambiar estado de alerta');
    }
  };

  const handleCheckAlerts = async () => {
    try {
      const result = await alertsApi.checkAlerts();
      alert(`Verificación completada: ${result.data.results.triggered} alertas disparadas`);
      fetchAlerts();
    } catch (err) {
      setError('Error al verificar alertas');
    }
  };

  const getAlertTypeInfo = (type) => ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[0];
  const getChannelInfo = (channel) => CHANNELS.find(c => c.value === channel) || CHANNELS[0];

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Alertas de Precio</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCheckAlerts}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Verificar ahora
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Alerta
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-sm text-gray-400">Activas</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.triggered}</p>
            <p className="text-sm text-gray-400">Disparadas</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-300">{stats.total}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-300">✕</button>
        </div>
      )}

      {/* Alerts list */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <BellOff className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No tienes alertas configuradas</p>
            <p className="text-sm text-gray-500 mt-2">
              Crea una alerta para recibir notificaciones cuando el precio alcance tu objetivo
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left p-4 text-gray-400 font-medium">Activo</th>
                <th className="text-left p-4 text-gray-400 font-medium">Tipo</th>
                <th className="text-right p-4 text-gray-400 font-medium">Objetivo</th>
                <th className="text-center p-4 text-gray-400 font-medium">Canal</th>
                <th className="text-center p-4 text-gray-400 font-medium">Estado</th>
                <th className="text-right p-4 text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.alert_type);
                const channelInfo = getChannelInfo(alert.notification_channel);
                const TypeIcon = typeInfo.icon;
                const ChannelIcon = channelInfo.icon;

                return (
                  <tr key={alert.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{alert.symbol}</p>
                        <p className="text-sm text-gray-400">{alert.asset_type}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${typeInfo.color}`}>
                        <TypeIcon className="w-4 h-4" />
                        <span>{typeInfo.label}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono">
                      {alert.alert_type === 'percent_change'
                        ? `${alert.target_value}%`
                        : `$${alert.target_value.toLocaleString()}`
                      }
                    </td>
                    <td className="p-4 text-center">
                      <ChannelIcon className="w-5 h-5 mx-auto text-gray-400" />
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        alert.status === 'triggered' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {alert.status === 'active' ? 'Activa' :
                         alert.status === 'triggered' ? 'Disparada' : 'Desactivada'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(alert)}
                          className={`p-2 rounded-lg transition-colors ${
                            alert.status === 'active'
                              ? 'text-green-400 hover:bg-green-400/10'
                              : 'text-gray-400 hover:bg-gray-600'
                          }`}
                          title={alert.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          {alert.status === 'active' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <CreateAlertModal
          portfolio={portfolio}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchAlerts}
        />
      )}
    </div>
  );
}

function CreateAlertModal({ portfolio, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    symbol: '',
    asset_type: 'stock',
    alert_type: 'price_above',
    target_value: '',
    notification_channel: 'email',
    email: '',
    telegram_chat_id: '',
    message: ''
  });
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar precio cuando cambia el símbolo
  useEffect(() => {
    const fetchPrice = async () => {
      if (formData.symbol.length >= 1) {
        try {
          const res = await assetsApi.getPrice(formData.symbol, formData.asset_type);
          setCurrentPrice(res.data.current_price);
        } catch {
          setCurrentPrice(null);
        }
      }
    };
    fetchPrice();
  }, [formData.symbol, formData.asset_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await alertsApi.createAlert({
        ...formData,
        target_value: parseFloat(formData.target_value)
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear alerta');
    } finally {
      setLoading(false);
    }
  };

  const portfolioAssets = portfolio?.assets || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Nueva Alerta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de activo */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Activo</label>
            {portfolioAssets.length > 0 ? (
              <select
                value={`${formData.symbol}|${formData.asset_type}`}
                onChange={(e) => {
                  const [symbol, type] = e.target.value.split('|');
                  setFormData({ ...formData, symbol, asset_type: type });
                }}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="|stock">Seleccionar activo...</option>
                {portfolioAssets.map(asset => (
                  <option key={asset.id} value={`${asset.symbol}|${asset.asset_type}`}>
                    {asset.symbol} - {asset.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Símbolo (ej: AAPL, BTC)"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
            {currentPrice && (
              <p className="text-sm text-gray-400 mt-1">
                Precio actual: <span className="text-white font-medium">${currentPrice.toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Tipo de alerta */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tipo de Alerta</label>
            <div className="grid grid-cols-3 gap-2">
              {ALERT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, alert_type: type.value })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.alert_type === type.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${type.color}`} />
                    <p className="text-xs">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Valor objetivo */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              {formData.alert_type === 'percent_change' ? 'Cambio (%)' : 'Precio objetivo ($)'}
            </label>
            <input
              type="number"
              step="any"
              placeholder={formData.alert_type === 'percent_change' ? 'Ej: 5' : 'Ej: 150.00'}
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Canal de notificación */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Canal de Notificación</label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map((channel) => {
                const Icon = channel.icon;
                return (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, notification_channel: channel.value })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.notification_channel === channel.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs">{channel.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email (si aplica) */}
          {(formData.notification_channel === 'email' || formData.notification_channel === 'both') && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Telegram Chat ID (si aplica) */}
          {(formData.notification_channel === 'telegram' || formData.notification_channel === 'both') && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Telegram Chat ID</label>
              <input
                type="text"
                placeholder="123456789"
                value={formData.telegram_chat_id}
                onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Mensaje personalizado */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Mensaje personalizado (opcional)</label>
            <textarea
              placeholder="Añade una nota para recordar por qué creaste esta alerta..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.symbol || !formData.target_value}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Crear Alerta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AlertsManager;
