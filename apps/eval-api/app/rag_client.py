from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4


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
        return RagQueryResult(
            trace_id=f'stub-{uuid4()}',
            answer=f'Stub answer for: {question}',
            latency_ms=0,
            cost_usd=0,
        )
