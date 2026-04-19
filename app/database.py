"""Database setup."""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _create_engine():
    try:
        return create_engine(settings.database_url, future=True)
    except ModuleNotFoundError as exc:
        if "psycopg2" not in str(exc):
            raise

        fallback_path = Path("storage/local-dev.db")
        fallback_path.parent.mkdir(parents=True, exist_ok=True)
        return create_engine(f"sqlite:///{fallback_path}", future=True)


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    from app import models  # noqa: F401

    if not settings.auto_create_schema:
        return

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
