from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from psycopg import Connection
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

from app.judging import (
    HeuristicJudgeProvider,
    JudgeEvaluation,
    JudgeEvaluationInput,
    JudgeProvider,
    JudgeProviderError,
    JudgeScores,
)
from app.scoring import CitationScores, DeterministicScores, RetrievalScores, score_case_result


class CreateEvalRunRequest(BaseModel):
    dataset_id: str = Field(min_length=1, max_length=120)
    name: str = Field(default='', max_length=120)
    rag_config_id: str = Field(default='default', min_length=1, max_length=120)
    judge_enabled: bool = True


class CreateCaseResultRequest(BaseModel):
    test_case_id: str = Field(min_length=1, max_length=120)
    trace_id: str = Field(default='', max_length=120)
    question: str = Field(default='', max_length=2000)
    answer: str = Field(default='', max_length=8000)
    expected_answer: str = Field(default='', max_length=8000)
    status: str = Field(default='completed', min_length=1, max_length=40)
    latency_ms: int = Field(default=0, ge=0)
    cost_usd: float = Field(default=0, ge=0)
    error_message: str = Field(default='', max_length=2000)
    expected_sources: list[str] = Field(default_factory=list, max_length=50)
    retrieved_sources: list[str] = Field(default_factory=list, max_length=50)
    retrieved_context: list[str] = Field(default_factory=list, max_length=50)
    citations: list[str] = Field(default_factory=list, max_length=50)
    no_answer_expected: bool = False
    request_id: str = Field(default='', max_length=128)


class EvalRunSummary(BaseModel):
    total_cases: int
    completed_cases: int
    failed_cases: int
    passed_cases: int
    warning_cases: int
    error_cases: int
    pass_rate: float
    failure_types: dict[str, int]


class EvalRunResponse(BaseModel):
    id: str
    dataset_id: str
    name: str
    rag_config_id: str
    judge_enabled: bool
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


class JudgeScoreResponse(BaseModel):
    groundedness: float
    correctness: float
    completeness: float
    citation_support: float
    refusal_quality: float | None


class JudgeEvaluationResponse(BaseModel):
    scores: JudgeScoreResponse
    unsupported_claims: list[str]
    missing_important_points: list[str]
    verdict: str
    rationale: str


class CaseResultResponse(BaseModel):
    id: str
    eval_run_id: str
    test_case_id: str
    trace_id: str
    question: str
    answer: str
    expected_answer: str
    status: str
    latency_ms: int
    cost_usd: float
    error_message: str
    scores: DeterministicScoreResponse
    judge: JudgeEvaluationResponse | None
    judge_error: str
    created_at: str


class CaseResultListResponse(BaseModel):
    results: list[CaseResultResponse]


@dataclass(frozen=True)
class EvalRunRecord:
    id: str
    dataset_id: str
    name: str
    rag_config_id: str
    judge_enabled: bool
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
    question: str
    answer: str
    expected_answer: str
    status: str
    latency_ms: int
    cost_usd: float
    error_message: str
    scores: DeterministicScores
    judge: JudgeEvaluation | None
    judge_error: str
    request_id: str
    created_at: str


@dataclass(frozen=True)
class EvalRunScoreRollup:
    passed_cases: int
    warning_cases: int
    error_cases: int
    pass_rate: float
    failure_types: dict[str, int]


