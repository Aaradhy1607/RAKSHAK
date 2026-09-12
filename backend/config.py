"""
Configuration Settings for Landslide Early Warning Backend
SIH 2026 PS 26001 - NER Landslide Intelligence System
"""

import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env is explicitly loaded from root or backend directory
load_dotenv(dotenv_path=".env")
load_dotenv(dotenv_path="backend/.env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "NER Landslide Early Warning & Risk Intelligence System (SIH 26001)"
    API_V1_STR: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Primary & Fallback Database configuration (PostgreSQL / SQLite)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/landslide_system.db")
    
    # Open-Meteo High-Resolution NWP API
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    
    # Transactional Email Provider Settings (Brevo REST API)
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "true").lower() in ("true", "1", "yes")
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "brevo").lower()  # "brevo", "smtp"
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "aaradhysharma2007@gmail.com")
    EMAIL_FROM_NAME: str = os.getenv("EMAIL_FROM_NAME", "RAKSHAK Emergency System")
    
    # SMTP Fallback Settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    ALERT_EMAIL_SENDER: str = os.getenv("ALERT_EMAIL_SENDER", "alerts@rakshak-disaster.gov.in")
    
    # Alert & Escalation Engine Defaults
    DEFAULT_RISK_ALERT_THRESHOLD: float = float(os.getenv("DEFAULT_RISK_ALERT_THRESHOLD", "0.75"))
    DEFAULT_ALERT_COOLDOWN_SEC: int = int(os.getenv("DEFAULT_ALERT_COOLDOWN_SEC", "600"))
    DEFAULT_ESCALATION_TIMEOUT_SEC: int = int(os.getenv("DEFAULT_ESCALATION_TIMEOUT_SEC", "120"))
    
    # Demo Mode (Strictly OFF by default - no false success or fake delivery)
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    DEMO_MODE_ENABLED: bool = False
    
    # Google Gemini AI API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Redis / Celery Background Worker Settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Uploads directory for field photos & satellite scenes
    UPLOAD_DIR: str = "./data/uploads"
    
    # CORS Allowed Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs("data", exist_ok=True)
