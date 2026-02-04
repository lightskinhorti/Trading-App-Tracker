import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const assetsApi = {
  // Obtener portfolio completo con precios
  getPortfolio: () => api.get('/assets/portfolio'),

  // Obtener todos los assets
  getAssets: () => api.get('/assets'),

  // Crear nuevo asset
  createAsset: (asset) => api.post('/assets/', asset),

  // Eliminar asset
  deleteAsset: (id) => api.delete(`/assets/${id}`),

  // Buscar assets (con autocompletado)
  searchAssets: (query, type = 'stock') =>
    api.get(`/assets/search?q=${encodeURIComponent(query)}&type=${type}`),

  // Obtener activos populares
  getPopularAssets: () => api.get('/popular'),

  // Obtener precio actual
  getPrice: (symbol, type = 'stock') =>
    api.get(`/assets/price/${symbol}?asset_type=${type}`),

  // Fase 2: Análisis y gráficos

  // Obtener histórico de precios de un activo
  getAssetHistory: (symbol, type = 'stock', period = '1M') =>
    api.get(`/assets/history/${symbol}?asset_type=${type}&period=${period}`),

  // Obtener rendimiento del portfolio en el tiempo
  getPortfolioPerformance: (period = '1M') =>
    api.get(`/assets/portfolio/performance?period=${period}`),

  // Obtener datos de benchmarks (S&P500 y BTC)
  getBenchmarks: (period = '1M') =>
    api.get(`/assets/benchmarks?period=${period}`),
};

// ============ Fase 3: Alertas ============
export const alertsApi = {
  // Obtener todas las alertas
  getAlerts: (status = null, symbol = null) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (symbol) params.append('symbol', symbol);
    return api.get(`/alerts/?${params.toString()}`);
  },

  // Obtener alertas activas
  getActiveAlerts: () => api.get('/alerts/active'),

  // Crear nueva alerta
  createAlert: (alert) => api.post('/alerts/', alert),

  // Actualizar alerta
  updateAlert: (id, data) => api.put(`/alerts/${id}`, data),

  // Eliminar alerta
  deleteAlert: (id) => api.delete(`/alerts/${id}`),

  // Desactivar alerta
  disableAlert: (id) => api.post(`/alerts/${id}/disable`),

  // Reactivar alerta
  enableAlert: (id) => api.post(`/alerts/${id}/enable`),

  // Verificar alertas manualmente
  checkAlerts: () => api.post('/alerts/check'),

  // Estadísticas de alertas
  getAlertsStats: () => api.get('/alerts/summary/stats'),

  // Configuración de notificaciones
  getNotificationSettings: () => api.get('/alerts/settings/current'),
  saveNotificationSettings: (settings) => api.post('/alerts/settings', settings),

  // Pruebas de notificaciones
  testEmail: (email) => api.post(`/alerts/test/email?email=${email}`),
  testTelegram: (chatId) => api.post(`/alerts/test/telegram?chat_id=${chatId}`),
};

// ============ Fase 3: Análisis ML ============
export const analysisApi = {
  // Predicción de precios
  getPrediction: (symbol, assetType = 'stock', days = 7) =>
    api.get(`/analysis/predict/${symbol}?asset_type=${assetType}&days=${days}`),

  // Análisis de tendencia
  getTrendAnalysis: (symbol, assetType = 'stock') =>
    api.get(`/analysis/trend/${symbol}?asset_type=${assetType}`),

  // Correlación entre activos específicos
  getCorrelation: (symbols, assetTypes, period = '3M') => {
    const params = new URLSearchParams();
    symbols.forEach(s => params.append('symbols', s));
    assetTypes.forEach(t => params.append('asset_types', t));
    params.append('period', period);
    return api.post(`/analysis/correlation?${params.toString()}`);
  },

  // Correlación del portfolio completo
  getPortfolioCorrelation: (period = '3M') =>
    api.get(`/analysis/correlation/portfolio?period=${period}`),

  // Recomendaciones de inversión
  getRecommendations: () => api.get('/analysis/recommendations'),
};

export default api;