@dataclass(frozen=True)
class JudgePersistenceFields:
    judge_scores: dict[str, float | None]
    judge_unsupported_claims: list[str]
    judge_missing_important_points: list[str]
    judge_verdict: str
    judge_rationale: str
    judge_error: str


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
    def __init__(self, judge_provider: JudgeProvider | None = None) -> None:
        self._eval_runs: dict[str, EvalRunRecord] = {}
        self._case_results: dict[str, CaseResultRecord] = {}
        self._judge_provider = judge_provider or HeuristicJudgeProvider()

    def create(self, request: CreateEvalRunRequest) -> EvalRunRecord:
        now = datetime.now(UTC).isoformat()
        eval_run = EvalRunRecord(
            id=str(uuid4()),
            dataset_id=request.dataset_id.strip(),
            name=request.name.strip(),
            rag_config_id=request.rag_config_id.strip(),
            judge_enabled=request.judge_enabled,
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
        judge = None
        judge_error = ''
        if eval_run.judge_enabled:
            judge, judge_error = score_judge_result(request, self._judge_provider)

        result = CaseResultRecord(
            id=str(uuid4()),
            eval_run_id=eval_run_id,
            test_case_id=request.test_case_id.strip(),
            trace_id=request.trace_id.strip(),
            question=request.question.strip(),
            answer=request.answer.strip(),
            expected_answer=request.expected_answer.strip(),
            status=request.status.strip(),
            latency_ms=request.latency_ms,
            cost_usd=request.cost_usd,
            error_message=request.error_message.strip(),
            scores=scores,
            judge=judge,
            judge_error=judge_error,
            request_id=request.request_id.strip(),
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


class PostgresEvalRunRepository(EvalRunRepository):
    def __init__(
        self,
        database_url: str,
        judge_provider: JudgeProvider | None = None,
    ) -> None:
        self._database_url = database_url
        self._judge_provider = judge_provider or HeuristicJudgeProvider()

    def create(self, request: CreateEvalRunRequest) -> EvalRunRecord:
        now = datetime.now(UTC).isoformat()
        eval_run_id = str(uuid4())
        with self._connect() as connection:
            row = connection.execute(
                """
                INSERT INTO eval.eval_runs (
                  id,
                  dataset_id,
                  name,
                  rag_config_id,
                  judge_enabled,
                  status,
                  total_cases,
                  completed_cases,
                  failed_cases,
                  created_at,
                  updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 'queued', 0, 0, 0, %s, %s)
                RETURNING
                  id,
                  dataset_id,
                  name,
                  rag_config_id,
                  judge_enabled,
                  status,
                  total_cases,
                  completed_cases,
                  failed_cases,
                  created_at,
                  updated_at
                """,
                (
                    eval_run_id,
                    request.dataset_id.strip(),
                    request.name.strip(),
                    request.rag_config_id.strip(),
                    request.judge_enabled,
                    now,
                    now,
                ),
            ).fetchone()

        if row is None:
            raise RuntimeError('Failed to create eval run.')

        return map_eval_run_row(row)

    def list(self) -> list[EvalRunRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT
                  id,
                  dataset_id,
                  name,
                  rag_config_id,
                  judge_enabled,
                  status,
                  total_cases,
                  completed_cases,
                  failed_cases,
                  created_at,
                  updated_at
                FROM eval.eval_runs
                ORDER BY created_at DESC
                """
            ).fetchall()

        return [map_eval_run_row(row) for row in rows]

    def get(self, eval_run_id: str) -> EvalRunRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT
                  id,
                  dataset_id,
                  name,
                  rag_config_id,
                  judge_enabled,
                  status,
                  total_cases,
                  completed_cases,
                  failed_cases,
                  created_at,
                  updated_at
                FROM eval.eval_runs
                WHERE id = %s
                """,
                (eval_run_id,),
            ).fetchone()

        return map_eval_run_row(row) if row else None

    def create_result(
        self,
        eval_run_id: str,
        request: CreateCaseResultRequest,
    ) -> CaseResultRecord | None:
        with self._connect() as connection:
            eval_run_row = connection.execute(
                """
                SELECT
                  id,
                  dataset_id,
                  name,
                  rag_config_id,
                  judge_enabled,
                  status,
                  total_cases,
                  completed_cases,
                  failed_cases,
                  created_at,
                  updated_at
                FROM eval.eval_runs
                WHERE id = %s
                FOR UPDATE
                """,
                (eval_run_id,),
            ).fetchone()
            if eval_run_row is None:
                return None

            eval_run = map_eval_run_row(eval_run_row)
            scores = score_case_result(
                expected_sources=request.expected_sources,
                retrieved_sources=request.retrieved_sources,
                citations=request.citations,
                status=request.status,
            )
            judge = None
            judge_error = ''
            if eval_run.judge_enabled:
                judge, judge_error = score_judge_result(request, self._judge_provider)

            result = CaseResultRecord(
                id=str(uuid4()),
                eval_run_id=eval_run_id,
                test_case_id=request.test_case_id.strip(),
                trace_id=request.trace_id.strip(),
                question=request.question.strip(),
                answer=request.answer.strip(),
                expected_answer=request.expected_answer.strip(),
                status=request.status.strip(),
                latency_ms=request.latency_ms,
                cost_usd=request.cost_usd,
                error_message=request.error_message.strip(),
                scores=scores,
                judge=judge,
                judge_error=judge_error,
                request_id=request.request_id.strip(),
                created_at=datetime.now(UTC).isoformat(),
            )
            persistence = to_judge_persistence_fields(result)

            inserted_row = connection.execute(
                """
                INSERT INTO eval.eval_case_results (
                  id,
                  eval_run_id,
                  test_case_id,
                  trace_id,
                  question,
                  answer,
                  expected_answer,
                  status,
                  latency_ms,
                  cost_usd,
                  error_message,
                  retrieval_scores,
                  citation_scores,
                  verdict,
                  failure_type,
                  expected_sources,
                  retrieved_sources,
                  retrieved_context,
                  citations,
                  judge_scores,
                  judge_unsupported_claims,
                  judge_missing_important_points,
                  judge_verdict,
                  judge_rationale,
                  judge_error,
                  request_id,
                  created_at
                )
                VALUES (
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s::jsonb,
                  %s::jsonb,
                  %s,
                  %s,
                  %s::jsonb,
                  %s::jsonb,
                  %s::jsonb,
                  %s::jsonb,
                  %s::jsonb,
                  %s::jsonb,
                  %s::jsonb,
                  %s,
                  %s,
                  %s,
                  %s,
                  %s
                )
                RETURNING *
                """,
                (
                    result.id,
                    result.eval_run_id,
                    result.test_case_id,
                    result.trace_id,
                    result.question,
                    result.answer,
                    result.expected_answer,
                    result.status,
                    result.latency_ms,
                    result.cost_usd,
                    result.error_message,
                    {
                        'hit_at_5': result.scores.retrieval.hit_at_5,
                        'hit_at_10': result.scores.retrieval.hit_at_10,
                        'recall_at_10': result.scores.retrieval.recall_at_10,
                        'retrieved_expected_sources': (
                            result.scores.retrieval.retrieved_expected_sources
                        ),
                        'missing_expected_sources': (
                            result.scores.retrieval.missing_expected_sources
                        ),
                    },
                    {
                        'citation_present': result.scores.citations.citation_present,
                        'citation_count': result.scores.citations.citation_count,
                        'citation_validity': result.scores.citations.citation_validity,
                        'invalid_citations': result.scores.citations.invalid_citations,
                    },
                    result.scores.verdict,
                    result.scores.failure_type,
                    request.expected_sources,
                    request.retrieved_sources,
                    request.retrieved_context,
                    request.citations,
                    persistence.judge_scores,
                    persistence.judge_unsupported_claims,
                    persistence.judge_missing_important_points,
                    persistence.judge_verdict,
                    persistence.judge_rationale,
                    persistence.judge_error,
                    result.request_id,
                    result.created_at,
                ),
            ).fetchone()

            updated_eval_run = apply_result_summary(eval_run, result)
            connection.execute(
                """
                UPDATE eval.eval_runs
                SET
                  status = %s,
                  total_cases = %s,
                  completed_cases = %s,
                  failed_cases = %s,
                  updated_at = %s
                WHERE id = %s
                """,
                (
                    updated_eval_run.status,
                    updated_eval_run.total_cases,
                    updated_eval_run.completed_cases,
                    updated_eval_run.failed_cases,
                    updated_eval_run.updated_at,
                    eval_run_id,
                ),
            )

        if inserted_row is None:
            return None

        return map_case_result_row(inserted_row)

    def list_results(self, eval_run_id: str) -> list[CaseResultRecord] | None:
        if self.get(eval_run_id) is None:
            return None

        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM eval.eval_case_results
                WHERE eval_run_id = %s
                ORDER BY created_at DESC
                """,
                (eval_run_id,),
            ).fetchall()

        return [map_case_result_row(row) for row in rows]

    def get_result(
        self,
        eval_run_id: str,
        result_id: str,
    ) -> CaseResultRecord | None:
        if self.get(eval_run_id) is None:
            return None

        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT *
                FROM eval.eval_case_results
                WHERE eval_run_id = %s AND id = %s
                """,
                (eval_run_id, result_id),
            ).fetchone()

        return map_case_result_row(row) if row else None

    def _connect(self) -> Connection:
        return Connection.connect(self._database_url, row_factory=dict_row)

def create_eval_run_router(repository: EvalRunRepository) -> APIRouter:
    router = APIRouter(prefix='/api/v1/eval-runs', tags=['eval-runs'])

    @router.post('', response_model=EvalRunResponse, status_code=status.HTTP_201_CREATED)
    def create_eval_run(request: CreateEvalRunRequest) -> EvalRunResponse:
        return to_eval_run_response(repository.create(request), repository)

    @router.get('', response_model=EvalRunListResponse)
    def list_eval_runs() -> EvalRunListResponse:
        eval_runs = [to_eval_run_response(eval_run, repository) for eval_run in repository.list()]
        return EvalRunListResponse(eval_runs=eval_runs)

    @router.get('/{eval_run_id}', response_model=EvalRunResponse)
    def get_eval_run(eval_run_id: str) -> EvalRunResponse:
        eval_run = repository.get(eval_run_id)

        if eval_run is None:
            raise_eval_run_not_found()

        return to_eval_run_response(eval_run, repository)

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


def score_judge_result(
    request: CreateCaseResultRequest,
    judge_provider: JudgeProvider,
) -> tuple[JudgeEvaluation | None, str]:
    expected_answer = request.expected_answer.strip()
    if not expected_answer and not request.no_answer_expected:
        return None, ''

    try:
        return (
            judge_provider.evaluate(
                JudgeEvaluationInput(
                    question=request.question.strip(),
                    expected_answer=expected_answer,
                    generated_answer=request.answer.strip(),
                    expected_sources=request.expected_sources,
                    retrieved_context=request.retrieved_context,
                    citations=request.citations,
                    no_answer_expected=request.no_answer_expected,
                )
            ),
            '',
        )
    except JudgeProviderError as exc:
        return None, str(exc)


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


def calculate_score_rollup(results: list[CaseResultRecord]) -> EvalRunScoreRollup:
    total_cases = len(results)
    passed_cases = sum(1 for result in results if get_effective_verdict(result) == 'pass')
    warning_cases = sum(1 for result in results if get_effective_verdict(result) == 'warning')
    error_cases = sum(1 for result in results if get_effective_verdict(result) == 'error')
    failure_types: dict[str, int] = {}

    for result in results:
        failure_type = get_effective_failure_type(result)
        if failure_type:
            failure_types[failure_type] = failure_types.get(failure_type, 0) + 1

    return EvalRunScoreRollup(
        passed_cases=passed_cases,
        warning_cases=warning_cases,
        error_cases=error_cases,
        pass_rate=passed_cases / total_cases if total_cases else 0,
        failure_types=failure_types,
    )


def get_effective_verdict(result: CaseResultRecord) -> str:
    if result.judge_error:
        return 'error'
    if result.judge is not None and result.judge.verdict in {'fail', 'warning', 'error'}:
        return result.judge.verdict
    return result.scores.verdict


def get_effective_failure_type(result: CaseResultRecord) -> str:
    if result.judge_error:
        return 'judge_error'
    if result.judge is not None:
        if result.judge.unsupported_claims:
            return 'unsupported_claims'
        if result.judge.verdict in {'fail', 'warning', 'error'}:
            return 'judge_verdict'
    return result.scores.failure_type


def to_judge_persistence_fields(result: CaseResultRecord) -> JudgePersistenceFields:
    if result.judge is None:
        return JudgePersistenceFields(
            judge_scores={},
            judge_unsupported_claims=[],
            judge_missing_important_points=[],
            judge_verdict='',
            judge_rationale='',
            judge_error=result.judge_error,
        )

    return JudgePersistenceFields(
        judge_scores={
            'groundedness': result.judge.scores.groundedness,
            'correctness': result.judge.scores.correctness,
            'completeness': result.judge.scores.completeness,
            'citationSupport': result.judge.scores.citation_support,
            'refusalQuality': result.judge.scores.refusal_quality,
        },
        judge_unsupported_claims=result.judge.unsupported_claims,
        judge_missing_important_points=result.judge.missing_important_points,
        judge_verdict=result.judge.verdict,
        judge_rationale=result.judge.rationale,
        judge_error=result.judge_error,
    )


def raise_eval_run_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            'error': 'eval_run_not_found',
            'message': 'Eval run was not found.',
        },
    )


