from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    environment: str = 'development'
    database_url: str = 'postgres://raglens:raglens@localhost:5432/raglens'
    rag_api_base_url: str = 'http://localhost:8000'


def get_settings() -> Settings:
    return Settings()
