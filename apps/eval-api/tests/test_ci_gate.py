from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_eval_run(name: str) -> dict:
    response = client.post(
        '/api/v1/eval-runs',
        json={
            'dataset_id': 'ci-gate-dataset',
            'name': name,
            'rag_config_id': 'vector-default',
        },
    )
    assert response.status_code == 201
    return response.json()


def create_result(
    eval_run_id: str,
    *,
    test_case_id: str,
    expected_sources: list[str],
    retrieved_sources: list[str],
    citations: list[str] | None = None,
    expected_answer: str = 'Expected answer.',
    answer: str = 'Expected answer.',
    latency_ms: int = 100,
) -> dict:
    response = client.post(
        f'/api/v1/eval-runs/{eval_run_id}/results',
        json={
            'test_case_id': test_case_id,
            'trace_id': f'trace-{test_case_id}',
            'question': 'What is the policy?',
            'answer': answer,
            'expected_answer': expected_answer,
            'status': 'completed',
            'latency_ms': latency_ms,
            'cost_usd': 0.001,
            'error_message': '',
            'expected_sources': expected_sources,
            'retrieved_sources': retrieved_sources,
            'retrieved_context': ['Expected answer.'],
            'citations': citations if citations is not None else retrieved_sources,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_ci_gate_lists_threshold_presets() -> None:
    response = client.get('/api/v1/ci/threshold-presets')

    assert response.status_code == 200
    preset_names = [preset['name'] for preset in response.json()]
    assert preset_names == ['deterministic-smoke', 'strict-local']


def test_ci_gate_passes_when_metrics_meet_thresholds() -> None:
    eval_run = create_eval_run('Passing CI gate')
    create_result(
        eval_run['id'],
        test_case_id='case-pass-1',
        expected_sources=['refund-policy.md'],
        retrieved_sources=['refund-policy.md'],
        citations=['refund-policy.md'],
        latency_ms=100,
    )
    create_result(
        eval_run['id'],
        test_case_id='case-pass-2',
        expected_sources=['pricing.md'],
        retrieved_sources=['pricing.md'],
        citations=['pricing.md'],
        latency_ms=200,
    )

    response = client.post(
        '/api/v1/ci/evaluate',
        json={
            'eval_run_id': eval_run['id'],
            'thresholds': {
                'min_hit_at_5': 1,
                'min_citation_validity': 1,
                'min_groundedness': 0.8,
                'min_correctness': 0.8,
                'max_average_latency_ms': 300,
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body['eval_run_id'] == eval_run['id']
    assert body['status'] == 'passed'
    assert body['passed'] is True
    assert body['preset'] is None
    assert body['thresholds']['min_hit_at_5'] == 1
    assert body['metrics'] == {
        'pass_rate': 1,
        'hit_at_5_rate': 1,
        'citation_validity': 1,
        'groundedness': 1,
        'correctness': 1,
        'average_latency_ms': 150,
    }
    assert all(result['passed'] for result in body['threshold_results'])
    assert body['summary_markdown'].startswith('# RAGLens CI quality gate: PASSED')
    assert '- preset: custom' in body['summary_markdown']


def test_ci_gate_uses_named_threshold_preset() -> None:
    eval_run = create_eval_run('Preset CI gate')
    create_result(
        eval_run['id'],
        test_case_id='case-preset-1',
        expected_sources=['refund-policy.md'],
        retrieved_sources=['refund-policy.md'],
        citations=['refund-policy.md'],
        latency_ms=100,
    )

    response = client.post(
        '/api/v1/ci/evaluate',
        json={
            'eval_run_id': eval_run['id'],
            'preset': 'deterministic-smoke',
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body['preset'] == 'deterministic-smoke'
    assert body['thresholds']['min_hit_at_5'] == 0.8
    assert body['thresholds']['min_citation_validity'] == 0.95
    assert body['passed'] is True
    assert '- preset: deterministic-smoke' in body['summary_markdown']


def test_ci_gate_fails_when_thresholds_are_missed() -> None:
    eval_run = create_eval_run('Failing CI gate')
    create_result(
        eval_run['id'],
        test_case_id='case-fail-1',
        expected_sources=['refund-policy.md'],
        retrieved_sources=['pricing.md'],
        citations=[],
        expected_answer='Refunds are available.',
        answer='Pricing is fixed.',
        latency_ms=600,
    )

    response = client.post(
        '/api/v1/ci/evaluate',
        json={
            'eval_run_id': eval_run['id'],
            'thresholds': {
                'min_hit_at_5': 1,
                'min_citation_validity': 1,
                'min_groundedness': 0.8,
                'min_correctness': 0.8,
                'max_average_latency_ms': 500,
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'failed'
    assert body['passed'] is False
    threshold_results = {result['metric']: result for result in body['threshold_results']}
    assert threshold_results['hitAt5Rate']['passed'] is False
    assert threshold_results['citationValidity']['passed'] is False
    assert threshold_results['averageLatencyMs']['passed'] is False
    assert body['summary_markdown'].startswith('# RAGLens CI quality gate: FAILED')


def test_ci_gate_returns_not_found_for_missing_eval_run() -> None:
    response = client.post(
        '/api/v1/ci/evaluate',
        json={
            'eval_run_id': 'missing-run',
            'thresholds': {
                'min_hit_at_5': 1,
            },
        },
    )

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'eval_run_not_found',
        'message': 'Eval run was not found.',
    }
