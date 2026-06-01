from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from uuid import uuid4

import httpx

CI_DETERMINISTIC_RAG_CONFIG_ID = 'ci-deterministic'
CI_DETERMINISTIC_SOURCE = 'ci-smoke.md'


@dataclass(frozen=True)
class RagQueryResult:
    trace_id: str
    answer: str
    latency_ms: int
    cost_usd: float
    retrieved_sources: list[str] = field(default_factory=list)
    retrieved_context: list[str] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RagConfigRecord:
    id: str
    name: str


@dataclass(frozen=True)
class RagProviderRetryPolicy:
    max_attempts: int = 2

    def attempts(self) -> int:
        return max(1, self.max_attempts)


class RagClientError(Exception):
    pass


class RagProviderError(RagClientError):
    def __init__(
        self,
        message: str,
        *,
        retryable: bool = False,
        category: str = 'upstream_unavailable',
    ) -> None:
        self.retryable = retryable
        self.category = category
        super().__init__(message)


class RagProviderTimeoutError(RagProviderError):
    def __init__(self, timeout_seconds: float | None = None) -> None:
        self.timeout_seconds = timeout_seconds
        if timeout_seconds is None:
            message = 'RAG provider request timed out.'
        else:
            message = f'RAG provider request timed out after {timeout_seconds:g}s.'
        super().__init__(message, retryable=True, category='timeout')


class RagApiClient:
    def query(
        self,
        question: str,
        rag_config_id: str,
        request_id: str | None = None,
    ) -> RagQueryResult:
        raise NotImplementedError

    def list_rag_configs(self, request_id: str | None = None) -> list[RagConfigRecord]:
        raise NotImplementedError


class StubRagApiClient(RagApiClient):
    def query(
        self,
        question: str,
        rag_config_id: str,
        request_id: str | None = None,
    ) -> RagQueryResult:
        del request_id
        answer = f'Stub answer for: {question}'
        if rag_config_id == CI_DETERMINISTIC_RAG_CONFIG_ID:
            return RagQueryResult(
                trace_id=f'stub-{uuid4()}',
                answer=answer,
                latency_ms=0,
                cost_usd=0,
                retrieved_sources=[CI_DETERMINISTIC_SOURCE],
                retrieved_context=[answer],
                citations=[CI_DETERMINISTIC_SOURCE],
            )

        return RagQueryResult(
            trace_id=f'stub-{uuid4()}',
            answer=answer,
            latency_ms=0,
            cost_usd=0,
        )

    def list_rag_configs(self, request_id: str | None = None) -> list[RagConfigRecord]:
        del request_id
        return [
            RagConfigRecord(id='deterministic', name='Deterministic'),
            RagConfigRecord(id='local-balanced', name='Local Balanced (Ollama qwen3:8b)'),
            RagConfigRecord(id='cloud-baseline', name='Cloud Baseline (OpenAI gpt-4.1-mini)'),
            RagConfigRecord(id=CI_DETERMINISTIC_RAG_CONFIG_ID, name='CI Deterministic'),
        ]


