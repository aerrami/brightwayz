"""
Brightwayz FastAPI Backend
==========================
Run locally:
    uvicorn app.main:app --reload --port 8000

Environment variables:
    See .env.example
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.supabase import get_client

# Routers
from app.routers.clients import router as clients_router
from app.routers.events import router as events_router
from app.routers.files import router as files_router
from app.routers.messaging import router as messaging_router
from app.routers.orgs import router as orgs_router
from app.routers.intake import data_router as intake_data_router
from app.routers.intake import auth_router as intake_auth_router
from app.routers.referrals import data_router as referrals_data_router
from app.routers.referrals import auth_router as referrals_auth_router
from app.routers.resources import data_router as resources_data_router
from app.routers.resources import auth_router as resources_auth_router
from app.routers.ai_chat import router as ai_chat_router
from app.routers.sms import router as sms_router
from app.routers.cases import router as cases_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_client()  # warm up the httpx client
    yield
    client = get_client()
    if not client.is_closed:
        await client.aclose()


def create_app() -> FastAPI:
    cfg = get_settings()

    app = FastAPI(
        title="Brightwayz API",
        version="1.0.0",
        description="Backend API for the Brightwayz community services platform.",
        docs_url="/docs" if cfg.environment != "production" else None,
        redoc_url="/redoc" if cfg.environment != "production" else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Public (unauthenticated) routes (/auth/*) ─────────────────────────────
    app.include_router(intake_auth_router)
    app.include_router(referrals_auth_router)
    app.include_router(resources_auth_router)
    app.include_router(ai_chat_router)

    # ── Authenticated routes (/data/*) ────────────────────────────────────────
    app.include_router(intake_data_router)
    app.include_router(clients_router)
    app.include_router(referrals_data_router)
    app.include_router(resources_data_router)
    app.include_router(orgs_router)
    app.include_router(events_router)
    app.include_router(files_router)
    app.include_router(messaging_router)
    app.include_router(sms_router)
    app.include_router(cases_router)

    @app.get("/", tags=["health"])
    async def root():
        return {
            "status": "ok",
            "service": "Brightwayz API",
            "environment": cfg.environment,
            "docs": "/docs",
        }

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok", "environment": cfg.environment}

    return app


app = create_app()
