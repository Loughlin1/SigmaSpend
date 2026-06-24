import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SigmaSpend API"
    API_V1_STR: str = "/api/v1"
    
    # 🌟 Becomes dynamic. Pydantic checks the environment or matching .env file first.
    DATABASE_URL: str = "sqlite:///./dev_data/sigmaspend_dev.db"

    class Config:
        case_sensitive = True
        # 🔄 Tell Pydantic to look for a specific .env file based on APP_ENV flag
        # Defaults to '.env.development' if APP_ENV is not explicitly set in your terminal
        env_file = f".env.{os.getenv('APP_ENV', 'development')}"

settings = Settings()