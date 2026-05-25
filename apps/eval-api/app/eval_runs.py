from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.scoring import CitationScores, DeterministicScores, RetrievalScores, score_case_result


class CreateEvalRunRequest(BaseModel):
    dataset_id: str = Field(min_length=1, max_length=120)
    name: str = Field(default='', max_length=120)
    rag_config_id: str = Field(default='default', min_length=1, max_length=120)


class CreateCaseResultRequest(BaseModel):
    test_case_id: str = Field(min_length=1, max_length=120)
    trace_id: str = Field(default='', max_length=120)
    answer: str = Field(default='', max_length=8000)
    status: str = Field(default='completed', min_length=1, max_length=40)
    latency_ms: int = Field(default=0, ge=0)
    cost_usd: float = Field(default=0, ge=0)
    error_message: str = Field(default='', max_length=2000)
    expected_sources: list[str] = Field(default_factory=list, max_length=50)
    retrieved_sources: list[str] = Field(default_factory=list, max_length=50)
    citations: list[str] = Field(default_factory=list, max_length=50)


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


class RetrievalScoreResponse(BaseModel):
    hit_at_5: bool
    hit_at_10: bool
    recall_at_10: float
    retrieved_expected_sources: list[str]
    missing_expected_sources: list[str]


class CitationScoreResponse(BaseModel):
    citation_present: bool
    citation_count: int
    citation_validity: float
    invalid_citations: list[str]


class DeterministicScoreResponse(BaseModel):
    retrieval: RetrievalScoreResponse
    citations: CitationScoreResponse
    verdict: str
    failure_type: str


class CaseResultResponse(BaseModel):
    id: str
    eval_run_id: str
    test_case_id: str
    trace_id: str
    answer: str
    status: str
    latency_ms: int
    cost_usd: float
    error_message: str
    scores: DeterministicScoreResponse
    created_at: str


class CaseResultListResponse(BaseModel):
    results: list[CaseResultResponse]


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


@dataclass(frozen=True)
class CaseResultRecord:
    id: str
    eval_run_id: str
    test_case_id: str
    trace_id: str
    answer: str
    status: str
    latency_ms: int
    cost_usd: float
    error_message: str
    scores: DeterministicScores
    created_at: str


class EvalRunRepository:
    def create(self, request: CreateEvalRunRequest) -> EvalRunRecord:
        raise NotImplementedError

    def list(self) -> list[EvalRunRecord]:
        raise NotImplementedError

    def get(self, eval_run_id: str) -> EvalRunRecord | None:
        raise NotImplementedError

    def create_result(
        self,
        eval_run_id: str,
        request: CreateCaseResultRequest,
    ) -> CaseResultRecord | None:
        raise NotImplementedError

    def list_results(self, eval_run_id: str) -> list[CaseResultRecord] | None:
        raise NotImplementedError

    def get_result(
        self,
        eval_run_id: str,
        result_id: str,
    ) -> CaseResultRecord | None:
        raise NotImplementedError


