from app.eval_runner import PROVIDER_TIMEOUT_ERROR_MESSAGE, run_test_case
from app.eval_runs import CreateEvalRunRequest, InMemoryEvalRunRepository
from app.rag_client import (
    RagApiClient,
    RagProviderError,
    RagProviderRetryPolicy,
    RagProviderTimeoutError,
    RagQueryResult,
)


class TimeoutRagClient(RagApiClient):
    def query(self, question: str, rag_config_id: str):
        raise RagProviderTimeoutError(timeout_seconds=5)


class FlakyRagClient(RagApiClient):
    def __init__(self) -> None:
        self.calls = 0

    def query(self, question: str, rag_config_id: str):
        self.calls += 1
        if self.calls == 1:
            raise RagProviderError('temporary provider overload', retryable=True)
        return RagQueryResult(
            trace_id='trace-id',
            answer='Recovered answer',
            latency_ms=25,
            cost_usd=0.01,
            retrieved_sources=['source.md'],
            retrieved_context=['Recovered answer'],
            citations=['source.md'],
        )


class ExhaustedRetryRagClient(RagApiClient):
    def __init__(self) -> None:
        self.calls = 0

    def query(self, question: str, rag_config_id: str):
        self.calls += 1
        raise RagProviderError('temporary provider overload', retryable=True)


class NonRetryableRagClient(RagApiClient):
    def __init__(self) -> None:
        self.calls = 0

    def query(self, question: str, rag_config_id: str):
        self.calls += 1
        raise RagProviderError('invalid provider credentials', retryable=False)


def make_eval_run():
    repository = InMemoryEvalRunRepository()
    eval_run = repository.create(
        CreateEvalRunRequest(dataset_id='dataset-id', name='Provider run', rag_config_id='config-id')
    )
    test_case = type(
        'TestCase',
        (),
        {
            'id': 'case-id',
            'question': 'Will this timeout?',
            'expected_answer': 'Recovered answer',
            'reference_citations': ['source.md'],
        },
    )()
    return repository, eval_run, test_case


def test_runner_stores_provider_timeout_result_when_rag_client_times_out() -> None:
    repository, eval_run, test_case = make_eval_run()

    run_test_case(repository, TimeoutRagClient(), eval_run.id, eval_run.rag_config_id, test_case)

    results = repository.list_results(eval_run.id)
    assert results is not None
    assert len(results) == 1
    assert results[0].status == 'failed'
    assert results[0].error_message == PROVIDER_TIMEOUT_ERROR_MESSAGE
    assert results[0].scores.failure_type == 'provider_error'

    updated = repository.get(eval_run.id)
    assert updated is not None
    assert updated.failed_cases == 1
    assert updated.status == 'completed'


def test_runner_retries_retryable_provider_error_before_storing_result() -> None:
    repository, eval_run, test_case = make_eval_run()
    rag_client = FlakyRagClient()

    run_test_case(
        repository,
        rag_client,
        eval_run.id,
        eval_run.rag_config_id,
        test_case,
        retry_policy=RagProviderRetryPolicy(max_attempts=2),
    )

    results = repository.list_results(eval_run.id)
    assert results is not None
    assert rag_client.calls == 2
    assert results[0].status == 'completed'
    assert results[0].answer == 'Recovered answer'
    assert results[0].error_message == ''


def test_runner_stores_retryable_provider_error_after_attempts_are_exhausted() -> None:
    repository, eval_run, test_case = make_eval_run()
    rag_client = ExhaustedRetryRagClient()

    run_test_case(
        repository,
        rag_client,
        eval_run.id,
        eval_run.rag_config_id,
        test_case,
        retry_policy=RagProviderRetryPolicy(max_attempts=3),
    )

    results = repository.list_results(eval_run.id)
    assert results is not None
    assert rag_client.calls == 3
    assert results[0].status == 'failed'
    assert results[0].error_message == 'temporary provider overload'
    assert results[0].scores.failure_type == 'provider_error'


def test_runner_does_not_retry_non_retryable_provider_error() -> None:
    repository, eval_run, test_case = make_eval_run()
    rag_client = NonRetryableRagClient()

    run_test_case(
        repository,
        rag_client,
        eval_run.id,
        eval_run.rag_config_id,
        test_case,
        retry_policy=RagProviderRetryPolicy(max_attempts=3),
    )

    results = repository.list_results(eval_run.id)
    assert results is not None
    assert rag_client.calls == 1
    assert results[0].status == 'failed'
    assert results[0].error_message == 'invalid provider credentials'
    assert results[0].scores.failure_type == 'provider_error'
