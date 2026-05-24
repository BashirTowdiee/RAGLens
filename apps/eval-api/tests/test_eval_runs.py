from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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
