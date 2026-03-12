from __future__ import annotations

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.uazapi_webhook import router as uazapi_webhook_router


def create_app() -> FastAPI:
    app = FastAPI(title="Ruptur API", version="0.0.0", docs_url="/docs", redoc_url="/redoc")
    app.include_router(health_router)
    app.include_router(uazapi_webhook_router)
    return app


app = create_app()
