# Investment Tracker 📈

Dashboard para gestionar tu portfolio de inversiones en acciones y criptomonedas.

## Features (Fase 1)

- ✅ Añadir acciones (via Yahoo Finance)
- ✅ Añadir criptomonedas (via CoinGecko)
- ✅ Ver precio actual y variación diaria
- ✅ Calcular valor total del portfolio
- ✅ Ver rendimiento (ganancia/pérdida)
- ✅ Eliminar activos

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + Vite + Tailwind CSS
- **APIs**: Yahoo Finance, CoinGecko
- **Deployment**: Docker + Docker Compose

## Requisitos

- Docker y Docker Compose instalados

## Instalación y Ejecución

### Con Docker (recomendado)

```bash
# Clonar el repo
git clone <tu-repo>
cd investment-tracker

# Levantar todo con Docker Compose
docker-compose up --build

# La app estará disponible en:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - Docs API: http://localhost:8000/docs
```

### Desarrollo local (sin Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/assets` | Lista todos los activos |
| GET | `/api/assets/portfolio` | Portfolio con precios actuales |
| POST | `/api/assets/` | Añadir nuevo activo |
| DELETE | `/api/assets/{id}` | Eliminar activo |
| GET | `/api/assets/price/{symbol}` | Precio actual de un activo |
| GET | `/api/assets/search/{query}` | Buscar activos |

## Ejemplos de uso

**Añadir una acción:**
```json
POST /api/assets/
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "asset_type": "stock",
  "quantity": 10,
  "purchase_price": 150.00
}
```

**Añadir una crypto:**
```json
POST /api/assets/
{
  "symbol": "BTC",
  "name": "Bitcoin",
  "asset_type": "crypto",
  "quantity": 0.5,
  "purchase_price": 40000.00
}
```

## Roadmap

- [x] **Fase 1**: MVP con CRUD básico
- [ ] **Fase 2**: Gráficos y análisis técnico
- [ ] **Fase 3**: Alertas y predicciones ML

## Estructura del proyecto

```
investment-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routes/
│   │   └── services/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Autor

Horti - Master Big Data & IA
