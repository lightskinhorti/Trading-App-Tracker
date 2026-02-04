from .assets import router as assets_router
from .alerts import router as alerts_router
from .popular import router as popular_router

# Import analysis router with error handling to diagnose issues
try:
    from .analysis import router as analysis_router
except Exception as e:
    print(f"ERROR: Failed to import analysis router: {e}")
    import traceback
    traceback.print_exc()
    # Create a dummy router to prevent startup failure
    from fastapi import APIRouter
    analysis_router = APIRouter(prefix="/analysis", tags=["analysis"])
