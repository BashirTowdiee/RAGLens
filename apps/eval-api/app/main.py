from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.ci_gate import (
    InMemoryCiGateResultRepository,
    PostgresCiGateResultRepository,
    create_ci_gate_router,
)
from app.comparisons import (
    InMemoryComparisonRepository,
    PostgresComparisonRepository,
    create_comparison_router,
)
from app.datasets import (
    InMemoryDatasetRepository,
    PostgresDatasetRepository,
    create_dataset_router,
)
from app.eval_runner import create_eval_runner_router
from app.eval_runs import (
    InMemoryEvalRunRepository,
    PostgresEvalRunRepository,
    create_eval_run_router,
)
from app.rag_client import RagProviderError
from app.runtime_config import (
    EvalRuntimeConfigStore,
    RuntimeConfigRagClient,
    create_runtime_config_router,
)
from app.scoring_router import create_scoring_router
from app.settings import Settings, get_settings

REQUEST_ID_HEADER = 'x-request-id'
MAX_REQUEST_ID_LENGTH = 128
REQUEST_LOGGER_NAME = 'raglens.eval_api.requests'

logger = logging.getLogger(REQUEST_LOGGER_NAME)


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


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(title='RAGLens Eval API', version='0.0.0')

    if resolved_settings.eval_repository == 'postgres':
        dataset_repository = PostgresDatasetRepository(resolved_settings.database_url)
        eval_run_repository = PostgresEvalRunRepository(resolved_settings.database_url)
        comparison_repository = PostgresComparisonRepository(resolved_settings.database_url)
        ci_gate_repository = PostgresCiGateResultRepository(resolved_settings.database_url)
    else:
        dataset_repository = InMemoryDatasetRepository()
        eval_run_repository = InMemoryEvalRunRepository()
        comparison_repository = InMemoryComparisonRepository()
        ci_gate_repository = InMemoryCiGateResultRepository()

    runtime_config_store = EvalRuntimeConfigStore(resolved_settings)
    rag_client = RuntimeConfigRagClient(runtime_config_store)

    @app.middleware('http')
    async def add_request_id_header(request: Request, call_next):
        request_id = resolve_request_id(request)
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        log_request_completed(request, request_id, response.status_code)
        return response

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        request_id = getattr(request.state, 'request_id', '')
        detail = exc.detail if isinstance(exc.detail, dict) else {'message': str(exc.detail)}
        detail = {**detail, 'requestId': request_id}
        return JSONResponse(
            status_code=exc.status_code,
            content={'detail': detail},
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, 'request_id', '')
        return JSONResponse(
            status_code=422,
            content={
                'error': 'invalid_request_payload',
                'message': 'Request payload is invalid.',
                'issues': exc.errors(),
                'requestId': request_id,
            },
        )

    app.include_router(create_dataset_router(dataset_repository))
    app.include_router(
        create_eval_run_router(
            eval_run_repository,
            validate_rag_config=lambda rag_config_id, request_id: validate_rag_config_or_raise(
                rag_client,
                rag_config_id,
                request_id,
            ),
            list_rag_configs=lambda request_id: [
                {'id': config.id, 'name': config.name}
                for config in rag_client.list_rag_configs(request_id=request_id or None)
            ],
        )
    )
    app.include_router(
        create_eval_runner_router(
            eval_run_repository,
            dataset_repository,
            rag_client,
            max_retry_attempts=resolved_settings.rag_api_max_retries,
            max_retry_attempts_resolver=runtime_config_store.max_retries,
        )
    )
    app.include_router(create_comparison_router(eval_run_repository, comparison_repository))
    app.include_router(create_ci_gate_router(eval_run_repository, ci_gate_repository))
    app.include_router(create_scoring_router())
    app.include_router(create_runtime_config_router(runtime_config_store))

    @app.get('/api/v1/health')
    def health() -> dict[str, str]:
        return {
            'status': 'ok',
            'service': 'eval-api',
            'environment': resolved_settings.environment,
        }

    return app


app = create_app()


def validate_rag_config_or_raise(rag_client, rag_config_id: str, request_id: str) -> None:
    rag_config_id = rag_config_id.strip()
    if not rag_config_id:
        raise HTTPException(
            status_code=400,
            detail={
                'error': 'rag_config_not_found',
                'message': 'RAG config was not found.',
            },
        )

    try:
        configs = rag_client.list_rag_configs(request_id=request_id or None)
    except RagProviderError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                'error': 'rag_api_unavailable',
                'message': str(exc),
            },
        ) from exc

    if any(config.id == rag_config_id for config in configs):
        return

    raise HTTPException(
        status_code=404,
        detail={
            'error': 'rag_config_not_found',
            'message': 'RAG config was not found.',
            'ragConfigId': rag_config_id,
        },
    )
