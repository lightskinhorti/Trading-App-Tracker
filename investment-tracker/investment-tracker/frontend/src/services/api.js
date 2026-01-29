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
  
  // Buscar assets
  searchAssets: (query, type = 'stock') => 
    api.get(`/assets/search/${query}?asset_type=${type}`),
  
  // Obtener precio actual
  getPrice: (symbol, type = 'stock') => 
    api.get(`/assets/price/${symbol}?asset_type=${type}`),
};

export default api;
