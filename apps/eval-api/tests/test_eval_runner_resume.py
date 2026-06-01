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


def create_dataset_with_test_cases(case_count: int, version: str) -> tuple[dict, list[dict]]:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'Resumable Runner Dataset',
            'version': version,
            'description': 'Dataset used to test resumable eval execution.',
        },
    )
    assert dataset_response.status_code == 201
    dataset = dataset_response.json()

    test_cases = []
    for index in range(case_count):
        test_case_response = client.post(
            f"/api/v1/datasets/{dataset['id']}/test-cases",
            json={
                'question': f'What is resumable policy item {index}?',
                'expected_answer': f'Resumable policy item {index} answer.',
                'reference_citations': [f'resumable-policy-{index}.md'],
            },
        )
        assert test_case_response.status_code == 201
        test_cases.append(test_case_response.json())

    return dataset, test_cases


def test_execute_eval_run_skips_completed_cases_on_rerun() -> None:
    dataset, test_cases = create_dataset_with_test_cases(case_count=3, version='resume-rerun-v1')
    eval_run = create_eval_run('Resumable run', dataset_id=dataset['id'])

    first_response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute?maxCases=2")

    assert first_response.status_code == 200
    first_execution = first_response.json()
    assert first_execution['summary']['total_cases'] == 2
    assert first_execution['summary']['completed_cases'] == 2

    second_response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert second_response.status_code == 200
    second_execution = second_response.json()
    assert second_execution['summary']['total_cases'] == 3
    assert second_execution['summary']['completed_cases'] == 3

    results_response = client.get(f"/api/v1/eval-runs/{eval_run['id']}/results")

    assert results_response.status_code == 200
    results = results_response.json()['results']
    assert len(results) == 3
    assert {result['test_case_id'] for result in results} == {
        test_cases[0]['id'],
        test_cases[1]['id'],
        test_cases[2]['id'],
    }
