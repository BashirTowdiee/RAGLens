from app.eval_runs import (
    CreateCaseResultRequest,
    CreateEvalRunRequest,
    InMemoryEvalRunRepository,
    to_case_result_response,
    to_eval_run_response,
)
from app.judging import JsonJudgeProvider


def test_malformed_judge_output_is_stored_as_judge_error() -> None:
    repository = InMemoryEvalRunRepository(judge_provider=JsonJudgeProvider('not-json'))
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Judge error run',
            rag_config_id='config-id',
        )
    )

    result = repository.create_result(
        eval_run.id,
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
    response = to_case_result_response(result)
    assert response.judge is None
    assert response.judge_error == 'Judge output was not valid JSON.'

    updated = repository.get(eval_run.id)
    assert updated is not None
    run_response = to_eval_run_response(updated, repository)
    assert run_response.summary.failure_types['judge_error'] == 1


def test_judge_error_is_empty_when_judge_succeeds() -> None:
    repository = InMemoryEvalRunRepository()
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Judge success run',
            rag_config_id='config-id',
        )
    )

    result = repository.create_result(
        eval_run.id,
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
    response = to_case_result_response(result)
    assert response.judge is not None
    assert response.judge_error == ''
