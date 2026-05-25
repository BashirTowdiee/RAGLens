from app.datasets import TestCaseRecord
from app.eval_runner import run_test_case
from app.eval_runs import CreateEvalRunRequest, InMemoryEvalRunRepository
from app.rag_client import RagApiClient, RagQueryResult


class MatchingRagClient(RagApiClient):
    def query(self, question: str, rag_config_id: str) -> RagQueryResult:
        return RagQueryResult(
            trace_id='trace-one',
            answer='Alpha answer.',
            latency_ms=10,
            cost_usd=0,
            retrieved_sources=['alpha.md'],
            retrieved_context=['Alpha answer.'],
            citations=['alpha.md'],
        )


def test_runner_passes_case_and_rag_fields_to_judge() -> None:
    repository = InMemoryEvalRunRepository()
    eval_run = repository.create(
        CreateEvalRunRequest(
            dataset_id='dataset-id',
            name='Judge runner run',
            rag_config_id='config-id',
        )
    )
    test_case = TestCaseRecord(
        id='case-one',
        dataset_id='dataset-id',
        question='What is alpha?',
        expected_answer='Alpha answer.',
        reference_citations=['alpha.md'],
        created_at='2026-05-26T00:00:00+00:00',
    )

    run_test_case(
        repository,
        MatchingRagClient(),
        eval_run.id,
        eval_run.rag_config_id,
        test_case,
    )

    results = repository.list_results(eval_run.id)
    assert results is not None
    assert len(results) == 1
    result = results[0]
    assert result.question == 'What is alpha?'
    assert result.expected_answer == 'Alpha answer.'
    assert result.scores.verdict == 'pass'
    assert result.judge is not None
    assert result.judge.verdict == 'pass'
    assert result.judge.scores.correctness == 1
    assert result.judge.scores.citation_support == 1
