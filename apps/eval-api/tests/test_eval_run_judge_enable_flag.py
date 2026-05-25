from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_eval_run_judge_enabled_defaults_to_true() -> None:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'judge-enabled-default-dataset',
            'name': 'Judge enabled by default',
            'rag_config_id': 'vector-default',
        },
    )

    assert response.status_code == 201
    eval_run = response.json()
    assert eval_run['judge_enabled'] is True


def test_eval_run_can_disable_judge_result_creation() -> None:
    eval_run_response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'judge-disabled-dataset',
            'name': 'Judge disabled run',
            'rag_config_id': 'vector-default',
            'judge_enabled': False,
        },
    )
    assert eval_run_response.status_code == 201
    eval_run = eval_run_response.json()
    assert eval_run['judge_enabled'] is False

    result_response = client.post(
        f"/api/v1/eval-runs/{eval_run['id']}/results",
        json={
            'test_case_id': 'case-refund-window',
            'trace_id': 'trace-refund-window',
            'question': 'What is the refund policy?',
            'answer': 'Customers can request refunds within 30 days.',
            'expected_answer': 'Customers can request refunds within 30 days.',
            'status': 'completed',
            'latency_ms': 342,
            'cost_usd': 0.0012,
            'expected_sources': ['refund-policy.md'],
            'retrieved_context': ['Refund policy: refunds are available within 30 days.'],
            'citations': ['refund-policy.md'],
        },
    )

    assert result_response.status_code == 201
    assert result_response.json()['judge'] is None


def test_eval_run_keeps_judge_result_creation_when_enabled() -> None:
    eval_run_response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'judge-enabled-dataset',
            'name': 'Judge enabled run',
            'rag_config_id': 'vector-default',
            'judge_enabled': True,
        },
    )
    assert eval_run_response.status_code == 201
    eval_run = eval_run_response.json()
    assert eval_run['judge_enabled'] is True

    result_response = client.post(
        f"/api/v1/eval-runs/{eval_run['id']}/results",
        json={
            'test_case_id': 'case-refund-window',
            'trace_id': 'trace-refund-window',
            'question': 'What is the refund policy?',
            'answer': 'Customers can request refunds within 30 days.',
            'expected_answer': 'Customers can request refunds within 30 days.',
            'status': 'completed',
            'latency_ms': 342,
            'cost_usd': 0.0012,
            'expected_sources': ['refund-policy.md'],
            'retrieved_context': ['Refund policy: refunds are available within 30 days.'],
            'citations': ['refund-policy.md'],
        },
    )

    assert result_response.status_code == 201
    assert result_response.json()['judge'] is not None
