from fastapi.testclient import TestClient

from app.eval_runner import run_test_case
from app.eval_runs import CreateEvalRunRequest, InMemoryEvalRunRepository
from app.main import app
from app.rag_client import RagApiClient

client = TestClient(app)


def create_eval_run(name: str = 'Baseline run', dataset_id: str = 'company-kb-eval-v1') -> dict:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': dataset_id,
            'name': name,
            'rag_config_id': 'vector-default',
        },
    )
    assert response.status_code == 201
    return response.json()


def create_case_result(eval_run_id: str, status: str = 'completed') -> dict:
    response = client.post(
        f'/api/v1/eval-runs/{eval_run_id}/results',
        json={
            'test_case_id': 'case-refund-window',
            'trace_id': 'trace-refund-window',
            'answer': 'Customers can request refunds within 30 days.',
            'status': status,
            'latency_ms': 342,
            'cost_usd': 0.0012,
            'error_message': 'RAG API timeout' if status == 'failed' else '',
        },
    )
    assert response.status_code == 201
    return response.json()


def create_dataset_with_test_case() -> tuple[dict, dict]:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'Runner Dataset',
            'version': 'v1',
            'description': 'Dataset used by the sequential eval runner.',
        },
    )
    assert dataset_response.status_code == 201
    dataset = dataset_response.json()

    test_case_response = client.post(
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        json={
            'question': 'What is the refund window?',
            'expected_answer': 'Customers can request refunds within 30 days.',
            'reference_citations': ['refund-policy.md'],
        },
    )
    assert test_case_response.status_code == 201
    return dataset, test_case_response.json()


def test_create_and_fetch_eval_run() -> None:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'company-kb-eval-v1',
            'name': 'Baseline run',
            'rag_config_id': 'vector-default',
        },
    )

    assert response.status_code == 201
    eval_run = response.json()
    assert eval_run['id']
    assert eval_run['dataset_id'] == 'company-kb-eval-v1'
    assert eval_run['name'] == 'Baseline run'
    assert eval_run['rag_config_id'] == 'vector-default'
    assert eval_run['status'] == 'queued'
    assert eval_run['summary'] == {
        'total_cases': 0,
        'completed_cases': 0,
        'failed_cases': 0,
    }
    assert eval_run['created_at']
    assert eval_run['updated_at']

    detail_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}")

    assert detail_response.status_code == 200
    assert detail_response.json() == eval_run


def test_list_eval_runs_contains_created_eval_run() -> None:
    create_response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'company-kb-eval-v1',
            'name': 'Candidate run',
            'rag_config_id': 'vector-topk-12',
        },
    )
    eval_run = create_response.json()

    response = client.get('/api/v1/eval-runs')

    assert response.status_code == 200
    assert eval_run in response.json()['eval_runs']


def test_returns_not_found_for_missing_eval_run() -> None:
    response = client.get('/api/v1/eval-runs/missing-run')

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'eval_run_not_found',
        'message': 'Eval run was not found.',
    }


def test_rejects_invalid_eval_run_request() -> None:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': '',
            'name': 'Invalid run',
            'rag_config_id': '',
        },
    )

    assert response.status_code == 422


def test_create_and_fetch_eval_case_result() -> None:
    eval_run = create_eval_run('Result detail run')

    result = create_case_result(eval_run['id'])

    assert result['id']
    assert result['eval_run_id'] == eval_run['id']
    assert result['test_case_id'] == 'case-refund-window'
    assert result['trace_id'] == 'trace-refund-window'
    assert result['answer'] == 'Customers can request refunds within 30 days.'
    assert result['status'] == 'completed'
    assert result['latency_ms'] == 342
    assert result['cost_usd'] == 0.0012
    assert result['error_message'] == ''
    assert result['created_at']

    detail_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results/{result['id']}")

    assert detail_response.status_code == 200
    assert detail_response.json() == result


def test_list_eval_case_results_contains_created_result() -> None:
    eval_run = create_eval_run('Result list run')
    result = create_case_result(eval_run['id'])

    response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results")

    assert response.status_code == 200
    assert result in response.json()['results']


def test_case_result_updates_eval_run_summary() -> None:
    eval_run = create_eval_run('Summary run')

    create_case_result(eval_run['id'], status='completed')
    create_case_result(eval_run['id'], status='failed')

    detail_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}")

    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail['status'] == 'completed'
    assert detail['summary'] == {
        'total_cases': 2,
        'completed_cases': 1,
        'failed_cases': 1,
    }


def test_returns_not_found_when_creating_result_for_missing_eval_run() -> None:
    response = client.post(
        '/api/v1/eval-runs/missing-run/results',
        json={
            'test_case_id': 'case-refund-window',
            'trace_id': 'trace-refund-window',
            'answer': 'This should not be stored.',
            'status': 'completed',
            'latency_ms': 10,
            'cost_usd': 0,
            'error_message': '',
        },
    )

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'eval_run_not_found',
        'message': 'Eval run was not found.',
    }


def test_returns_not_found_for_missing_case_result() -> None:
    eval_run = create_eval_run('Missing result run')

    response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results/missing-result")

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'case_result_not_found',
        'message': 'Eval case result was not found.',
    }


def test_execute_eval_run_calls_stub_rag_client_and_stores_result() -> None:
    dataset, test_case = create_dataset_with_test_case()
    eval_run = create_eval_run('Executed run', dataset_id=dataset['id'])

    response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert response.status_code == 200
    executed = response.json()
    assert executed['status'] == 'completed'
    assert executed['summary'] == {
        'total_cases': 1,
        'completed_cases': 1,
        'failed_cases': 0,
    }

    results_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results")

    assert results_response.status_code == 200
    results = results_response.json()['results']
    assert len(results) == 1
    assert results[0]['test_case_id'] == test_case['id']
    assert results[0]['status'] == 'completed'
    assert results[0]['trace_id'].startswith('stub-')
    assert results[0]['answer'] == 'Stub answer for: What is the refund window?'


def test_execute_eval_run_returns_not_found_for_missing_dataset() -> None:
    eval_run = create_eval_run('Missing dataset run', dataset_id='missing-dataset')

    response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'dataset_not_found',
        'message': 'Dataset was not found.',
    }


def test_runner_stores_error_result_when_rag_client_fails() -> None:
    class FailingRagClient(RagApiClient):
        def query(self, question: str, rag_config_id: str):
            raise RuntimeError('RAG API timeout')

    repository = InMemoryEvalRunRepository()
    eval_run = repository.create(
        CreateEvalRunRequest(dataset_id='dataset-id', name='Failure run', rag_config_id='config-id')
    )
    test_case = type(
        'TestCase',
        (),
        {'id': 'case-id', 'question': 'Will this timeout?'},
    )()

    run_test_case(repository, FailingRagClient(), eval_run.id, eval_run.rag_config_id, test_case)

    results = repository.list_results(eval_run.id)
    assert results is not None
    assert len(results) == 1
    assert results[0].status == 'failed'
    assert results[0].error_message == 'RAG API timeout'

    updated = repository.get(eval_run.id)
    assert updated is not None
    assert updated.failed_cases == 1
