from fastapi.testclient import TestClient

from app.eval_runner import MAX_EXECUTE_REQUESTS_PER_RUN
from app.main import app

client = TestClient(app)


def create_eval_run(name: str, dataset_id: str) -> dict:
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


def create_dataset_with_test_case(version: str) -> tuple[dict, dict]:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'Rate Limited Runner Dataset',
            'version': version,
            'description': 'Dataset used to test eval execute rate limiting.',
        },
    )
    assert dataset_response.status_code == 201
    dataset = dataset_response.json()

    test_case_response = client.post(
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        json={
            'question': 'What should be rate limited?',
            'expected_answer': 'Repeated execute requests should be rate limited.',
            'reference_citations': ['rate-limit-policy.md'],
        },
    )
    assert test_case_response.status_code == 201
    return dataset, test_case_response.json()


def test_execute_eval_run_is_rate_limited_per_eval_run() -> None:
    dataset, _ = create_dataset_with_test_case(version='execute-rate-limit-v1')
    eval_run = create_eval_run('Rate limited run', dataset_id=dataset['id'])

    for _ in range(MAX_EXECUTE_REQUESTS_PER_RUN):
        response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")
        assert response.status_code == 200

    limited_response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert limited_response.status_code == 429
    assert limited_response.json()['detail'] == {
        'error': 'eval_run_execute_rate_limited',
        'message': 'Eval run execute request limit exceeded.',
    }
