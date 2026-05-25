from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Protocol


class JudgeProviderError(Exception):
    pass


class MalformedJudgeOutputError(JudgeProviderError):
    pass


@dataclass(frozen=True)
class JudgeEvaluationInput:
    question: str
    expected_answer: str
    generated_answer: str
    expected_sources: list[str] = field(default_factory=list)
    retrieved_context: list[str] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)
    no_answer_expected: bool = False


@dataclass(frozen=True)
class JudgeScores:
    groundedness: float
    correctness: float
    completeness: float
    citation_support: float
    refusal_quality: float | None


@dataclass(frozen=True)
class JudgeEvaluation:
    scores: JudgeScores
    unsupported_claims: list[str]
    missing_important_points: list[str]
    verdict: str
    rationale: str


class JudgeProvider(Protocol):
    def evaluate(self, input: JudgeEvaluationInput) -> JudgeEvaluation:
        raise NotImplementedError


class JsonJudgeProvider:
    def __init__(self, raw_output: str) -> None:
        self._raw_output = raw_output

    def evaluate(self, input: JudgeEvaluationInput) -> JudgeEvaluation:
        del input
        return parse_judge_output(self._raw_output)


class HeuristicJudgeProvider:
    def evaluate(self, input: JudgeEvaluationInput) -> JudgeEvaluation:
        generated = input.generated_answer.strip().lower()
        expected = input.expected_answer.strip().lower()

        if input.no_answer_expected:
            return evaluate_no_answer(input, generated)

        correctness = 1.0 if expected and expected in generated else 0.0
        citation_support = score_citation_support(input.citations, input.expected_sources)
        groundedness = 1.0 if generated and citation_support == 1.0 else 0.0
        verdict = 'pass' if min(correctness, citation_support, groundedness) == 1.0 else 'fail'

        return JudgeEvaluation(
            scores=JudgeScores(
                groundedness=groundedness,
                correctness=correctness,
                completeness=correctness,
                citation_support=citation_support,
                refusal_quality=None,
            ),
            unsupported_claims=[] if groundedness == 1.0 else [input.generated_answer],
            missing_important_points=[] if correctness == 1.0 else [input.expected_answer],
            verdict=verdict,
            rationale='Heuristic judge result for deterministic tests.',
        )


def evaluate_no_answer(input: JudgeEvaluationInput, generated: str) -> JudgeEvaluation:
    refusal_quality = 1.0 if is_refusal(generated) else 0.0
    verdict = 'pass' if refusal_quality == 1.0 else 'fail'
    unsupported = [] if refusal_quality == 1.0 else [input.generated_answer]
    missing = [] if refusal_quality == 1.0 else ['Expected insufficient-evidence refusal.']

    return JudgeEvaluation(
        scores=JudgeScores(
            groundedness=1.0,
            correctness=refusal_quality,
            completeness=refusal_quality,
            citation_support=1.0,
            refusal_quality=refusal_quality,
        ),
        unsupported_claims=unsupported,
        missing_important_points=missing,
        verdict=verdict,
        rationale='Heuristic no-answer judge result.',
    )


def parse_judge_output(raw_output: str) -> JudgeEvaluation:
    try:
        payload = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise MalformedJudgeOutputError('Judge output was not valid JSON.') from exc

    if not isinstance(payload, dict):
        raise MalformedJudgeOutputError('Judge output must be a JSON object.')

    scores_payload = payload.get('scores')
    if not isinstance(scores_payload, dict):
        raise MalformedJudgeOutputError('Judge output must include scores.')

    return JudgeEvaluation(
        scores=JudgeScores(
            groundedness=read_score(scores_payload, 'groundedness'),
            correctness=read_score(scores_payload, 'correctness'),
            completeness=read_score(scores_payload, 'completeness'),
            citation_support=read_score(scores_payload, 'citationSupport'),
            refusal_quality=read_optional_score(scores_payload, 'refusalQuality'),
        ),
        unsupported_claims=read_string_list(payload, 'unsupportedClaims'),
        missing_important_points=read_string_list(payload, 'missingImportantPoints'),
        verdict=read_verdict(payload),
        rationale=read_string(payload, 'rationale'),
    )


def score_citation_support(citations: list[str], expected_sources: list[str]) -> float:
    cleaned_citations = clean_items(citations)
    cleaned_expected = clean_items(expected_sources)
    if not cleaned_citations:
        return 0.0
    if all(citation in cleaned_expected for citation in cleaned_citations):
        return 1.0
    return 0.0


def read_score(payload: dict[str, object], key: str) -> float:
    value = payload.get(key)
    if not isinstance(value, int | float):
        raise MalformedJudgeOutputError(f'Judge score {key} must be numeric.')

    score = float(value)
    if score < 0 or score > 1:
        raise MalformedJudgeOutputError(f'Judge score {key} must be between 0 and 1.')
    return score


def read_optional_score(payload: dict[str, object], key: str) -> float | None:
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, int | float):
        raise MalformedJudgeOutputError(f'Judge score {key} must be numeric.')

    score = float(value)
    if score < 0 or score > 1:
        raise MalformedJudgeOutputError(f'Judge score {key} must be between 0 and 1.')
    return score


def read_string_list(payload: dict[str, object], key: str) -> list[str]:
    value = payload.get(key, [])
    if not isinstance(value, list):
        raise MalformedJudgeOutputError(f'Judge field {key} must be a list.')
    if not all(isinstance(item, str) for item in value):
        raise MalformedJudgeOutputError(f'Judge field {key} must contain strings.')
    return clean_items(value)


def read_verdict(payload: dict[str, object]) -> str:
    value = payload.get('verdict')
    if value not in {'pass', 'fail', 'warning', 'error'}:
        raise MalformedJudgeOutputError('Judge verdict is invalid.')
    return str(value)


def read_string(payload: dict[str, object], key: str) -> str:
    value = payload.get(key, '')
    if not isinstance(value, str):
        raise MalformedJudgeOutputError(f'Judge field {key} must be a string.')
    return value.strip()


def clean_items(items: list[str]) -> list[str]:
    return [item.strip() for item in items if item.strip()]


def is_refusal(answer: str) -> bool:
    markers = [
        'could not find enough evidence',
        'insufficient evidence',
        'cannot answer',
        'not enough information',
    ]
    return any(marker in answer for marker in markers)
