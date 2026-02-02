# 📈 Investment Tracker

Dashboard para gestionar portfolios de inversiones en acciones y criptomonedas con datos en tiempo real, análisis técnico y predicciones con Machine Learning.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **Portfolio tracking** - Añade acciones y criptomonedas a tu portfolio
- **Datos en tiempo real** - Precios actualizados via Yahoo Finance y CoinGecko
- **Análisis técnico** - Indicadores RSI, medias móviles (SMA 20/50)
- **Gráficos históricos** - Evolución temporal con selector de rango (1D, 1W, 1M, 3M, 1Y)
- **Comparativa benchmarks** - Rendimiento vs S&P500 y Bitcoin
- **Predicciones ML** - Modelos Prophet y LSTM para predicción de tendencias
- **Auto-refresh** - Actualización automática cada 60 segundos

## 🛠️ Tech Stack

| Área | Tecnologías |
|------|-------------|
| **Backend** | Python, FastAPI, SQLAlchemy, SQLite |
| **Frontend** | React, Tailwind CSS, Recharts |
| **APIs** | Yahoo Finance, CoinGecko |
| **ML** | Prophet, LSTM, Pandas, NumPy |
| **DevOps** | Docker, Docker Compose |

## 🚀 Quick Start

### Con Docker (recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/lightskinhorti/Trading-App-Tracker.git
cd Trading-App-Tracker

# Levantar con Docker Compose
docker-compose up --build

# Acceder a la aplicación
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Desarrollo local

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📊 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/assets` | Lista todos los activos |
| `GET` | `/api/assets/portfolio` | Portfolio con precios actuales |
| `POST` | `/api/assets/` | Añadir nuevo activo |
| `DELETE` | `/api/assets/{id}` | Eliminar activo |
| `GET` | `/api/assets/price/{symbol}` | Precio actual de un activo |
| `GET` | `/api/assets/{symbol}/history` | Histórico de precios |
| `GET` | `/api/portfolio/performance` | Rendimiento del portfolio |

## 📁 Estructura del proyecto

```
Trading-App-Tracker/
├── backend/
│   ├── app/
│   │   ├── main.py           # Entry point FastAPI
│   │   ├── models.py         # Modelos SQLAlchemy
│   │   ├── schemas.py        # Schemas Pydantic
│   │   ├── routes/           # Endpoints API
│   │   └── services/         # Lógica de negocio y ML
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── services/         # Cliente API
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🗺️ Roadmap

- [x] CRUD de activos (acciones y crypto)
- [x] Datos en tiempo real
- [x] Gráficos de evolución
- [x] Indicadores técnicos (RSI, SMA)
- [x] Comparativa vs benchmarks
- [x] Predicciones con ML
- [ ] Alertas por email/Telegram
- [ ] Múltiples portfolios
- [ ] App móvil

## 👤 Autor

**Javier Hortigüela Valiente**

- LinkedIn: [/in/javier-hortigüela-valiente](https://www.linkedin.com/in/javierhortiguela
- GitHub: [@lightskinhorti](https://github.com/lightskinhorti)

---

Proyecto desarrollado como parte del Máster en Big Data e Inteligencia Artificial.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
