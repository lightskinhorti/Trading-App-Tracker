from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import init_db
from .routes import assets_router, alerts_router, analysis_router

app = FastAPI(
    title="Investment Tracker API",
    description="API para gestionar portfolio de inversiones con ML y alertas",
    version="3.0.0"
)

# CORS para permitir peticiones desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(assets_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"message": "Investment Tracker API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
