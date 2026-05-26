from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_eval_run(name: str, dataset_id: str = 'comparison-dataset') -> dict:
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


def create_result(
    eval_run_id: str,
    *,
    test_case_id: str,
    expected_sources: list[str],
    retrieved_sources: list[str],
    citations: list[str] | None = None,
    latency_ms: int = 100,
    cost_usd: float = 0.001,
) -> dict:
    response = client.post(
        f'/api/v1/eval-runs/{eval_run_id}/results',
        json={
            'test_case_id': test_case_id,
            'trace_id': f'trace-{test_case_id}',
            'answer': 'Generated answer.',
            'status': 'completed',
            'latency_ms': latency_ms,
            'cost_usd': cost_usd,
            'error_message': '',
            'expected_sources': expected_sources,
            'retrieved_sources': retrieved_sources,
            'citations': citations if citations is not None else retrieved_sources,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_fetch_comparison_with_metric_deltas_and_case_groups() -> None:
    baseline = create_eval_run('Baseline comparison run')
    candidate = create_eval_run('Candidate comparison run')

    baseline_failed = create_result(
        baseline['id'],
        test_case_id='case-improved',
        expected_sources=['refund-policy.md'],
        retrieved_sources=['pricing.md'],
        citations=[],
        latency_ms=300,
        cost_usd=0.003,
    )
    candidate_passed = create_result(
        candidate['id'],
        test_case_id='case-improved',
        expected_sources=['refund-policy.md'],
        retrieved_sources=['refund-policy.md'],
        citations=['refund-policy.md'],
        latency_ms=200,
        cost_usd=0.002,
    )
    baseline_passed = create_result(
        baseline['id'],
        test_case_id='case-regressed',
        expected_sources=['pricing.md'],
        retrieved_sources=['pricing.md'],
        citations=['pricing.md'],
        latency_ms=100,
        cost_usd=0.001,
    )
    candidate_failed = create_result(
        candidate['id'],
        test_case_id='case-regressed',
        expected_sources=['pricing.md'],
        retrieved_sources=['refund-policy.md'],
        citations=[],
        latency_ms=400,
        cost_usd=0.004,
    )

    response = client.post(
        '/api/v1/comparisons',
        json={
            'baseline_eval_run_id': baseline['id'],
            'candidate_eval_run_id': candidate['id'],
        },
    )

    assert response.status_code == 201
    comparison = response.json()
    assert comparison['id']
    assert comparison['dataset_id'] == 'comparison-dataset'
    assert comparison['status'] == 'completed'
    assert comparison['baseline_run']['id'] == baseline['id']
    assert comparison['candidate_run']['id'] == candidate['id']

    deltas = {delta['metric']: delta for delta in comparison['metric_deltas']}
    assert deltas['passRate'] == {'metric': 'passRate', 'baseline': 0.5, 'candidate': 0.5, 'delta': 0}
    assert deltas['hitAt5Rate'] == {'metric': 'hitAt5Rate', 'baseline': 0.5, 'candidate': 0.5, 'delta': 0}
    assert deltas['recallAt10'] == {'metric': 'recallAt10', 'baseline': 0.5, 'candidate': 0.5, 'delta': 0}
    assert deltas['citationValidity'] == {
        'metric': 'citationValidity',
        'baseline': 0.5,
        'candidate': 0.5,
        'delta': 0,
    }
    assert deltas['averageLatencyMs'] == {
        'metric': 'averageLatencyMs',
        'baseline': 200,
        'candidate': 300,
        'delta': 100,
    }
    assert deltas['estimatedCost'] == {
        'metric': 'estimatedCost',
        'baseline': 0.004,
        'candidate': 0.006,
        'delta': 0.002,
    }

    assert comparison['improved_cases'] == [
        {
            'test_case_id': 'case-improved',
            'baseline_result_id': baseline_failed['id'],
            'candidate_result_id': candidate_passed['id'],
            'baseline_verdict': 'fail',
            'candidate_verdict': 'pass',
            'classification': 'improved',
        }
    ]
    assert comparison['regressed_cases'] == [
        {
            'test_case_id': 'case-regressed',
            'baseline_result_id': baseline_passed['id'],
            'candidate_result_id': candidate_failed['id'],
            'baseline_verdict': 'pass',
            'candidate_verdict': 'fail',
            'classification': 'regressed',
        }
    ]

    detail_response = client.get(f"/api/v1/comparisons/{comparison['id']}")

    assert detail_response.status_code == 200
    assert detail_response.json() == comparison


def test_comparison_rejects_dataset_mismatch() -> None:
    baseline = create_eval_run('Mismatch baseline', dataset_id='dataset-a')
    candidate = create_eval_run('Mismatch candidate', dataset_id='dataset-b')

    response = client.post(
        '/api/v1/comparisons',
        json={
            'baseline_eval_run_id': baseline['id'],
            'candidate_eval_run_id': candidate['id'],
        },
    )

    assert response.status_code == 400
    assert response.json()['detail'] == {
        'error': 'dataset_mismatch',
        'message': 'Baseline and candidate eval runs must use the same dataset.',
    }


def test_comparison_returns_not_found_for_missing_run() -> None:
    baseline = create_eval_run('Missing comparison candidate')

    response = client.post(
        '/api/v1/comparisons',
        json={
            'baseline_eval_run_id': baseline['id'],
            'candidate_eval_run_id': 'missing-run',
        },
    )

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'eval_run_not_found',
        'message': 'Baseline or candidate eval run was not found.',
    }


def test_returns_not_found_for_missing_comparison() -> None:
    response = client.get('/api/v1/comparisons/missing-comparison')

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'comparison_not_found',
        'message': 'Eval run comparison was not found.',
    }
