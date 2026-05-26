from uuid import uuid4

from fastapi import FastAPI, Request

from app.ci_gate import create_ci_gate_router
from app.comparisons import create_comparison_router
from app.datasets import InMemoryDatasetRepository, create_dataset_router
from app.eval_runner import create_eval_runner_router
from app.eval_runs import InMemoryEvalRunRepository, create_eval_run_router
from app.rag_client import StubRagApiClient
from app.scoring_router import create_scoring_router
from app.settings import get_settings

REQUEST_ID_HEADER = 'x-request-id'

settings = get_settings()
app = FastAPI(title='RAGLens Eval API', version='0.0.0')
dataset_repository = InMemoryDatasetRepository()
eval_run_repository = InMemoryEvalRunRepository()
rag_client = StubRagApiClient()


@app.middleware('http')
async def add_request_id_header(request: Request, call_next):
    request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid4())
    response = await call_next(request)
    response.headers[REQUEST_ID_HEADER] = request_id
    return response


app.include_router(create_dataset_router(dataset_repository))
app.include_router(create_eval_run_router(eval_run_repository))
app.include_router(create_eval_runner_router(eval_run_repository, dataset_repository, rag_client))
app.include_router(create_comparison_router(eval_run_repository))
app.include_router(create_ci_gate_router(eval_run_repository))
app.include_router(create_scoring_router())


@app.get('/api/v1/health')
def health() -> dict[str, str]:
    return {
        'status': 'ok',
        'service': 'eval-api',
        'environment': settings.environment,
    }
