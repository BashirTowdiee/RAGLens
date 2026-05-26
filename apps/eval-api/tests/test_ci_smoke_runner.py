from __future__ import annotations

from urllib.error import HTTPError, URLError

import pytest

from app import ci_smoke_runner
from app.ci_smoke_runner import CiSmokeRunnerConfig


def test_parse_args_uses_defaults() -> None:
    config = ci_smoke_runner.parse_args([])

    assert config == CiSmokeRunnerConfig(
        base_url='http://localhost:8001',
        preset='deterministic-smoke',
        timeout_seconds=30,
    )


def test_parse_args_trims_base_url() -> None:
    config = ci_smoke_runner.parse_args(
        [
            '--base-url',
            'http://eval-api:8001/',
            '--preset',
            'strict-local',
            '--timeout-seconds',
            '5',
        ]
    )

    assert config == CiSmokeRunnerConfig(
        base_url='http://eval-api:8001',
        preset='strict-local',
        timeout_seconds=5,
    )


def test_main_returns_success_for_passing_gate(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    def run_smoke_eval(_: CiSmokeRunnerConfig) -> dict:
        return {
            'passed': True,
            'summary_markdown': '# RAGLens CI quality gate: PASSED',
        }

    monkeypatch.setattr(ci_smoke_runner, 'run_smoke_eval', run_smoke_eval)

    exit_code = ci_smoke_runner.main([])

    assert exit_code == 0
    assert '# RAGLens CI quality gate: PASSED' in capsys.readouterr().out


def test_main_returns_failure_for_failing_gate(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    def run_smoke_eval(_: CiSmokeRunnerConfig) -> dict:
        return {
            'passed': False,
            'summary_markdown': '# RAGLens CI quality gate: FAILED',
        }

    monkeypatch.setattr(ci_smoke_runner, 'run_smoke_eval', run_smoke_eval)

    exit_code = ci_smoke_runner.main([])

    assert exit_code == 1
    assert '# RAGLens CI quality gate: FAILED' in capsys.readouterr().out


def test_main_returns_request_error_for_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def run_smoke_eval(_: CiSmokeRunnerConfig) -> dict:
        raise HTTPError(
            url='http://localhost:8001/api/v1/datasets',
            code=409,
            msg='duplicate',
            hdrs=None,
            fp=None,
        )

    monkeypatch.setattr(ci_smoke_runner, 'run_smoke_eval', run_smoke_eval)

    assert ci_smoke_runner.main([]) == 2


def test_main_returns_request_error_for_url_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def run_smoke_eval(_: CiSmokeRunnerConfig) -> dict:
        raise URLError('connection refused')

    monkeypatch.setattr(ci_smoke_runner, 'run_smoke_eval', run_smoke_eval)

    assert ci_smoke_runner.main([]) == 2
