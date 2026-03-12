from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.settings import settings
from app.api.crm import router as crm_router
from app.api.sendflow import router as sendflow_router
from app.api.next_step import router as next_step_router
from app.api.send import router as send_router
from app.api.health import router as health_router
from app.api.uazapi_webhook import router as uazapi_webhook_router
from app.api.uazapi_instance import router as uazapi_instance_router
from app.api.growth import router as growth_router
from app.api.billing import router as billing_router


def create_app() -> FastAPI:
    app = FastAPI(title="Ruptur API", version="0.0.0", docs_url="/docs", redoc_url="/redoc")

    origins: list[str]
    if not settings.cors_origins or settings.cors_origins.strip() == "*":
        origins = ["*"]
    else:
        origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(uazapi_webhook_router)
    app.include_router(send_router)
    app.include_router(next_step_router)
    app.include_router(uazapi_instance_router)
    app.include_router(crm_router)
    app.include_router(sendflow_router)
    app.include_router(growth_router)
    app.include_router(billing_router)
    return app


app = create_app()
