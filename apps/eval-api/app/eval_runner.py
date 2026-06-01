from __future__ import annotations

from collections.abc import Callable

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.datasets import DatasetRepository, TestCaseRecord
from app.eval_runs import (
    CaseResultRecord,
    CreateCaseResultRequest,
    EvalRunRepository,
    EvalRunResponse,
    to_eval_run_response,
)
from app.rag_client import RagApiClient, RagProviderError, RagProviderRetryPolicy

PROVIDER_TIMEOUT_ERROR_MESSAGE = 'RAG provider request timed out.'
MAX_EXECUTE_REQUESTS_PER_RUN = 20
_execute_request_counts: dict[str, int] = {}
_active_eval_run_ids: set[str] = set()


def create_eval_runner_router(
    eval_run_repository: EvalRunRepository,
    dataset_repository: DatasetRepository,
    rag_client: RagApiClient,
    max_retry_attempts: int = 2,
    max_retry_attempts_resolver: Callable[[], int] | None = None,
) -> APIRouter:
    router = APIRouter(prefix='/api/v1/eval-runs', tags=['eval-runs'])

    @router.post('/{eval_run_id}/execute', response_model=EvalRunResponse)
    def execute_eval_run(
        request: Request,
        eval_run_id: str,
        max_cases: int | None = Query(default=None, alias='maxCases', ge=1),
        max_cost_usd: float | None = Query(default=None, alias='maxCostUsd', ge=0),
    ) -> EvalRunResponse:
        eval_run = eval_run_repository.get(eval_run_id)
        if eval_run is None:
            raise_eval_run_not_found()

        increment_execute_request_count(eval_run.id)
        acquire_eval_run_execution(eval_run.id)
        try:
            validate_rag_config_for_execution(
                rag_client,
                eval_run.rag_config_id,
                getattr(request.state, 'request_id', ''),
            )

            test_cases = dataset_repository.list_test_cases(eval_run.dataset_id)
            if test_cases is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        'error': 'dataset_not_found',
                        'message': 'Dataset was not found.',
                    },
                )

            selected_test_cases = select_test_cases_for_execution(test_cases, max_cases)
            completed_test_case_ids = completed_case_ids(eval_run_repository, eval_run.id)
            for test_case in selected_test_cases:
                if test_case.id in completed_test_case_ids:
                    continue

                if has_reached_cost_limit(eval_run_repository, eval_run.id, max_cost_usd):
                    break

                run_test_case(
                    eval_run_repository,
                    rag_client,
                    eval_run.id,
                    eval_run.rag_config_id,
                    test_case,
                    retry_policy=RagProviderRetryPolicy(
                        max_attempts=resolve_max_retry_attempts(
                            max_retry_attempts,
                            max_retry_attempts_resolver,
                        )
                    ),
                    request_id=getattr(request.state, 'request_id', ''),
                )

            completed = eval_run_repository.get(eval_run.id)
            if completed is None:
                raise_eval_run_not_found()

            return to_eval_run_response(completed, eval_run_repository)
        finally:
            release_eval_run_execution(eval_run.id)

    return router


def increment_execute_request_count(eval_run_id: str) -> None:
    next_count = _execute_request_counts.get(eval_run_id, 0) + 1
    _execute_request_counts[eval_run_id] = next_count
    if next_count > MAX_EXECUTE_REQUESTS_PER_RUN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                'error': 'eval_run_execute_rate_limited',
                'message': 'Eval run execute request limit exceeded.',
            },
        )


def acquire_eval_run_execution(eval_run_id: str) -> None:
    if eval_run_id in _active_eval_run_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                'error': 'eval_run_already_executing',
                'message': 'Eval run is already executing.',
            },
        )

    _active_eval_run_ids.add(eval_run_id)


def release_eval_run_execution(eval_run_id: str) -> None:
    _active_eval_run_ids.discard(eval_run_id)


def select_test_cases_for_execution(
    test_cases: list[TestCaseRecord],
    max_cases: int | None,
) -> list[TestCaseRecord]:
    if max_cases is None:
        return test_cases

    stable_ordered_cases = sorted(test_cases, key=lambda test_case: test_case.created_at)
    return stable_ordered_cases[:max_cases]


