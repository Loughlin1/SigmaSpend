import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SigmaSpend API"
    API_V1_STR: str = "/api/v1"
    
    # Locally store SQLite file in the backend root directory
    DATABASE_URL: str = "sqlite:///./sigmaspend.db"

    class Config:
        case_sensitive = True

settings = Settings()