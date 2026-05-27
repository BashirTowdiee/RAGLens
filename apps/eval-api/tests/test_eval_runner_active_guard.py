import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.eval_runner import (
    acquire_eval_run_execution,
    release_eval_run_execution,
)
from app.main import app

client = TestClient(app)


def create_eval_run(name: str, dataset_id: str) -> dict:
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


def create_dataset(version: str) -> dict:
    dataset_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'Active Guard Dataset',
            'version': version,
            'description': 'Dataset used to test active eval execution guards.',
        },
    )
    assert dataset_response.status_code == 201
    return dataset_response.json()


def test_acquire_eval_run_execution_rejects_concurrent_execution() -> None:
    eval_run_id = 'active-guard-test-run'
    acquire_eval_run_execution(eval_run_id)

    try:
        with pytest.raises(HTTPException) as exc_info:
            acquire_eval_run_execution(eval_run_id)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == {
            'error': 'eval_run_already_executing',
            'message': 'Eval run is already executing.',
        }
    finally:
        release_eval_run_execution(eval_run_id)


def test_acquire_eval_run_execution_allows_execution_after_release() -> None:
    eval_run_id = 'active-guard-release-test-run'
    acquire_eval_run_execution(eval_run_id)
    release_eval_run_execution(eval_run_id)

    try:
        acquire_eval_run_execution(eval_run_id)
    finally:
        release_eval_run_execution(eval_run_id)


def test_execute_eval_run_releases_active_guard_after_completion() -> None:
    dataset = create_dataset(version='active-guard-release-v1')
    eval_run = create_eval_run('Active guard run', dataset_id=dataset['id'])

    first_response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")
    second_response = client.post(f"/api/v1/eval-runs/{eval_run['id']}/execute")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
