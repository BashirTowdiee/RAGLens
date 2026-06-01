from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_eval_run(name: str, dataset_id: str) -> dict:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': dataset_id,
            'name': name,
            'rag_config_id': 'deterministic',
        },
    )
    assert response.status_code == 201
    return response.json()


def create_dataset_with_test_case(version: str) -> tuple[dict, dict]:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'Retry Failed Runner Dataset',
            'version': version,
            'description': 'Dataset used to test retrying failed eval cases.',
        },
    )
    assert dataset_response.status_code == 201
    dataset = dataset_response.json()

    test_case_response = client.post(
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        json={
            'question': 'What should be retried?',
            'expected_answer': 'Failed cases should be retried.',
            'reference_citations': ['retry-policy.md'],
        },
    )
    assert test_case_response.status_code == 201
    return dataset, test_case_response.json()


def create_failed_result(eval_run_id: str, test_case_id: str) -> dict:
    response = client.post(
        f'/api/v1/eval-runs/{eval_run_id}/results',
        json={
            'test_case_id': test_case_id,
            'question': 'What should be retried?',
            'expected_answer': 'Failed cases should be retried.',
            'status': 'failed',
            'error_message': 'RAG provider failed.',
            'expected_sources': ['retry-policy.md'],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_execute_eval_run_retries_failed_cases_on_rerun() -> None:
    dataset, test_case = create_dataset_with_test_case(version='retry-failed-v1')
    eval_run = create_eval_run('Retry failed run', dataset_id=dataset['id'])
    failed_result = create_failed_result(eval_run['id'], test_case['id'])

    response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert response.status_code == 200
    executed = response.json()
    assert executed['summary']['total_cases'] == 2
    assert executed['summary']['completed_cases'] == 1
    assert executed['summary']['failed_cases'] == 1

    results_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results")

    assert results_response.status_code == 200
    results = results_response.json()['results']
    assert len(results) == 2
    assert {result['id'] for result in results} >= {failed_result['id']}
    assert [result['status'] for result in results].count('completed') == 1
    assert [result['status'] for result in results].count('failed') == 1
    assert {result['test_case_id'] for result in results} == {test_case['id']}
