from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.scoring import score_case_result


class ScoreCaseRequest(BaseModel):
    expected_sources: list[str] = Field(default_factory=list, max_length=50)
    retrieved_sources: list[str] = Field(default_factory=list, max_length=50)
    citations: list[str] = Field(default_factory=list, max_length=50)
    status: str = Field(default='completed', min_length=1, max_length=40)


class RetrievalScoreResponse(BaseModel):
    hit_at_5: bool
    hit_at_10: bool
    recall_at_10: float
    retrieved_expected_sources: list[str]
    missing_expected_sources: list[str]


class CitationScoreResponse(BaseModel):
    citation_present: bool
    citation_count: int
    citation_validity: float
    invalid_citations: list[str]


class ScoreCaseResponse(BaseModel):
    retrieval: RetrievalScoreResponse
    citations: CitationScoreResponse
    verdict: str
    failure_type: str


def create_scoring_router() -> APIRouter:
    router = APIRouter(prefix='/api/v1/scoring', tags=['scoring'])

    @router.post('/deterministic', response_model=ScoreCaseResponse)
    def score_case(request: ScoreCaseRequest) -> ScoreCaseResponse:
        scores = score_case_result(
            expected_sources=request.expected_sources,
            retrieved_sources=request.retrieved_sources,
            citations=request.citations,
            status=request.status,
        )
        return ScoreCaseResponse(
            retrieval=RetrievalScoreResponse(
                hit_at_5=scores.retrieval.hit_at_5,
                hit_at_10=scores.retrieval.hit_at_10,
                recall_at_10=scores.retrieval.recall_at_10,
                retrieved_expected_sources=scores.retrieval.retrieved_expected_sources,
                missing_expected_sources=scores.retrieval.missing_expected_sources,
            ),
            citations=CitationScoreResponse(
                citation_present=scores.citations.citation_present,
                citation_count=scores.citations.citation_count,
                citation_validity=scores.citations.citation_validity,
                invalid_citations=scores.citations.invalid_citations,
            ),
            verdict=scores.verdict,
            failure_type=scores.failure_type,
        )

    return router
