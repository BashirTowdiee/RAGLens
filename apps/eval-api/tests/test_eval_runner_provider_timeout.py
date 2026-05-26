from app.eval_runner import PROVIDER_TIMEOUT_ERROR_MESSAGE, run_test_case
from app.eval_runs import CreateEvalRunRequest, InMemoryEvalRunRepository
from app.rag_client import RagApiClient, RagProviderTimeoutError


class TimeoutRagClient(RagApiClient):
    def query(self, question: str, rag_config_id: str):
        raise RagProviderTimeoutError(timeout_seconds=5)


def test_runner_stores_provider_timeout_result_when_rag_client_times_out() -> None:
    repository = InMemoryEvalRunRepository()
    eval_run = repository.create(
        CreateEvalRunRequest(dataset_id='dataset-id', name='Timeout run', rag_config_id='config-id')
    )
    test_case = type(
        'TestCase',
        (),
        {
            'id': 'case-id',
            'question': 'Will this timeout?',
            'reference_citations': ['source.md'],
        },
    )()

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
