from __future__ import annotations

from collections.abc import Iterable
from statistics import mean

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.eval_runs import CaseResultRecord, EvalRunRepository, to_eval_run_response


class QualityThresholds(BaseModel):
    min_hit_at_5: float = Field(default=0, ge=0, le=1)
    min_citation_validity: float = Field(default=0, ge=0, le=1)
    min_groundedness: float = Field(default=0, ge=0, le=1)
    min_correctness: float = Field(default=0, ge=0, le=1)
    max_average_latency_ms: float = Field(default=0, ge=0)


class CiEvaluateRequest(BaseModel):
    eval_run_id: str = Field(min_length=1, max_length=120)
    thresholds: QualityThresholds = Field(default_factory=QualityThresholds)


class CiGateMetricResponse(BaseModel):
    metric: str
    actual: float
    threshold: float
    operator: str
    passed: bool


class CiGateMetricsResponse(BaseModel):
    pass_rate: float
    hit_at_5_rate: float
    citation_validity: float
    groundedness: float
    correctness: float
    average_latency_ms: float


class CiGateResponse(BaseModel):
    eval_run_id: str
    status: str
    passed: bool
    metrics: CiGateMetricsResponse
    threshold_results: list[CiGateMetricResponse]
    summary_markdown: str


def create_ci_gate_router(repository: EvalRunRepository) -> APIRouter:
    router = APIRouter(prefix='/api/v1/ci', tags=['ci-gate'])

    @router.post('/evaluate', response_model=CiGateResponse)
    def evaluate_ci_gate(request: CiEvaluateRequest) -> CiGateResponse:
        eval_run = repository.get(request.eval_run_id)
        results = repository.list_results(request.eval_run_id)

        if eval_run is None or results is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'eval_run_not_found',
                    'message': 'Eval run was not found.',
                },
            )

        metrics = calculate_ci_gate_metrics(results, to_eval_run_response(eval_run, repository).summary.pass_rate)
        threshold_results = evaluate_thresholds(metrics, request.thresholds)
        passed = all(result.passed for result in threshold_results)

        return CiGateResponse(
            eval_run_id=eval_run.id,
            status='passed' if passed else 'failed',
            passed=passed,
            metrics=metrics,
            threshold_results=threshold_results,
            summary_markdown=build_summary_markdown(metrics, threshold_results, passed),
        )

    return router


def calculate_ci_gate_metrics(
    results: list[CaseResultRecord],
    pass_rate: float,
) -> CiGateMetricsResponse:
    return CiGateMetricsResponse(
        pass_rate=round_metric(pass_rate),
        hit_at_5_rate=round_metric(rate(result.scores.retrieval.hit_at_5 for result in results)),
        citation_validity=round_metric(
            average(result.scores.citations.citation_validity for result in results)
        ),
        groundedness=round_metric(
            average(result.judge.scores.groundedness for result in results if result.judge)
        ),
        correctness=round_metric(
            average(result.judge.scores.correctness for result in results if result.judge)
        ),
        average_latency_ms=round_metric(average(result.latency_ms for result in results)),
    )


def evaluate_thresholds(
    metrics: CiGateMetricsResponse,
    thresholds: QualityThresholds,
) -> list[CiGateMetricResponse]:
    return [
        minimum_threshold('hitAt5Rate', metrics.hit_at_5_rate, thresholds.min_hit_at_5),
        minimum_threshold(
            'citationValidity',
            metrics.citation_validity,
            thresholds.min_citation_validity,
        ),
        minimum_threshold('groundedness', metrics.groundedness, thresholds.min_groundedness),
        minimum_threshold('correctness', metrics.correctness, thresholds.min_correctness),
        maximum_threshold(
            'averageLatencyMs',
            metrics.average_latency_ms,
            thresholds.max_average_latency_ms,
        ),
    ]


def minimum_threshold(metric: str, actual: float, threshold: float) -> CiGateMetricResponse:
    return CiGateMetricResponse(
        metric=metric,
        actual=actual,
        threshold=threshold,
        operator='>=',
        passed=actual >= threshold,
    )


def maximum_threshold(metric: str, actual: float, threshold: float) -> CiGateMetricResponse:
    return CiGateMetricResponse(
        metric=metric,
        actual=actual,
        threshold=threshold,
        operator='<=',
        passed=actual <= threshold,
    )


def build_summary_markdown(
    metrics: CiGateMetricsResponse,
    threshold_results: list[CiGateMetricResponse],
    passed: bool,
) -> str:
    status_line = 'PASSED' if passed else 'FAILED'
    threshold_lines = [
        f"- {result.metric}: {result.actual} {result.operator} {result.threshold} "
        f"{'passed' if result.passed else 'failed'}"
        for result in threshold_results
    ]

    return '\n'.join(
        [
            f'# RAGLens CI quality gate: {status_line}',
            '',
            f'- passRate: {metrics.pass_rate}',
            f'- hitAt5Rate: {metrics.hit_at_5_rate}',
            f'- citationValidity: {metrics.citation_validity}',
            f'- groundedness: {metrics.groundedness}',
            f'- correctness: {metrics.correctness}',
            f'- averageLatencyMs: {metrics.average_latency_ms}',
            '',
            '## Thresholds',
            *threshold_lines,
        ]
    )


def rate(values: Iterable[bool]) -> float:
    values_list = list(values)
    if not values_list:
        return 0
    return sum(1 for value in values_list if value) / len(values_list)


def average(values: Iterable[float]) -> float:
    values_list = list(values)
    if not values_list:
        return 0
    return mean(values_list)


def round_metric(value: float) -> float:
    return round(value, 6)
