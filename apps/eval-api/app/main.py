from fastapi import FastAPI

from app.comparisons import create_comparison_router
from app.datasets import InMemoryDatasetRepository, create_dataset_router
from app.eval_runner import create_eval_runner_router
from app.eval_runs import InMemoryEvalRunRepository, create_eval_run_router
from app.rag_client import StubRagApiClient
from app.scoring_router import create_scoring_router
from app.settings import get_settings

settings = get_settings()
app = FastAPI(title='RAGLens Eval API', version='0.0.0')
dataset_repository = InMemoryDatasetRepository()
eval_run_repository = InMemoryEvalRunRepository()
rag_client = StubRagApiClient()
app.include_router(create_dataset_router(dataset_repository))
app.include_router(create_eval_run_router(eval_run_repository))
app.include_router(create_eval_runner_router(eval_run_repository, dataset_repository, rag_client))
app.include_router(create_comparison_router(eval_run_repository))
app.include_router(create_scoring_router())


@app.get('/api/v1/health')
def health() -> dict[str, str]:
    return {
        'status': 'ok',
        'service': 'eval-api',
        'environment': settings.environment,
    }