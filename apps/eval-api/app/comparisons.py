from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from statistics import mean
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.eval_runs import (
    CaseResultRecord,
    EvalRunRepository,
    EvalRunResponse,
    get_effective_verdict,
    to_eval_run_response,
)


class CreateComparisonRequest(BaseModel):
    baseline_eval_run_id: str = Field(min_length=1, max_length=120)
    candidate_eval_run_id: str = Field(min_length=1, max_length=120)


class MetricDeltaResponse(BaseModel):
    metric: str
    baseline: float
    candidate: float
    delta: float


class ComparisonCaseResponse(BaseModel):
    test_case_id: str
    baseline_result_id: str | None
    candidate_result_id: str | None
    baseline_verdict: str | None
    candidate_verdict: str | None
    classification: str


class ComparisonResponse(BaseModel):
    id: str
    baseline_run: EvalRunResponse
    candidate_run: EvalRunResponse
    dataset_id: str
    status: str
    metric_deltas: list[MetricDeltaResponse]
    improved_cases: list[ComparisonCaseResponse]
    regressed_cases: list[ComparisonCaseResponse]
    unchanged_cases: list[ComparisonCaseResponse]
    missing_baseline_cases: list[ComparisonCaseResponse]
    missing_candidate_cases: list[ComparisonCaseResponse]
    created_at: str


@dataclass(frozen=True)
class ComparisonRecord:
    id: str
    baseline_eval_run_id: str
    candidate_eval_run_id: str
    created_at: str


def create_comparison_router(repository: EvalRunRepository) -> APIRouter:
    router = APIRouter(prefix='/api/v1/comparisons', tags=['comparisons'])
    comparisons: dict[str, ComparisonRecord] = {}

    @router.post('', response_model=ComparisonResponse, status_code=status.HTTP_201_CREATED)
    def create_comparison(request: CreateComparisonRequest) -> ComparisonResponse:
        validate_comparison_request(repository, request)
        comparison = ComparisonRecord(
            id=str(uuid4()),
            baseline_eval_run_id=request.baseline_eval_run_id,
            candidate_eval_run_id=request.candidate_eval_run_id,
            created_at=datetime.now(UTC).isoformat(),
        )
        comparisons[comparison.id] = comparison
        return to_comparison_response(comparison, repository)

    @router.get('/{comparison_id}', response_model=ComparisonResponse)
    def get_comparison(comparison_id: str) -> ComparisonResponse:
        comparison = comparisons.get(comparison_id)
        if comparison is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'comparison_not_found',
                    'message': 'Eval run comparison was not found.',
                },
            )

        return to_comparison_response(comparison, repository)

    return router


def validate_comparison_request(
    repository: EvalRunRepository,
    request: CreateComparisonRequest,
) -> None:
    baseline_run = repository.get(request.baseline_eval_run_id)
    candidate_run = repository.get(request.candidate_eval_run_id)

    if baseline_run is None or candidate_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                'error': 'eval_run_not_found',
                'message': 'Baseline or candidate eval run was not found.',
            },
        )

    if baseline_run.dataset_id != candidate_run.dataset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                'error': 'dataset_mismatch',
                'message': 'Baseline and candidate eval runs must use the same dataset.',
            },
        )


def to_comparison_response(
    comparison: ComparisonRecord,
    repository: EvalRunRepository,
) -> ComparisonResponse:
    baseline_run = repository.get(comparison.baseline_eval_run_id)
    candidate_run = repository.get(comparison.candidate_eval_run_id)

    if baseline_run is None or candidate_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                'error': 'eval_run_not_found',
                'message': 'Baseline or candidate eval run was not found.',
            },
        )

    baseline_results = repository.list_results(baseline_run.id) or []
    candidate_results = repository.list_results(candidate_run.id) or []
    case_groups = classify_cases(baseline_results, candidate_results)

    return ComparisonResponse(
        id=comparison.id,
        baseline_run=to_eval_run_response(baseline_run, repository),
        candidate_run=to_eval_run_response(candidate_run, repository),
        dataset_id=baseline_run.dataset_id,
        status='completed',
        metric_deltas=calculate_metric_deltas(
            baseline_results=baseline_results,
            candidate_results=candidate_results,
            baseline_pass_rate=to_eval_run_response(baseline_run, repository).summary.pass_rate,
            candidate_pass_rate=to_eval_run_response(candidate_run, repository).summary.pass_rate,
        ),
        improved_cases=case_groups['improved'],
        regressed_cases=case_groups['regressed'],
        unchanged_cases=case_groups['unchanged'],
        missing_baseline_cases=case_groups['missing_baseline'],
        missing_candidate_cases=case_groups['missing_candidate'],
        created_at=comparison.created_at,
    )


