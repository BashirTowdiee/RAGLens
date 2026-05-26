from fastapi.testclient import TestClient

from app.main import app
from app.rag_client import CI_DETERMINISTIC_RAG_CONFIG_ID, CI_DETERMINISTIC_SOURCE

client = TestClient(app)


def test_ci_deterministic_eval_execution_can_pass_quality_gate() -> None:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'CI deterministic eval dataset',
            'version': 'v1',
            'description': 'Small deterministic dataset for CI gate smoke tests.',
        },
    )
    assert dataset_response.status_code == 201
    dataset = dataset_response.json()

    test_case_response = client.post(
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        json={
            'question': 'What is the CI deterministic answer?',
            'expected_answer': 'Stub answer for: What is the CI deterministic answer?',
            'reference_citations': [CI_DETERMINISTIC_SOURCE],
        },
    )
    assert test_case_response.status_code == 201

    eval_run_response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': dataset['id'],
            'name': 'CI deterministic smoke run',
            'rag_config_id': CI_DETERMINISTIC_RAG_CONFIG_ID,
        },
    )
    assert eval_run_response.status_code == 201
    eval_run = eval_run_response.json()

    execute_response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert execute_response.status_code == 200
    executed = execute_response.json()
    assert executed['summary']['passed_cases'] == 1
    assert executed['summary']['pass_rate'] == 1
    assert executed['summary']['failure_types'] == {}

    gate_response = client.post(
        '/api/v1/ci/evaluate',
        json={
            'eval_run_id': eval_run['id'],
            'preset': 'deterministic-smoke',
        },
    )

    assert gate_response.status_code == 200
    gate = gate_response.json()
    assert gate['passed'] is True
    assert gate['metrics']['hit_at_5_rate'] == 1
    assert gate['metrics']['citation_validity'] == 1
    assert gate['metrics']['groundedness'] == 1
    assert gate['metrics']['correctness'] == 1
