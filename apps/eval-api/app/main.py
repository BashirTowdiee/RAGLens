from fastapi import FastAPI

from app.datasets import InMemoryDatasetRepository, create_dataset_router
from app.eval_runs import InMemoryEvalRunRepository, create_eval_run_router
from app.settings import get_settings

settings = get_settings()
app = FastAPI(title='RAGLens Eval API', version='0.0.0')
dataset_repository = InMemoryDatasetRepository()
eval_run_repository = InMemoryEvalRunRepository()
app.include_router(create_dataset_router(dataset_repository))
app.include_router(create_eval_run_router(eval_run_repository))


@app.get('/api/v1/health')
def health() -> dict[str, str]:
    return {
        'status': 'ok',
        'service': 'eval-api',
        'environment': settings.environment,
    }
