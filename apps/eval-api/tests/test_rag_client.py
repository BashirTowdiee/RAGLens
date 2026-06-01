import json

import httpx

from app.rag_client import (
    CI_DETERMINISTIC_RAG_CONFIG_ID,
    CI_DETERMINISTIC_SOURCE,
    HttpRagApiClient,
    RagProviderError,
    RagProviderTimeoutError,
    StubRagApiClient,
)


def test_stub_rag_client_preserves_default_empty_evidence() -> None:
    result = StubRagApiClient().query('What is the refund window?', 'vector-default')

    assert result.answer == 'Stub answer for: What is the refund window?'
    assert result.retrieved_sources == []
    assert result.retrieved_context == []
    assert result.citations == []


def test_stub_rag_client_can_return_deterministic_ci_evidence() -> None:
    result = StubRagApiClient().query('What is the refund window?', CI_DETERMINISTIC_RAG_CONFIG_ID)

    assert result.answer == 'Stub answer for: What is the refund window?'
    assert result.retrieved_sources == [CI_DETERMINISTIC_SOURCE]
    assert result.retrieved_context == ['Stub answer for: What is the refund window?']
    assert result.citations == [CI_DETERMINISTIC_SOURCE]


def make_client(transport: httpx.BaseTransport) -> HttpRagApiClient:
    return HttpRagApiClient(
        base_url='http://rag-api:8000',
        timeout_seconds=1,
        client_factory=lambda timeout: httpx.Client(transport=transport, timeout=timeout),
    )


def test_http_rag_client_maps_successful_query_response() -> None:
    captured_request_headers: dict[str, str] = {}
    captured_request_json: dict[str, object] = {}

    transport = httpx.MockTransport(
        lambda request: (
            captured_request_headers.update(dict(request.headers)),
            captured_request_json.update(json.loads(request.content.decode('utf-8'))),
            httpx.Response(
                200,
                json={
                    'answer': 'Refunds are available for 30 days.',
                    'traceId': 'trace-123',
                    'latencyMs': 42,
                    'citations': [{'sourceId': 'refund-policy.md'}],
                },
            ),
        )[2]
    )

    result = make_client(transport).query(
        'What is the refund window?',
        'vector-default',
        request_id='request-1',
    )

    assert result.trace_id == 'trace-123'
    assert result.answer == 'Refunds are available for 30 days.'
    assert result.latency_ms == 42
    assert result.retrieved_sources == ['refund-policy.md']
    assert captured_request_headers.get('x-request-id') == 'request-1'
    assert captured_request_json['ragConfigId'] == 'vector-default'


def test_http_rag_client_lists_rag_configs() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                'ragConfigs': [
                    {'id': 'deterministic', 'name': 'Deterministic'},
                    {'id': 'local-balanced', 'name': 'Local Balanced'},
                ]
            },
        )
    )

    configs = make_client(transport).list_rag_configs(request_id='request-2')

    assert [config.id for config in configs] == ['deterministic', 'local-balanced']


def test_http_rag_client_maps_timeout_to_timeout_error() -> None:
    transport = httpx.MockTransport(
        lambda request: (_ for _ in ()).throw(httpx.ReadTimeout('boom'))
    )

    try:
        make_client(transport).query('What is the refund window?', 'vector-default')
        raise AssertionError('Expected RagProviderTimeoutError')
    except RagProviderTimeoutError:
        assert True


def test_http_rag_client_rejects_invalid_success_payload() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'answer': 'missing'}))

    try:
        make_client(transport).query('What is the refund window?', 'vector-default')
        raise AssertionError('Expected RagProviderError')
    except RagProviderError as exc:
        assert exc.category == 'invalid_upstream_response'
