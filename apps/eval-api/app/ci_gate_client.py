from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class CiGateClientConfig:
    base_url: str
    eval_run_id: str
    preset: str | None
    timeout_seconds: float


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='python -m app.ci_gate_client',
        description='Invoke the RAGLens CI quality gate and exit non-zero on failure.',
    )
    parser.add_argument(
        '--base-url',
        default='http://localhost:8001',
        help='Base URL for eval-api. Defaults to http://localhost:8001.',
    )
    parser.add_argument(
        '--eval-run-id',
        required=True,
        help='Eval run ID to evaluate.',
    )
    parser.add_argument(
        '--preset',
        default='deterministic-smoke',
        help='Named threshold preset to use. Defaults to deterministic-smoke.',
    )
    parser.add_argument(
        '--timeout-seconds',
        type=float,
        default=30,
        help='HTTP timeout in seconds. Defaults to 30.',
    )
    return parser


def parse_args(argv: list[str]) -> CiGateClientConfig:
    args = build_parser().parse_args(argv)
    return CiGateClientConfig(
        base_url=args.base_url.rstrip('/'),
        eval_run_id=args.eval_run_id,
        preset=args.preset,
        timeout_seconds=args.timeout_seconds,
    )


def build_request_body(config: CiGateClientConfig) -> bytes:
    body: dict[str, Any] = {'eval_run_id': config.eval_run_id}
    if config.preset:
        body['preset'] = config.preset
    return json.dumps(body).encode('utf-8')


def evaluate_ci_gate(config: CiGateClientConfig) -> dict[str, Any]:
    request = Request(
        url=f'{config.base_url}/api/v1/ci/evaluate',
        data=build_request_body(config),
        headers={
            'accept': 'application/json',
            'content-type': 'application/json',
        },
        method='POST',
    )

    with urlopen(request, timeout=config.timeout_seconds) as response:  # noqa: S310
        response_body = response.read().decode('utf-8')
        return json.loads(response_body)


def print_gate_summary(response_body: dict[str, Any]) -> None:
    summary = response_body.get('summary_markdown')
    if isinstance(summary, str) and summary:
        print(summary)
        return

    status = response_body.get('status', 'unknown')
    print(f'RAGLens CI quality gate: {status}')


def main(argv: list[str] | None = None) -> int:
    config = parse_args(sys.argv[1:] if argv is None else argv)

    try:
        response_body = evaluate_ci_gate(config)
    except HTTPError as error:
        print(f'RAGLens CI quality gate request failed: HTTP {error.code}', file=sys.stderr)
        return 2
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f'RAGLens CI quality gate request failed: {error}', file=sys.stderr)
        return 2

    print_gate_summary(response_body)
    return 0 if response_body.get('passed') is True else 1


if __name__ == '__main__':
    raise SystemExit(main())