def completed_case_ids(
    eval_run_repository: EvalRunRepository,
    eval_run_id: str,
) -> set[str]:
    results = eval_run_repository.list_results(eval_run_id)
    if results is None:
        return set()

    return {result.test_case_id for result in results if result.status == 'completed'}


def has_reached_cost_limit(
    eval_run_repository: EvalRunRepository,
    eval_run_id: str,
    max_cost_usd: float | None,
) -> bool:
    if max_cost_usd is None:
        return False

    results = eval_run_repository.list_results(eval_run_id)
    if results is None:
        return False

    return total_cost_usd(results) >= max_cost_usd


def total_cost_usd(results: list[CaseResultRecord]) -> float:
    return sum(result.cost_usd for result in results)


def run_test_case(
    eval_run_repository: EvalRunRepository,
    rag_client: RagApiClient,
    eval_run_id: str,
    rag_config_id: str,
    test_case: TestCaseRecord,
    retry_policy: RagProviderRetryPolicy | None = None,
    request_id: str = '',
) -> None:
    question = test_case.question
    expected_answer = getattr(test_case, 'expected_answer', '')
    reference_citations = getattr(test_case, 'reference_citations', [])

    try:
        query_result = query_with_retry(
            rag_client,
            question,
            rag_config_id,
            retry_policy or RagProviderRetryPolicy(),
            request_id=request_id,
        )
        request = CreateCaseResultRequest(
            test_case_id=test_case.id,
            trace_id=query_result.trace_id,
            question=question,
            answer=query_result.answer,
            expected_answer=expected_answer,
            status='completed',
            latency_ms=query_result.latency_ms,
            cost_usd=query_result.cost_usd,
            expected_sources=reference_citations,
            retrieved_sources=query_result.retrieved_sources,
            retrieved_context=query_result.retrieved_context,
            citations=query_result.citations,
            request_id=request_id,
        )
    except RagProviderError as exc:
        request = CreateCaseResultRequest(
            test_case_id=test_case.id,
            question=question,
            expected_answer=expected_answer,
            status='failed',
            error_message=provider_error_message(exc),
            expected_sources=reference_citations,
            request_id=request_id,
        )
    except Exception as exc:
        request = CreateCaseResultRequest(
            test_case_id=test_case.id,
            question=question,
            expected_answer=expected_answer,
            status='failed',
            error_message=str(exc),
            expected_sources=reference_citations,
            request_id=request_id,
        )

    eval_run_repository.create_result(eval_run_id, request)


def query_with_retry(
    rag_client: RagApiClient,
    question: str,
    rag_config_id: str,
    retry_policy: RagProviderRetryPolicy,
    request_id: str = '',
):
    attempts = retry_policy.attempts()
    last_error: RagProviderError | None = None

    for attempt in range(1, attempts + 1):
        try:
            return rag_client.query(question, rag_config_id, request_id=request_id)
        except RagProviderError as exc:
            last_error = exc
            if not exc.retryable or attempt == attempts:
                raise

    if last_error is not None:
        raise last_error

    return rag_client.query(question, rag_config_id, request_id=request_id)


def provider_error_message(error: RagProviderError) -> str:
    if error.category == 'timeout':
        return PROVIDER_TIMEOUT_ERROR_MESSAGE
    if error.category == 'invalid_upstream_response':
        return 'RAG provider returned an invalid response.'
    return str(error)


def resolve_max_retry_attempts(
    fallback_max_retry_attempts: int,
    max_retry_attempts_resolver: Callable[[], int] | None,
) -> int:
    if max_retry_attempts_resolver is None:
        return fallback_max_retry_attempts

    resolved = max_retry_attempts_resolver()
    if resolved < 0:
        return 0
    return resolved


def validate_rag_config_for_execution(
    rag_client: RagApiClient,
    rag_config_id: str,
    request_id: str,
) -> None:
    if not hasattr(rag_client, 'list_rag_configs'):
        return

    try:
        configs = rag_client.list_rag_configs(request_id=request_id or None)
    except RagProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                'error': 'rag_api_unavailable',
                'message': str(exc),
            },
        ) from exc

    if any(config.id == rag_config_id for config in configs):
        return

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            'error': 'rag_config_not_found',
            'message': 'RAG config was not found.',
            'ragConfigId': rag_config_id,
        },
    )


def raise_eval_run_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            'error': 'eval_run_not_found',
            'message': 'Eval run was not found.',
        },
    )