def calculate_metric_deltas(
    *,
    baseline_results: list[CaseResultRecord],
    candidate_results: list[CaseResultRecord],
    baseline_pass_rate: float,
    candidate_pass_rate: float,
) -> list[MetricDeltaResponse]:
    baseline_metrics = calculate_metrics(baseline_results, baseline_pass_rate)
    candidate_metrics = calculate_metrics(candidate_results, candidate_pass_rate)

    return [
        MetricDeltaResponse(
            metric=metric,
            baseline=baseline_metrics[metric],
            candidate=candidate_metrics[metric],
            delta=candidate_metrics[metric] - baseline_metrics[metric],
        )
        for metric in baseline_metrics
    ]


def calculate_metrics(results: list[CaseResultRecord], pass_rate: float) -> dict[str, float]:
    return {
        'passRate': pass_rate,
        'hitAt5Rate': rate(result.scores.retrieval.hit_at_5 for result in results),
        'recallAt10': average(result.scores.retrieval.recall_at_10 for result in results),
        'citationValidity': average(result.scores.citations.citation_validity for result in results),
        'groundedness': average(
            result.judge.scores.groundedness for result in results if result.judge is not None
        ),
        'correctness': average(
            result.judge.scores.correctness for result in results if result.judge is not None
        ),
        'completeness': average(
            result.judge.scores.completeness for result in results if result.judge is not None
        ),
        'citationSupport': average(
            result.judge.scores.citation_support for result in results if result.judge is not None
        ),
        'averageLatencyMs': average(result.latency_ms for result in results),
        'estimatedCost': sum(result.cost_usd for result in results),
    }


def classify_cases(
    baseline_results: list[CaseResultRecord],
    candidate_results: list[CaseResultRecord],
) -> dict[str, list[ComparisonCaseResponse]]:
    baseline_by_case = {result.test_case_id: result for result in baseline_results}
    candidate_by_case = {result.test_case_id: result for result in candidate_results}
    case_ids = sorted(set(baseline_by_case) | set(candidate_by_case))
    groups: dict[str, list[ComparisonCaseResponse]] = {
        'improved': [],
        'regressed': [],
        'unchanged': [],
        'missing_baseline': [],
        'missing_candidate': [],
    }

    for test_case_id in case_ids:
        baseline = baseline_by_case.get(test_case_id)
        candidate = candidate_by_case.get(test_case_id)
        classification = classify_case(baseline, candidate)
        groups[classification].append(
            ComparisonCaseResponse(
                test_case_id=test_case_id,
                baseline_result_id=baseline.id if baseline else None,
                candidate_result_id=candidate.id if candidate else None,
                baseline_verdict=get_effective_verdict(baseline) if baseline else None,
                candidate_verdict=get_effective_verdict(candidate) if candidate else None,
                classification=classification,
            )
        )

    return groups


def classify_case(
    baseline: CaseResultRecord | None,
    candidate: CaseResultRecord | None,
) -> str:
    if baseline is None:
        return 'missing_baseline'
    if candidate is None:
        return 'missing_candidate'

    baseline_passed = get_effective_verdict(baseline) == 'pass'
    candidate_passed = get_effective_verdict(candidate) == 'pass'

    if not baseline_passed and candidate_passed:
        return 'improved'
    if baseline_passed and not candidate_passed:
        return 'regressed'
    return 'unchanged'


def rate(values) -> float:
    values_list = list(values)
    if not values_list:
        return 0
    return sum(1 for value in values_list if value) / len(values_list)


def average(values) -> float:
    values_list = list(values)
    if not values_list:
        return 0
    return mean(values_list)
