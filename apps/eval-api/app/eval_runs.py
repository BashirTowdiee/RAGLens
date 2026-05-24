from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field


class CreateEvalRunRequest(BaseModel):
    dataset_id: str = Field(min_length=1, max_length=120)
    name: str = Field(default='', max_length=120)
    rag_config_id: str = Field(default='default', min_length=1, max_length=120)


class EvalRunSummary(BaseModel):
    total_cases: int
    completed_cases: int
    failed_cases: int


class EvalRunResponse(BaseModel):
    id: str
    dataset_id: str
    name: str
    rag_config_id: str
    status: str
    summary: EvalRunSummary
    created_at: str
    updated_at: str


class EvalRunListResponse(BaseModel):
    eval_runs: list[EvalRunResponse]


@dataclass(frozen=True)
class EvalRunRecord:
    id: str
    dataset_id: str
    name: str
    rag_config_id: str
    status: str
    total_cases: int
    completed_cases: int
    failed_cases: int
    created_at: str
    updated_at: str


class EvalRunRepository:
    def create(self, request: CreateEvalRunRequest) -> EvalRunRecord:
        raise NotImplementedError

    def list(self) -> list[EvalRunRecord]:
        raise NotImplementedError

    def get(self, eval_run_id: str) -> EvalRunRecord | None:
        raise NotImplementedError


class InMemoryEvalRunRepository(EvalRunRepository):
    def __init__(self) -> None:
        self._eval_runs: dict[str, EvalRunRecord] = {}

    def create(self, request: CreateEvalRunRequest) -> EvalRunRecord:
        now = datetime.now(UTC).isoformat()
        eval_run = EvalRunRecord(
            id=str(uuid4()),
            dataset_id=request.dataset_id.strip(),
            name=request.name.strip(),
            rag_config_id=request.rag_config_id.strip(),
            status='queued',
            total_cases=0,
            completed_cases=0,
            failed_cases=0,
            created_at=now,
            updated_at=now,
        )
        self._eval_runs[eval_run.id] = eval_run
        return eval_run

    def list(self) -> list[EvalRunRecord]:
        return sorted(self._eval_runs.values(), key=lambda eval_run: eval_run.created_at, reverse=True)

    def get(self, eval_run_id: str) -> EvalRunRecord | None:
        return self._eval_runs.get(eval_run_id)


def create_eval_run_router(repository: EvalRunRepository) -> APIRouter:
    router = APIRouter(prefix='/api/v1/eval-runs', tags=['eval-runs'])

    @router.post('', response_model=EvalRunResponse, status_code=status.HTTP_201_CREATED)
    def create_eval_run(request: CreateEvalRunRequest) -> EvalRunResponse:
        return to_eval_run_response(repository.create(request))

    @router.get('', response_model=EvalRunListResponse)
    def list_eval_runs() -> EvalRunListResponse:
        eval_runs = [to_eval_run_response(eval_run) for eval_run in repository.list()]
        return EvalRunListResponse(eval_runs=eval_runs)

    @router.get('/{eval_run_id}', response_model=EvalRunResponse)
    def get_eval_run(eval_run_id: str) -> EvalRunResponse:
        eval_run = repository.get(eval_run_id)

        if eval_run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'eval_run_not_found',
                    'message': 'Eval run was not found.',
                },
            )

        return to_eval_run_response(eval_run)

    return router


def to_eval_run_response(eval_run: EvalRunRecord) -> EvalRunResponse:
    return EvalRunResponse(
        id=eval_run.id,
        dataset_id=eval_run.dataset_id,
        name=eval_run.name,
        rag_config_id=eval_run.rag_config_id,
        status=eval_run.status,
        summary=EvalRunSummary(
            total_cases=eval_run.total_cases,
            completed_cases=eval_run.completed_cases,
            failed_cases=eval_run.failed_cases,
        ),
        created_at=eval_run.created_at,
        updated_at=eval_run.updated_at,
    )
