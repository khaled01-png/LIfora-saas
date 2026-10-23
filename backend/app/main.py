import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from sqlalchemy import text
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.seed import seed_database
from backend.app.migrate import ensure_columns
from backend.app.services.request_service import run_maintenance
from backend.app.routes import (
    auth_router,
    donors_router,
    requests_router,
    centers_router,
    inventory_router,
    notifications_router,
    stats_router,
    contact_router,
    admin_router,
)

def _run_maintenance_once() -> None:
    """Expire old requests, free finished cool-downs and confirm donations nobody answered for 24 hours."""
    db = SessionLocal()
    try:
        run_maintenance(db)
    finally:
        db.close()


async def _maintenance_loop() -> None:
    while True:
        await asyncio.sleep(600)  # every 10 minutes
        try:
            await asyncio.to_thread(_run_maintenance_once)
        except Exception:
            logging.getLogger("lifora").exception("Background maintenance failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure all database tables exist in PostgreSQL or SQLite, and older tables get any new columns
    Base.metadata.create_all(bind=engine)
    ensure_columns(engine)
    # 2. Seed initial data if tables are empty
    db = SessionLocal()
    try:
        seed_database(db)
        run_maintenance(db)  # catch up after any downtime
    finally:
        db.close()
    task = asyncio.create_task(_maintenance_loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="LIFORA Python backend - FastAPI, SQLAlchemy & PostgreSQL/SQLite",
    lifespan=lifespan,
    # Interactive API docs are disabled in production.
    docs_url=None if settings.IS_PRODUCTION else "/docs",
    redoc_url=None if settings.IS_PRODUCTION else "/redoc",
    openapi_url=None if settings.IS_PRODUCTION else "/openapi.json",
)

# CORS: explicit origin allow-list. Auth uses a Bearer header (no cookies), so credentials stay off.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    if settings.IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak stack traces or internals to clients.
    logging.getLogger("lifora").exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})

# Health check
@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    db_ok = True
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    finally:
        db.close()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engine": "Python FastAPI + SQLAlchemy",
    }

# Include routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(donors_router, prefix="/api")
app.include_router(requests_router, prefix="/api")
app.include_router(centers_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(contact_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
