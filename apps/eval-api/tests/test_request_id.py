import logging

from fastapi.testclient import TestClient

from app.main import MAX_REQUEST_ID_LENGTH, REQUEST_ID_HEADER, REQUEST_LOGGER_NAME, app

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


def test_eval_api_logs_structured_request_context(caplog) -> None:
    with caplog.at_level(logging.INFO, logger=REQUEST_LOGGER_NAME):
        response = client.get('/api/v1/health', headers={REQUEST_ID_HEADER: 'request-123'})

    assert response.status_code == 200

    request_logs = [
        record
        for record in caplog.records
        if record.name == REQUEST_LOGGER_NAME and record.message == 'eval_api_request_completed'
    ]
    assert len(request_logs) == 1

    request_log = request_logs[0]
    assert request_log.request_id == 'request-123'
    assert request_log.http_method == 'GET'
    assert request_log.path == '/api/v1/health'
    assert request_log.status_code == 200
