"""
Configuration management for the application.
Handles environment variables and application settings.
"""
import json
from typing import Any, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings


DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]


def _parse_cors_origins(value: Any) -> list[str]:
    """Accept a comma-separated string, a JSON array, or an already-parsed list.

    CORS_ORIGINS is declared as a plain string so pydantic-settings never tries
    to JSON-decode the whole env value before we can parse it; a bare
    ``http://host`` used to crash the app at import time.
    """
    if value is None:
        return list(DEFAULT_CORS_ORIGINS)
    if isinstance(value, (list, tuple)):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    if not text:
        return list(DEFAULT_CORS_ORIGINS)
    if text.startswith("["):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return list(DEFAULT_CORS_ORIGINS)
        return _parse_cors_origins(parsed)
    return [origin.strip() for origin in text.split(",") if origin.strip()]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Pishbin API"
    APP_VERSION: str = "1.1.0"
    DEBUG: bool = False
    
    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/personalfinance"
    AUTO_CREATE_DB: bool = False  # Set True in dev to create tables on startup

    # Rate limiting: requests per client per minute. Raised in tests (see conftest.py)
    # so a growing test suite sharing one TestClient "IP" doesn't trip production limits.
    RATE_LIMIT_REQUESTS: int = 100
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS: comma-separated origins or a JSON array
    # (e.g. CORS_ORIGINS=https://app.com,https://www.app.com)
    CORS_ORIGINS: str = ",".join(DEFAULT_CORS_ORIGINS)
    
    # API
    API_V1_STR: str = "/api/v1"

    # ZarinPal payment gateway (optional)
    ZARINPAL_MERCHANT_ID: Optional[str] = None  # 36-char merchant ID from ZarinPal
    ZARINPAL_SANDBOX: bool = True  # use sandbox when True
    ZARINPAL_CALLBACK_BASE_URL: Optional[str] = None  # e.g. https://api.example.com (backend base for callback URL)
    FRONTEND_URL: Optional[str] = None  # e.g. https://app.example.com (redirect after payment; default localhost:3000)

    # Email (password reset): optional SMTP
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None  # e.g. noreply@yourapp.com
    EMAIL_ENABLED: bool = False  # set True when SMTP_* are set

    @model_validator(mode="after")
    def _check_secure_production_config(self) -> "Settings":
        if self.DEBUG:
            return self

        errors = []
        insecure_secret = "your-secret-key-change-in-production"
        if self.SECRET_KEY == insecure_secret:
            errors.append("SECRET_KEY must be changed from the default value")

        insecure_db = "postgresql://postgres:postgres@localhost:5432/personalfinance"
        if self.DATABASE_URL == insecure_db:
            errors.append("DATABASE_URL must be changed from the default postgres/postgres value")

        if errors:
            raise ValueError(
                "; ".join(errors)
                + ". Set DEBUG=true to bypass this check in development."
            )
        return self

    @property
    def cors_origins(self) -> list[str]:
        """Allowed browser origins, parsed from CORS_ORIGINS."""
        return _parse_cors_origins(self.CORS_ORIGINS)
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