class InMemoryEvalRunRepository(EvalRunRepository):
    def __init__(self) -> None:
        self._eval_runs: dict[str, EvalRunRecord] = {}
        self._case_results: dict[str, CaseResultRecord] = {}

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
        return sorted(
            self._eval_runs.values(),
            key=lambda eval_run: eval_run.created_at,
            reverse=True,
        )

    def get(self, eval_run_id: str) -> EvalRunRecord | None:
        return self._eval_runs.get(eval_run_id)

    def create_result(
        self,
        eval_run_id: str,
        request: CreateCaseResultRequest,
    ) -> CaseResultRecord | None:
        eval_run = self._eval_runs.get(eval_run_id)
        if eval_run is None:
            return None

        scores = score_case_result(
            expected_sources=request.expected_sources,
            retrieved_sources=request.retrieved_sources,
            citations=request.citations,
            status=request.status,
        )
        result = CaseResultRecord(
            id=str(uuid4()),
            eval_run_id=eval_run_id,
            test_case_id=request.test_case_id.strip(),
            trace_id=request.trace_id.strip(),
            answer=request.answer.strip(),
            status=request.status.strip(),
            latency_ms=request.latency_ms,
            cost_usd=request.cost_usd,
            error_message=request.error_message.strip(),
            scores=scores,
            created_at=datetime.now(UTC).isoformat(),
        )
        self._case_results[result.id] = result
        self._eval_runs[eval_run_id] = apply_result_summary(eval_run, result)
        return result

    def list_results(self, eval_run_id: str) -> list[CaseResultRecord] | None:
        if eval_run_id not in self._eval_runs:
            return None

        results = [
            result for result in self._case_results.values() if result.eval_run_id == eval_run_id
        ]
        return sorted(results, key=lambda result: result.created_at, reverse=True)

    def get_result(
        self,
        eval_run_id: str,
        result_id: str,
    ) -> CaseResultRecord | None:
        if eval_run_id not in self._eval_runs:
            return None

        result = self._case_results.get(result_id)
        if result is None or result.eval_run_id != eval_run_id:
            return None

        return result


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
            raise_eval_run_not_found()

        return to_eval_run_response(eval_run)

    @router.post(
        '/{eval_run_id}/results',
        response_model=CaseResultResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def create_case_result(
        eval_run_id: str,
        request: CreateCaseResultRequest,
    ) -> CaseResultResponse:
        result = repository.create_result(eval_run_id, request)

        if result is None:
            raise_eval_run_not_found()

        return to_case_result_response(result)

    @router.get('/{eval_run_id}/results', response_model=CaseResultListResponse)
    def list_case_results(eval_run_id: str) -> CaseResultListResponse:
        results = repository.list_results(eval_run_id)

        if results is None:
            raise_eval_run_not_found()

        return CaseResultListResponse(
            results=[to_case_result_response(result) for result in results]
        )

    @router.get('/{eval_run_id}/results/{result_id}', response_model=CaseResultResponse)
    def get_case_result(eval_run_id: str, result_id: str) -> CaseResultResponse:
        result = repository.get_result(eval_run_id, result_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'case_result_not_found',
                    'message': 'Eval case result was not found.',
                },
            )

        return to_case_result_response(result)

    return router


def apply_result_summary(eval_run: EvalRunRecord, result: CaseResultRecord) -> EvalRunRecord:
    failed_cases = eval_run.failed_cases + (1 if result.status == 'failed' else 0)
    completed_cases = eval_run.completed_cases + (1 if result.status == 'completed' else 0)
    total_cases = eval_run.total_cases + 1
    status_value = 'completed' if failed_cases + completed_cases == total_cases else eval_run.status

    return replace(
        eval_run,
        status=status_value,
        total_cases=total_cases,
        completed_cases=completed_cases,
        failed_cases=failed_cases,
        updated_at=datetime.now(UTC).isoformat(),
    )


def raise_eval_run_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            'error': 'eval_run_not_found',
            'message': 'Eval run was not found.',
        },
    )


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


def to_case_result_response(result: CaseResultRecord) -> CaseResultResponse:
    return CaseResultResponse(
        id=result.id,
        eval_run_id=result.eval_run_id,
        test_case_id=result.test_case_id,
        trace_id=result.trace_id,
        answer=result.answer,
        status=result.status,
        latency_ms=result.latency_ms,
        cost_usd=result.cost_usd,
        error_message=result.error_message,
        scores=to_deterministic_score_response(result.scores),
        created_at=result.created_at,
    )


def to_deterministic_score_response(scores: DeterministicScores) -> DeterministicScoreResponse:
    return DeterministicScoreResponse(
        retrieval=to_retrieval_score_response(scores.retrieval),
        citations=to_citation_score_response(scores.citations),
        verdict=scores.verdict,
        failure_type=scores.failure_type,
    )


def to_retrieval_score_response(scores: RetrievalScores) -> RetrievalScoreResponse:
    return RetrievalScoreResponse(
        hit_at_5=scores.hit_at_5,
        hit_at_10=scores.hit_at_10,
        recall_at_10=scores.recall_at_10,
        retrieved_expected_sources=scores.retrieved_expected_sources,
        missing_expected_sources=scores.missing_expected_sources,
    )


def to_citation_score_response(scores: CitationScores) -> CitationScoreResponse:
    return CitationScoreResponse(
        citation_present=scores.citation_present,
        citation_count=scores.citation_count,
        citation_validity=scores.citation_validity,
        invalid_citations=scores.invalid_citations,
    )
