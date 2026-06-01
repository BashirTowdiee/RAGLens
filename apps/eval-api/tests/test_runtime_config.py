from fastapi.testclient import TestClient

from app.main import app


def test_runtime_config_endpoint_returns_eval_runtime_sections() -> None:
    client = TestClient(app)

    response = client.get('/api/v1/runtime-config')

    assert response.status_code == 200
    body = response.json()
    assert body['service'] == 'eval-api'
    assert body['persistence'] == 'in-memory'
    assert body['restartRequired'] is False
    assert isinstance(body['sections'], list)
    assert len(body['sections']) > 0


def test_runtime_config_update_applies_values() -> None:
    client = TestClient(app)

    update_response = client.put(
        '/api/v1/runtime-config',
        json={
            'plainValues': {
                'RAG_CLIENT_MODE': 'stub',
                'RAG_API_TIMEOUT_SECONDS': '6',
                'RAG_API_MAX_RETRIES': '1',
            }
        },
    )

    assert update_response.status_code == 200
    body = update_response.json()
    field_map = {
        field['key']: field
        for section in body['sections']
        for field in section['fields']
    }
    assert field_map['RAG_CLIENT_MODE']['value'] == 'stub'
    assert field_map['RAG_API_TIMEOUT_SECONDS']['value'] == '6.0'
    assert field_map['RAG_API_MAX_RETRIES']['value'] == '1'


def test_runtime_config_update_rejects_invalid_values() -> None:
    client = TestClient(app)

    response = client.put(
        '/api/v1/runtime-config',
        json={
            'plainValues': {
                'RAG_CLIENT_MODE': 'invalid-mode',
            }
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body['detail']['error'] == 'invalid_runtime_config_values'
    assert body['detail']['requestId']