class HttpRagApiClient(RagApiClient):
    def __init__(
        self,
        *,
        base_url: str,
        timeout_seconds: float = 10,
        client_factory: Callable[[float], httpx.Client] = httpx.Client,
    ) -> None:
        self._base_url = base_url.rstrip('/')
        self._timeout_seconds = timeout_seconds
        self._client_factory = client_factory

    def query(
        self,
        question: str,
        rag_config_id: str,
        request_id: str | None = None,
    ) -> RagQueryResult:
        headers: dict[str, str] = {}
        if request_id:
            headers['x-request-id'] = request_id

        try:
            with self._client_factory(timeout=self._timeout_seconds) as client:
                response = client.post(
                    f'{self._base_url}/api/v1/query',
                    json={'question': question, 'ragConfigId': rag_config_id},
                    headers=headers,
                )
        except httpx.TimeoutException as exc:
            raise RagProviderTimeoutError(self._timeout_seconds) from exc
        except httpx.HTTPError as exc:
            raise RagProviderError(
                'RAG provider is unavailable.',
                retryable=True,
                category='upstream_unavailable',
            ) from exc

        if response.status_code >= 400:
            body = parse_json_body(response)
            if isinstance(body, dict):
                retryable = bool(body.get('retryable', response.status_code >= 500))
                message = str(body.get('message') or 'RAG provider is unavailable.')
                category = (
                    'invalid_upstream_response'
                    if str(body.get('error', '')) == 'rag_config_not_found'
                    else 'upstream_unavailable'
                )
            else:
                retryable = response.status_code >= 500
                message = 'RAG provider is unavailable.'
                category = 'upstream_unavailable'

            raise RagProviderError(
                message,
                retryable=retryable,
                category=category,
            )

        body = parse_json_body(response)
        if not isinstance(body, dict):
            raise RagProviderError(
                'RAG provider returned an invalid response.',
                retryable=False,
                category='invalid_upstream_response',
            )

        answer = body.get('answer')
        trace_id = body.get('traceId')
        latency_ms = body.get('latencyMs')
        citations = body.get('citations', [])

        if not isinstance(answer, str) or not isinstance(trace_id, str) or not isinstance(
            latency_ms, int
        ):
            raise RagProviderError(
                'RAG provider returned an invalid response.',
                retryable=False,
                category='invalid_upstream_response',
            )

        retrieved_sources = citations_to_sources(citations)

        return RagQueryResult(
            trace_id=trace_id,
            answer=answer,
            latency_ms=latency_ms,
            cost_usd=0,
            retrieved_sources=retrieved_sources,
            retrieved_context=[],
            citations=retrieved_sources,
        )

    def list_rag_configs(self, request_id: str | None = None) -> list[RagConfigRecord]:
        headers: dict[str, str] = {}
        if request_id:
            headers['x-request-id'] = request_id

        try:
            with self._client_factory(timeout=self._timeout_seconds) as client:
                response = client.get(
                    f'{self._base_url}/api/v1/rag-configs',
                    headers=headers,
                )
        except httpx.TimeoutException as exc:
            raise RagProviderTimeoutError(self._timeout_seconds) from exc
        except httpx.HTTPError as exc:
            raise RagProviderError(
                'RAG provider is unavailable.',
                retryable=True,
                category='upstream_unavailable',
            ) from exc

        if response.status_code >= 400:
            raise RagProviderError(
                'RAG provider is unavailable.',
                retryable=response.status_code >= 500,
                category='upstream_unavailable',
            )

        body = parse_json_body(response)
        if not isinstance(body, dict):
            raise RagProviderError(
                'RAG provider returned an invalid response.',
                retryable=False,
                category='invalid_upstream_response',
            )

        configs = body.get('ragConfigs')
        if not isinstance(configs, list):
            raise RagProviderError(
                'RAG provider returned an invalid response.',
                retryable=False,
                category='invalid_upstream_response',
            )

        result: list[RagConfigRecord] = []
        for config in configs:
            if not isinstance(config, dict):
                continue
            config_id = config.get('id')
            name = config.get('name')
            if isinstance(config_id, str) and config_id and isinstance(name, str) and name:
                result.append(RagConfigRecord(id=config_id, name=name))

        return result


def parse_json_body(response: httpx.Response) -> object:
    try:
        return response.json()
    except ValueError:
        return None


def citations_to_sources(citations: object) -> list[str]:
    if not isinstance(citations, list):
        return []

    sources: list[str] = []
    seen: set[str] = set()
    for citation in citations:
        if not isinstance(citation, dict):
            continue

        source_id = citation.get('sourceId')
        if isinstance(source_id, str) and source_id and source_id not in seen:
            sources.append(source_id)
            seen.add(source_id)

    return sources
