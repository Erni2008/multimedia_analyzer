"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, init_db
from app.routers import auth, media, tests
from worker.celery_worker import celery_app


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Multimedia Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(media.router, prefix="/api/media", tags=["media"])
app.include_router(tests.router, prefix="/api/tests", tags=["tests"])


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", tags=["health"])
def healthcheck_db() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/health/redis", tags=["health"])
def healthcheck_redis() -> dict[str, str]:
    try:
        redis_client = celery_app.backend.client
    except AttributeError as exc:
        raise RuntimeError("Redis backend is unavailable") from exc

    redis_client.ping()
    return {"status": "ok"}


@app.get("/health/worker", tags=["health"])
def healthcheck_worker() -> dict[str, str]:
    inspect = getattr(celery_app.control, "inspect", None)
    if inspect is None:
        return {"status": "degraded", "detail": "worker inspection not available"}

    try:
        ping = inspect(timeout=1).ping()
    except Exception:
        ping = None

    if ping:
        return {"status": "ok"}
    return {"status": "degraded", "detail": "worker did not respond"}
