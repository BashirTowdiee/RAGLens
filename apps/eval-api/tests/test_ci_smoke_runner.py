from __future__ import annotations

import json
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
        json_output=None,
        markdown_output=None,
        github_step_summary=None,
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
        json_output=None,
        markdown_output=None,
        github_step_summary=None,
    )


def test_parse_args_accepts_report_outputs(tmp_path) -> None:
    json_output = tmp_path / 'ci-gate.json'
    markdown_output = tmp_path / 'ci-gate.md'
    github_step_summary = tmp_path / 'github-step-summary.md'

    config = ci_smoke_runner.parse_args(
        [
            '--json-output',
            str(json_output),
            '--markdown-output',
            str(markdown_output),
            '--github-step-summary',
            str(github_step_summary),
        ]
    )

    assert config.json_output == json_output
    assert config.markdown_output == markdown_output
    assert config.github_step_summary == github_step_summary


def test_build_ci_dataset_version_generates_unique_v1_versions() -> None:
    versions = {ci_smoke_runner.build_ci_dataset_version() for _ in range(3)}

    assert len(versions) == 3
    assert all(version.startswith('ci-smoke-v1-') for version in versions)


def test_run_smoke_eval_uses_unique_dataset_version(monkeypatch: pytest.MonkeyPatch) -> None:
    bodies: list[dict] = []

    def request_json(
        _: CiSmokeRunnerConfig,
        method: str,
        path: str,
        body: dict | None = None,
    ) -> dict:
        if body is not None:
            bodies.append(body)
        if method == 'POST' and path == '/api/v1/datasets':
            return {'id': 'dataset-1'}
        if method == 'POST' and path == '/api/v1/eval-runs':
            return {'id': 'run-1'}
        if method == 'POST' and path == '/api/v1/ci/evaluate':
            return {'passed': True, 'summary_markdown': '# Passed'}
        return {}

    monkeypatch.setattr(ci_smoke_runner, 'request_json', request_json)
    monkeypatch.setattr(ci_smoke_runner, 'build_ci_dataset_version', lambda: 'ci-smoke-v1-test-run')

    response = ci_smoke_runner.run_smoke_eval(
        CiSmokeRunnerConfig(
            base_url='http://localhost:8001',
            preset='deterministic-smoke',
            timeout_seconds=30,
            json_output=None,
            markdown_output=None,
            github_step_summary=None,
        )
    )

    assert response == {'passed': True, 'summary_markdown': '# Passed'}
    assert bodies[0]['version'] == 'ci-smoke-v1-test-run'


def test_write_report_artifacts_writes_json_markdown_and_step_summary(tmp_path) -> None:
    json_output = tmp_path / 'reports' / 'ci-gate.json'
    markdown_output = tmp_path / 'reports' / 'ci-gate.md'
    github_step_summary = tmp_path / 'summaries' / 'step-summary.md'
    response_body = {
        'passed': True,
        'status': 'passed',
        'summary_markdown': '# RAGLens CI quality gate: PASSED',
    }

    ci_smoke_runner.write_report_artifacts(
        CiSmokeRunnerConfig(
            base_url='http://localhost:8001',
            preset='deterministic-smoke',
            timeout_seconds=30,
            json_output=json_output,
            markdown_output=markdown_output,
            github_step_summary=github_step_summary,
        ),
        response_body,
    )

    assert json.loads(json_output.read_text(encoding='utf-8')) == response_body
    assert markdown_output.read_text(encoding='utf-8') == '# RAGLens CI quality gate: PASSED\n'
    assert github_step_summary.read_text(encoding='utf-8') == '# RAGLens CI quality gate: PASSED\n'


def test_write_report_artifacts_appends_to_existing_step_summary(tmp_path) -> None:
    github_step_summary = tmp_path / 'step-summary.md'
    github_step_summary.write_text('# Existing summary\n\n', encoding='utf-8')

    ci_smoke_runner.write_report_artifacts(
        CiSmokeRunnerConfig(
            base_url='http://localhost:8001',
            preset='deterministic-smoke',
            timeout_seconds=30,
            json_output=None,
            markdown_output=None,
            github_step_summary=github_step_summary,
        ),
        {
            'passed': False,
            'status': 'failed',
            'summary_markdown': '# RAGLens CI quality gate: FAILED',
        },
    )

    assert github_step_summary.read_text(encoding='utf-8') == (
        '# Existing summary\n\n# RAGLens CI quality gate: FAILED\n'
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
