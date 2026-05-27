from fastapi.testclient import TestClient

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


def create_dataset_with_test_cases(case_count: int, version: str) -> tuple[dict, list[dict]]:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'Cost Limited Runner Dataset',
            'version': version,
            'description': 'Dataset used to test maxCostUsd execution bounds.',
        },
    )
    assert dataset_response.status_code == 201
    dataset = dataset_response.json()

    test_cases = []
    for index in range(case_count):
        test_case_response = client.post(
            f"/api/v1/datasets/{dataset['id']}/test-cases",
            json={
                'question': f'What is cost-limited policy item {index}?',
                'expected_answer': f'Cost-limited policy item {index} answer.',
                'reference_citations': [f'cost-policy-{index}.md'],
            },
        )
        assert test_case_response.status_code == 201
        test_cases.append(test_case_response.json())

    return dataset, test_cases


def test_execute_eval_run_respects_zero_cost_limit() -> None:
    dataset, _ = create_dataset_with_test_cases(case_count=2, version='max-cost-zero-v1')
    eval_run = create_eval_run('Zero cost limited run', dataset_id=dataset['id'])

    response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute?maxCostUsd=0")

    assert response.status_code == 200
    executed = response.json()
    assert executed['status'] == 'queued'
    assert executed['summary']['total_cases'] == 0
    assert executed['summary']['completed_cases'] == 0
    assert executed['summary']['failed_cases'] == 0

    results_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results")

    assert results_response.status_code == 200
    assert results_response.json()['results'] == []


def test_execute_eval_run_rejects_negative_cost_limit() -> None:
    dataset, _ = create_dataset_with_test_cases(case_count=1, version='max-cost-invalid-v1')
    eval_run = create_eval_run('Invalid cost limited run', dataset_id=dataset['id'])

    response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute?maxCostUsd=-0.01")

    assert response.status_code == 422

    results_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results")

    assert results_response.status_code == 200
    assert results_response.json()['results'] == []
