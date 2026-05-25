from app.eval_runs import (
    CreateCaseResultRequest,
    CreateEvalRunRequest,
    InMemoryEvalRunRepository,
    to_eval_run_response,
)
from app.judging import JsonJudgeProvider


def make_judge_provider(
    verdict: str,
    unsupported_claims: list[str] | None = None,
) -> JsonJudgeProvider:
    unsupported = unsupported_claims or []
    unsupported_json = ', '.join(f'"{claim}"' for claim in unsupported)
    return JsonJudgeProvider(
        '{'
        '"scores": {'
        '"groundedness": 1, '
        '"correctness": 1, '
        '"completeness": 1, '
        '"citationSupport": 1, '
        '"refusalQuality": null'
        '}, '
        f'"unsupportedClaims": [{unsupported_json}], '
        '"missingImportantPoints": [], '
        f'"verdict": "{verdict}", '
        '"rationale": "Synthetic judge result."'
        '}'
    )


def create_scored_result(repository: InMemoryEvalRunRepository, eval_run_id: str) -> None:
    result = repository.create_result(
        eval_run_id,
        CreateCaseResultRequest(
            test_case_id='case-id',
            question='What is the refund policy?',
            answer='Customers can request refunds within 30 days.',
            expected_answer='Customers can request refunds within 30 days.',
            status='completed',
            expected_sources=['refund-policy.md'],
            retrieved_sources=['refund-policy.md'],
            citations=['refund-policy.md'],
        ),
    )
    assert result is not None


def test_judge_fail_verdict_removes_case_from_pass_rate() -> None:
    repository = InMemoryEvalRunRepository(judge_provider=make_judge_provider('fail'))
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Judge fail run',
            rag_config_id='config-id',
        )
    )

    create_scored_result(repository, eval_run.id)

    updated = repository.get(eval_run.id)
    assert updated is not None
    summary = to_eval_run_response(updated, repository).summary
    assert summary.passed_cases == 0
    assert summary.warning_cases == 0
    assert summary.error_cases == 0
    assert summary.pass_rate == 0
    assert summary.failure_types == {'judge_verdict': 1}


def test_judge_warning_verdict_counts_as_warning() -> None:
    repository = InMemoryEvalRunRepository(judge_provider=make_judge_provider('warning'))
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Judge warning run',
            rag_config_id='config-id',
        )
    )

    create_scored_result(repository, eval_run.id)

    updated = repository.get(eval_run.id)
    assert updated is not None
    summary = to_eval_run_response(updated, repository).summary
    assert summary.passed_cases == 0
    assert summary.warning_cases == 1
    assert summary.error_cases == 0
    assert summary.failure_types == {'judge_verdict': 1}


def test_judge_error_verdict_counts_as_error() -> None:
    repository = InMemoryEvalRunRepository(judge_provider=make_judge_provider('error'))
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Judge error run',
            rag_config_id='config-id',
        )
    )

    create_scored_result(repository, eval_run.id)

    updated = repository.get(eval_run.id)
    assert updated is not None
    summary = to_eval_run_response(updated, repository).summary
    assert summary.passed_cases == 0
    assert summary.warning_cases == 0
    assert summary.error_cases == 1
    assert summary.failure_types == {'judge_verdict': 1}


def test_unsupported_claims_use_specific_failure_type() -> None:
    repository = InMemoryEvalRunRepository(
        judge_provider=make_judge_provider(
            'fail',
            unsupported_claims=['Unsupported policy claim.'],
        )
    )
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Unsupported claim run',
            rag_config_id='config-id',
        )
    )

    create_scored_result(repository, eval_run.id)

    updated = repository.get(eval_run.id)
    assert updated is not None
    summary = to_eval_run_response(updated, repository).summary
    assert summary.passed_cases == 0
    assert summary.failure_types == {'unsupported_claims': 1}
