from __future__ import annotations

from fastapi import FastAPI

from app.api.next_step import router as next_step_router
from app.api.send import router as send_router
from app.api.health import router as health_router
from app.api.uazapi_webhook import router as uazapi_webhook_router
from app.api.uazapi_instance import router as uazapi_instance_router


def create_app() -> FastAPI:
    app = FastAPI(title="Ruptur API", version="0.0.0", docs_url="/docs", redoc_url="/redoc")
    app.include_router(health_router)
    app.include_router(uazapi_webhook_router)
    app.include_router(send_router)
    app.include_router(next_step_router)
    app.include_router(uazapi_instance_router)
    return app


app = create_app()
