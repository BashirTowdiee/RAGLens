from fastapi.testclient import TestClient

from app.main import app
from app.scoring import score_case_result

client = TestClient(app)


def test_scores_passing_result_with_valid_retrieval_and_citations() -> None:
    scores = score_case_result(
        expected_sources=['refund-policy.md'],
        retrieved_sources=['refund-policy.md', 'pricing.md'],
        citations=['refund-policy.md'],
        status='completed',
    )

    assert scores.verdict == 'pass'
    assert scores.failure_type == ''
    assert scores.retrieval.hit_at_5 is True
    assert scores.retrieval.hit_at_10 is True
    assert scores.retrieval.recall_at_10 == 1
    assert scores.retrieval.retrieved_expected_sources == ['refund-policy.md']
    assert scores.retrieval.missing_expected_sources == []
    assert scores.citations.citation_present is True
    assert scores.citations.citation_count == 1
    assert scores.citations.citation_validity == 1
    assert scores.citations.invalid_citations == []


def test_scores_retrieval_miss_as_failure() -> None:
    scores = score_case_result(
        expected_sources=['refund-policy.md'],
        retrieved_sources=['pricing.md', 'support.md'],
        citations=['refund-policy.md'],
        status='completed',
    )

    assert scores.verdict == 'fail'
    assert scores.failure_type == 'retrieval_miss'
    assert scores.retrieval.hit_at_5 is False
    assert scores.retrieval.hit_at_10 is False
    assert scores.retrieval.recall_at_10 == 0
    assert scores.retrieval.missing_expected_sources == ['refund-policy.md']


def test_scores_invalid_citation_as_failure() -> None:
    scores = score_case_result(
        expected_sources=['refund-policy.md'],
        retrieved_sources=['refund-policy.md'],
        citations=['pricing.md'],
        status='completed',
    )

    assert scores.verdict == 'fail'
    assert scores.failure_type == 'invalid_citation'
    assert scores.citations.citation_validity == 0
    assert scores.citations.invalid_citations == ['pricing.md']


def test_scores_failed_result_as_provider_error() -> None:
    scores = score_case_result(
        expected_sources=['refund-policy.md'],
        retrieved_sources=[],
        citations=[],
        status='failed',
    )

    assert scores.verdict == 'error'
    assert scores.failure_type == 'provider_error'


def test_deterministic_scoring_endpoint_returns_scores() -> None:
    response = client.post(
        '/api/v1/scoring/deterministic',
        json={
            'expected_sources': ['refund-policy.md'],
            'retrieved_sources': ['refund-policy.md', 'pricing.md'],
            'citations': ['refund-policy.md'],
            'status': 'completed',
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        'retrieval': {
            'hit_at_5': True,
            'hit_at_10': True,
            'recall_at_10': 1,
            'retrieved_expected_sources': ['refund-policy.md'],
            'missing_expected_sources': [],
        },
        'citations': {
            'citation_present': True,
            'citation_count': 1,
            'citation_validity': 1,
            'invalid_citations': [],
        },
        'verdict': 'pass',
        'failure_type': '',
    }
