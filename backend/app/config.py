import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Health Report Interpreter API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://health_user:health_password@localhost:5432/health_report_db"
    
    # Security
    JWT_SECRET: str = "supersecretjwtkey_change_in_production_123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    
    # Ollama / AI RAG
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_LLM_MODEL: str = "qwen2.5:7b"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
