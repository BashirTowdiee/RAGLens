import logging
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
MAX_REQUEST_ID_LENGTH = 128
REQUEST_LOGGER_NAME = 'raglens.eval_api.requests'

logger = logging.getLogger(REQUEST_LOGGER_NAME)
settings = get_settings()
app = FastAPI(title='RAGLens Eval API', version='0.0.0')
dataset_repository = InMemoryDatasetRepository()
eval_run_repository = InMemoryEvalRunRepository()
rag_client = StubRagApiClient()


def resolve_request_id(request: Request) -> str:
    request_id = request.headers.get(REQUEST_ID_HEADER)
    if request_id is None:
        return str(uuid4())

    request_id = request_id.strip()
    if not request_id or len(request_id) > MAX_REQUEST_ID_LENGTH:
        return str(uuid4())

    return request_id


def log_request_completed(request: Request, request_id: str, status_code: int) -> None:
    logger.info(
        'eval_api_request_completed',
        extra={
            'request_id': request_id,
            'http_method': request.method,
            'path': request.url.path,
            'status_code': status_code,
        },
    )


@app.middleware('http')
async def add_request_id_header(request: Request, call_next):
    request_id = resolve_request_id(request)
    response = await call_next(request)
    response.headers[REQUEST_ID_HEADER] = request_id
    log_request_completed(request, request_id, response.status_code)
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
