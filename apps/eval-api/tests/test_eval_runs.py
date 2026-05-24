from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_eval_run(name: str = 'Baseline run') -> dict:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'company-kb-eval-v1',
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
