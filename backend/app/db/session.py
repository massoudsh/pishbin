"""
Database session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.core.config import settings

database_url = settings.DATABASE_URL

engine_kwargs: dict = {
    "pool_pre_ping": True,
    "echo": settings.DEBUG,
}

try:
    url = make_url(database_url)
    if url.drivername.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        engine_kwargs["pool_pre_ping"] = False
        if url.database in (None, "", ":memory:"):
            # In-memory SQLite: each new connection is a distinct empty DB
            # unless pinned to a single connection via StaticPool.
            engine_kwargs["poolclass"] = StaticPool
except Exception:
    # If DATABASE_URL isn't parseable, fall back to defaults.
    pass

engine = create_engine(database_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