def to_eval_run_response(
    eval_run: EvalRunRecord,
    repository: EvalRunRepository,
) -> EvalRunResponse:
    results = repository.list_results(eval_run.id) or []
    score_rollup = calculate_score_rollup(results)

    return EvalRunResponse(
        id=eval_run.id,
        dataset_id=eval_run.dataset_id,
        name=eval_run.name,
        rag_config_id=eval_run.rag_config_id,
        judge_enabled=eval_run.judge_enabled,
        status=eval_run.status,
        summary=EvalRunSummary(
            total_cases=eval_run.total_cases,
            completed_cases=eval_run.completed_cases,
            failed_cases=eval_run.failed_cases,
            passed_cases=score_rollup.passed_cases,
            warning_cases=score_rollup.warning_cases,
            error_cases=score_rollup.error_cases,
            pass_rate=score_rollup.pass_rate,
            failure_types=score_rollup.failure_types,
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
        question=result.question,
        answer=result.answer,
        expected_answer=result.expected_answer,
        status=result.status,
        latency_ms=result.latency_ms,
        cost_usd=result.cost_usd,
        error_message=result.error_message,
        scores=to_deterministic_score_response(result.scores),
        judge=to_judge_evaluation_response(result.judge),
        judge_error=result.judge_error,
        created_at=result.created_at,
    )


def to_deterministic_score_response(scores: DeterministicScores) -> DeterministicScoreResponse:
    return DeterministicScoreResponse(
        retrieval=to_retrieval_score_response(scores.retrieval),
        citations=to_citation_score_response(scores.citations),
        verdict=scores.verdict,
        failure_type=scores.failure_type,
    )


def to_judge_evaluation_response(
    evaluation: JudgeEvaluation | None,
) -> JudgeEvaluationResponse | None:
    if evaluation is None:
        return None

    return JudgeEvaluationResponse(
        scores=to_judge_score_response(evaluation.scores),
        unsupported_claims=evaluation.unsupported_claims,
        missing_important_points=evaluation.missing_important_points,
        verdict=evaluation.verdict,
        rationale=evaluation.rationale,
    )


def to_judge_score_response(scores: JudgeScores) -> JudgeScoreResponse:
    return JudgeScoreResponse(
        groundedness=scores.groundedness,
        correctness=scores.correctness,
        completeness=scores.completeness,
        citation_support=scores.citation_support,
        refusal_quality=scores.refusal_quality,
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


def map_eval_run_row(row: dict) -> EvalRunRecord:
    return EvalRunRecord(
        id=str(row['id']),
        dataset_id=str(row['dataset_id']),
        name=row['name'],
        rag_config_id=row['rag_config_id'],
        judge_enabled=bool(row.get('judge_enabled', True)),
        status=row['status'],
        total_cases=int(row['total_cases']),
        completed_cases=int(row['completed_cases']),
        failed_cases=int(row['failed_cases']),
        created_at=row['created_at'].astimezone(UTC).isoformat(),
        updated_at=row['updated_at'].astimezone(UTC).isoformat(),
    )


def map_case_result_row(row: dict) -> CaseResultRecord:
    retrieval_scores = row.get('retrieval_scores', {})
    citation_scores = row.get('citation_scores', {})
    judge_scores = row.get('judge_scores', {})
    judge_unsupported_claims = parse_string_list(row.get('judge_unsupported_claims', []))
    judge_missing_points = parse_string_list(row.get('judge_missing_important_points', []))

    judge: JudgeEvaluation | None = None
    if judge_scores:
        judge = JudgeEvaluation(
            scores=JudgeScores(
                groundedness=float(judge_scores.get('groundedness', 0)),
                correctness=float(judge_scores.get('correctness', 0)),
                completeness=float(judge_scores.get('completeness', 0)),
                citation_support=float(judge_scores.get('citationSupport', 0)),
                refusal_quality=parse_optional_float(judge_scores.get('refusalQuality')),
            ),
            unsupported_claims=judge_unsupported_claims,
            missing_important_points=judge_missing_points,
            verdict=str(row.get('judge_verdict', '') or ''),
            rationale=str(row.get('judge_rationale', '') or ''),
        )

    return CaseResultRecord(
        id=str(row['id']),
        eval_run_id=str(row['eval_run_id']),
        test_case_id=str(row['test_case_id']),
        trace_id=str(row.get('trace_id', '') or ''),
        question=str(row.get('question', '') or ''),
        answer=str(row.get('answer', '') or ''),
        expected_answer=str(row.get('expected_answer', '') or ''),
        status=str(row.get('status', 'completed') or 'completed'),
        latency_ms=int(row.get('latency_ms', 0) or 0),
        cost_usd=decimal_to_float(row.get('cost_usd', 0)),
        error_message=str(row.get('error_message', '') or ''),
        scores=DeterministicScores(
            retrieval=RetrievalScores(
                hit_at_5=bool(retrieval_scores.get('hit_at_5', False)),
                hit_at_10=bool(retrieval_scores.get('hit_at_10', False)),
                recall_at_10=float(retrieval_scores.get('recall_at_10', 0)),
                retrieved_expected_sources=parse_string_list(
                    retrieval_scores.get('retrieved_expected_sources', [])
                ),
                missing_expected_sources=parse_string_list(
                    retrieval_scores.get('missing_expected_sources', [])
                ),
            ),
            citations=CitationScores(
                citation_present=bool(citation_scores.get('citation_present', False)),
                citation_count=int(citation_scores.get('citation_count', 0)),
                citation_validity=float(citation_scores.get('citation_validity', 0)),
                invalid_citations=parse_string_list(citation_scores.get('invalid_citations', [])),
            ),
            verdict=str(row.get('verdict', '') or ''),
            failure_type=str(row.get('failure_type', '') or ''),
        ),
        judge=judge,
        judge_error=str(row.get('judge_error', '') or ''),
        request_id=str(row.get('request_id', '') or ''),
        created_at=row['created_at'].astimezone(UTC).isoformat(),
    )


def parse_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item)]


def decimal_to_float(value: object) -> float:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, int | float):
        return float(value)
    return 0


def parse_optional_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, int | float):
        return float(value)
    return None
