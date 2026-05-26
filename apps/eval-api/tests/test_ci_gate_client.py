from __future__ import annotations

import json
from urllib.error import HTTPError, URLError

import pytest

from app import ci_gate_client
from app.ci_gate_client import CiGateClientConfig


def test_parse_args_uses_defaults() -> None:
    config = ci_gate_client.parse_args(['--eval-run-id', 'run-123'])

    assert config == CiGateClientConfig(
        base_url='http://localhost:8001',
        eval_run_id='run-123',
        preset='deterministic-smoke',
        timeout_seconds=30,
    )


def test_parse_args_trims_base_url() -> None:
    config = ci_gate_client.parse_args(
        [
            '--base-url',
            'http://eval-api:8001/',
            '--eval-run-id',
            'run-123',
            '--preset',
            'strict-local',
            '--timeout-seconds',
            '5',
        ]
    )

    assert config == CiGateClientConfig(
        base_url='http://eval-api:8001',
        eval_run_id='run-123',
        preset='strict-local',
        timeout_seconds=5,
    )


def test_build_request_body_includes_preset() -> None:
    body = ci_gate_client.build_request_body(
        CiGateClientConfig(
            base_url='http://localhost:8001',
            eval_run_id='run-123',
            preset='strict-local',
            timeout_seconds=30,
        )
    )

    assert json.loads(body.decode('utf-8')) == {
        'eval_run_id': 'run-123',
        'preset': 'strict-local',
    }


def test_main_returns_success_for_passing_gate(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    def evaluate_ci_gate(_: CiGateClientConfig) -> dict:
        return {
            'passed': True,
            'summary_markdown': '# RAGLens CI quality gate: PASSED',
        }

    monkeypatch.setattr(ci_gate_client, 'evaluate_ci_gate', evaluate_ci_gate)

    exit_code = ci_gate_client.main(['--eval-run-id', 'run-123'])

    assert exit_code == 0
    assert '# RAGLens CI quality gate: PASSED' in capsys.readouterr().out


def test_main_returns_failure_for_failing_gate(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    def evaluate_ci_gate(_: CiGateClientConfig) -> dict:
        return {
            'passed': False,
            'summary_markdown': '# RAGLens CI quality gate: FAILED',
        }

    monkeypatch.setattr(ci_gate_client, 'evaluate_ci_gate', evaluate_ci_gate)

    exit_code = ci_gate_client.main(['--eval-run-id', 'run-123'])

    assert exit_code == 1
    assert '# RAGLens CI quality gate: FAILED' in capsys.readouterr().out


def test_main_returns_request_error_for_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def evaluate_ci_gate(_: CiGateClientConfig) -> dict:
        raise HTTPError(url='http://localhost:8001/api/v1/ci/evaluate', code=404, msg='not found', hdrs=None, fp=None)

    monkeypatch.setattr(ci_gate_client, 'evaluate_ci_gate', evaluate_ci_gate)

    assert ci_gate_client.main(['--eval-run-id', 'missing-run']) == 2


def test_main_returns_request_error_for_url_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def evaluate_ci_gate(_: CiGateClientConfig) -> dict:
        raise URLError('connection refused')

    monkeypatch.setattr(ci_gate_client, 'evaluate_ci_gate', evaluate_ci_gate)

    assert ci_gate_client.main(['--eval-run-id', 'run-123']) == 2
