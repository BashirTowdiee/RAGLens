from app.rag_client import CI_DETERMINISTIC_RAG_CONFIG_ID, CI_DETERMINISTIC_SOURCE, StubRagApiClient


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
