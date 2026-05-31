import os
from pathlib import Path
from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AnyHttpUrl, validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="allow"
    )

    # Project Info
    PROJECT_NAME: str = "Swasthya AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "production", "testing"] = "development"

    # Security
    SECRET_KEY: str = Field(default="SUPER_SECRET_DEVELOPMENT_KEY_CHANGE_IN_PRODUCTION")
    ALLOWED_HOSTS: List[str] = ["*"]

    # Supabase (Primary Database Engine)
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str  # PostgreSQL Connection String for SQLAlchemy Direct Pool

    # Firebase (Auth, Sessions, Chat History Only)
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY: str
    FIREBASE_CLIENT_EMAIL: str

    # AI Model Providers
    GEMINI_API_KEY: str
    MISTRAL_API_KEY: str
    PRIMARY_LLM: Literal["gemini", "mistral"] = "gemini"

    # Search & Location Intelligence
    TAVILY_API_KEY: str
    GOOGLE_MAPS_KEY: str

    # Caching & Background Task Brokers
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Performance Rules
    CACHE_TTL_SECONDS: int = 86400  # 24 Hours
    RESEARCH_STALE_DAYS: int = 7    # Force refresh if data is older than 7 days

settings = Settings()