from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.datasets import DatasetRepository, TestCaseRecord
from app.eval_runs import (
    CreateCaseResultRequest,
    EvalRunRepository,
    EvalRunResponse,
    to_eval_run_response,
)
from app.rag_client import RagApiClient


def create_eval_runner_router(
    eval_run_repository: EvalRunRepository,
    dataset_repository: DatasetRepository,
    rag_client: RagApiClient,
) -> APIRouter:
    router = APIRouter(prefix='/api/v1/eval-runs', tags=['eval-runs'])

    @router.post('/{eval_run_id}/execute', response_model=EvalRunResponse)
    def execute_eval_run(eval_run_id: str) -> EvalRunResponse:
        eval_run = eval_run_repository.get(eval_run_id)
        if eval_run is None:
            raise_eval_run_not_found()

        test_cases = dataset_repository.list_test_cases(eval_run.dataset_id)
        if test_cases is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'dataset_not_found',
                    'message': 'Dataset was not found.',
                },
            )

        for test_case in test_cases:
            run_test_case(eval_run_repository, rag_client, eval_run.id, eval_run.rag_config_id, test_case)

        completed = eval_run_repository.get(eval_run.id)
        if completed is None:
            raise_eval_run_not_found()

        return to_eval_run_response(completed)

    return router


def run_test_case(
    eval_run_repository: EvalRunRepository,
    rag_client: RagApiClient,
    eval_run_id: str,
    rag_config_id: str,
    test_case: TestCaseRecord,
) -> None:
    try:
        query_result = rag_client.query(test_case.question, rag_config_id)
        request = CreateCaseResultRequest(
            test_case_id=test_case.id,
            trace_id=query_result.trace_id,
            answer=query_result.answer,
            status='completed',
            latency_ms=query_result.latency_ms,
            cost_usd=query_result.cost_usd,
        )
    except Exception as exc:
        request = CreateCaseResultRequest(
            test_case_id=test_case.id,
            status='failed',
            error_message=str(exc),
        )

    eval_run_repository.create_result(eval_run_id, request)


def raise_eval_run_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            'error': 'eval_run_not_found',
            'message': 'Eval run was not found.',
        },
    )
