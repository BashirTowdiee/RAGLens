from fastapi import FastAPI

from app.datasets import InMemoryDatasetRepository, create_dataset_router
from app.settings import get_settings

settings = get_settings()
app = FastAPI(title='RAGLens Eval API', version='0.0.0')
dataset_repository = InMemoryDatasetRepository()
app.include_router(create_dataset_router(dataset_repository))


@app.get('/api/v1/health')
def health() -> dict[str, str]:
    return {
        'status': 'ok',
        'service': 'eval-api',
        'environment': settings.environment,
    }
