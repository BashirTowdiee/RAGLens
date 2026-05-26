from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.rag_client import CI_DETERMINISTIC_RAG_CONFIG_ID, CI_DETERMINISTIC_SOURCE


@dataclass(frozen=True)
class CiSmokeRunnerConfig:
    base_url: str
    preset: str
    timeout_seconds: float


def parse_args(argv: list[str]) -> CiSmokeRunnerConfig:
    parser = argparse.ArgumentParser(prog='python -m app.ci_smoke_runner')
    parser.add_argument('--base-url', default='http://localhost:8001')
    parser.add_argument('--preset', default='deterministic-smoke')
    parser.add_argument('--timeout-seconds', type=float, default=30)
    args = parser.parse_args(argv)
    return CiSmokeRunnerConfig(
        base_url=args.base_url.rstrip('/'),
        preset=args.preset,
        timeout_seconds=args.timeout_seconds,
    )


def request_json(
    config: CiSmokeRunnerConfig,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = json.dumps(body).encode('utf-8') if body is not None else None
    request = Request(
        url=f'{config.base_url}{path}',
        data=data,
        headers={'accept': 'application/json', 'content-type': 'application/json'},
        method=method,
    )
    with urlopen(request, timeout=config.timeout_seconds) as response:  # noqa: S310
        return json.loads(response.read().decode('utf-8'))


def run_smoke_eval(config: CiSmokeRunnerConfig) -> dict[str, Any]:
    dataset = request_json(
        config,
        'POST',
        '/api/v1/datasets',
        {
            'name': 'CI deterministic eval dataset',
            'version': 'ci-smoke-v1',
            'description': 'Deterministic CI smoke dataset.',
        },
    )
    question = 'What is the CI deterministic answer?'
    request_json(
        config,
        'POST',
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        {
            'question': question,
            'expected_answer': f'Stub answer for: {question}',
            'reference_citations': [CI_DETERMINISTIC_SOURCE],
        },
    )
    eval_run = request_json(
        config,
        'POST',
        '/api/v1/eval-runs',
        {
            'dataset_id': dataset['id'],
            'name': 'CI deterministic smoke run',
            'rag_config_id': CI_DETERMINISTIC_RAG_CONFIG_ID,
        },
    )
    request_json(config, 'POST', f"/api/v1/eval-runs/{eval_run['id']}/execute")
    return request_json(
        config,
        'POST',
        '/api/v1/ci/evaluate',
        {'eval_run_id': eval_run['id'], 'preset': config.preset},
    )


def main(argv: list[str] | None = None) -> int:
    config = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        response_body = run_smoke_eval(config)
    except HTTPError as error:
        print(f'RAGLens CI smoke runner failed: HTTP {error.code}', file=sys.stderr)
        return 2
    except (URLError, TimeoutError, json.JSONDecodeError, KeyError) as error:
        print(f'RAGLens CI smoke runner failed: {error}', file=sys.stderr)
        return 2

    summary = response_body.get('summary_markdown')
    print(summary if isinstance(summary, str) else response_body.get('status', 'unknown'))
    return 0 if response_body.get('passed') is True else 1


if __name__ == '__main__':
    raise SystemExit(main())
