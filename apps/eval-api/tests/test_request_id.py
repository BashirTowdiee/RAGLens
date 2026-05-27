from fastapi.testclient import TestClient

from app.main import MAX_REQUEST_ID_LENGTH, REQUEST_ID_HEADER, app

client = TestClient(app)


def test_eval_api_adds_generated_request_id_header() -> None:
    response = client.get('/api/v1/health')

    assert response.status_code == 200
    assert response.headers[REQUEST_ID_HEADER]


def test_eval_api_preserves_inbound_request_id_header() -> None:
    response = client.get('/api/v1/health', headers={REQUEST_ID_HEADER: 'request-123'})

    assert response.status_code == 200
    assert response.headers[REQUEST_ID_HEADER] == 'request-123'


def test_eval_api_trims_inbound_request_id_header() -> None:
    response = client.get('/api/v1/health', headers={REQUEST_ID_HEADER: '  request-123  '})

    assert response.status_code == 200
    assert response.headers[REQUEST_ID_HEADER] == 'request-123'


def test_eval_api_replaces_blank_request_id_header() -> None:
    response = client.get('/api/v1/health', headers={REQUEST_ID_HEADER: '   '})

    assert response.status_code == 200
    assert response.headers[REQUEST_ID_HEADER]
    assert response.headers[REQUEST_ID_HEADER] != '   '


def test_eval_api_replaces_oversized_request_id_header() -> None:
    oversized_request_id = 'r' * (MAX_REQUEST_ID_LENGTH + 1)

    response = client.get('/api/v1/health', headers={REQUEST_ID_HEADER: oversized_request_id})

    assert response.status_code == 200
    assert response.headers[REQUEST_ID_HEADER]
    assert response.headers[REQUEST_ID_HEADER] != oversized_request_id
    assert len(response.headers[REQUEST_ID_HEADER]) <= MAX_REQUEST_ID_LENGTH


def test_eval_api_adds_request_id_header_to_error_responses() -> None:
    response = client.get('/api/v1/ci/gate-results/missing-result')

    assert response.status_code == 404
    assert response.headers[REQUEST_ID_HEADER]
    assert response.json()['detail'] == {
        'error': 'ci_gate_result_not_found',
        'message': 'CI gate result was not found.',
    }
