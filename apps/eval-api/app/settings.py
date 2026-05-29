from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    environment: str = 'development'
    eval_repository: Literal['postgres', 'memory'] = 'postgres'
    rag_client_mode: Literal['http', 'stub'] = 'http'
    database_url: str = 'postgres://raglens:raglens@localhost:5432/raglens'
    rag_api_base_url: str = 'http://localhost:8000'
    rag_api_timeout_seconds: float = 10
    rag_api_max_retries: int = 2


def get_settings() -> Settings:
    return Settings()
