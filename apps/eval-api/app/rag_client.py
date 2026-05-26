from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4

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


class RagClientError(Exception):
    pass


class RagApiClient:
    def query(self, question: str, rag_config_id: str) -> RagQueryResult:
        raise NotImplementedError


class StubRagApiClient(RagApiClient):
    def query(self, question: str, rag_config_id: str) -> RagQueryResult:
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