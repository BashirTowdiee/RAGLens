from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.judging import (
    HeuristicJudgeProvider,
    JudgeEvaluationInput,
    MalformedJudgeOutputError,
)


class JudgeRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    expected_answer: str = Field(default='', max_length=8000)
    generated_answer: str = Field(min_length=1, max_length=8000)
    expected_sources: list[str] = Field(default_factory=list, max_length=50)
    retrieved_context: list[str] = Field(default_factory=list, max_length=50)
    citations: list[str] = Field(default_factory=list, max_length=50)
    no_answer_expected: bool = False


class JudgeScoreResponse(BaseModel):
    groundedness: float
    correctness: float
    completeness: float
    citation_support: float
    refusal_quality: float | None


class JudgeResponse(BaseModel):
    scores: JudgeScoreResponse
    unsupported_claims: list[str]
    missing_important_points: list[str]
    verdict: str
    rationale: str


def create_judging_router() -> APIRouter:
    router = APIRouter(prefix='/api/v1/judging', tags=['judging'])
    provider = HeuristicJudgeProvider()

    @router.post('/evaluate', response_model=JudgeResponse)
    def evaluate_answer(request: JudgeRequest) -> JudgeResponse:
        try:
            evaluation = provider.evaluate(
                JudgeEvaluationInput(
                    question=request.question,
                    expected_answer=request.expected_answer,
                    generated_answer=request.generated_answer,
                    expected_sources=request.expected_sources,
                    retrieved_context=request.retrieved_context,
                    citations=request.citations,
                    no_answer_expected=request.no_answer_expected,
                )
            )
        except MalformedJudgeOutputError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    'error': 'judge_error',
                    'message': str(exc),
                },
            ) from exc

        return JudgeResponse(
            scores=JudgeScoreResponse(
                groundedness=evaluation.scores.groundedness,
                correctness=evaluation.scores.correctness,
                completeness=evaluation.scores.completeness,
                citation_support=evaluation.scores.citation_support,
                refusal_quality=evaluation.scores.refusal_quality,
            ),
            unsupported_claims=evaluation.unsupported_claims,
            missing_important_points=evaluation.missing_important_points,
            verdict=evaluation.verdict,
            rationale=evaluation.rationale,
        )

    return router
