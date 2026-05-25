from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Protocol

JUDGE_PROMPT_VERSION = 'judge-prompt-v1'


class JudgeProviderError(Exception):
    pass


class MalformedJudgeOutputError(JudgeProviderError):
    pass


class JudgeTransportError(JudgeProviderError):
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
class JudgePrompt:
    version: str
    system: str
    user: str


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


class OpenAIJudgeTransport(Protocol):
    def complete(self, payload: dict[str, object]) -> dict[str, object]:
        raise NotImplementedError


class JsonJudgeProvider:
    def __init__(self, raw_output: str) -> None:
        self._raw_output = raw_output

    def evaluate(self, input: JudgeEvaluationInput) -> JudgeEvaluation:
        del input
        return parse_judge_output(self._raw_output)


class OpenAIJudgeProvider:
    def __init__(
        self,
        transport: OpenAIJudgeTransport,
        model: str,
        temperature: float = 0,
    ) -> None:
        self._transport = transport
        self._model = model
        self._temperature = temperature

    def evaluate(self, input: JudgeEvaluationInput) -> JudgeEvaluation:
        prompt = build_judge_prompt(input)
        response = self._transport.complete(
            {
                'model': self._model,
                'temperature': self._temperature,
                'response_format': {'type': 'json_object'},
                'messages': [
                    {'role': 'system', 'content': prompt.system},
                    {'role': 'user', 'content': prompt.user},
                ],
                'metadata': {'prompt_version': prompt.version},
            }
        )
        return parse_judge_output(read_openai_message_content(response))


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


def build_judge_prompt(input: JudgeEvaluationInput) -> JudgePrompt:
    expected_sources = clean_items(input.expected_sources)
    retrieved_context = clean_items(input.retrieved_context)
    citations = clean_items(input.citations)
    payload = {
        'question': input.question.strip(),
        'expectedAnswer': input.expected_answer.strip(),
        'generatedAnswer': input.generated_answer.strip(),
        'expectedSources': expected_sources,
        'retrievedContext': retrieved_context,
        'citations': citations,
        'noAnswerExpected': input.no_answer_expected,
    }

    system = (
        'You are RAGLens judge-prompt-v1. Evaluate a RAG answer using only the '
        'provided expected answer, expected sources, retrieved context, and citations. '
        'Return strict JSON with scores.groundedness, scores.correctness, '
        'scores.completeness, scores.citationSupport, scores.refusalQuality, '
        'unsupportedClaims, missingImportantPoints, verdict, and rationale.'
    )
    user = (
        'Evaluate this case. Scores must be numbers from 0 to 1. Verdict must be '
        'one of pass, fail, warning, or error. For no-answer cases, score '
        'refusalQuality and verify the answer refuses due to insufficient evidence.\n\n'
        f'{json.dumps(payload, sort_keys=True, separators=(",", ":"))}'
    )

    return JudgePrompt(version=JUDGE_PROMPT_VERSION, system=system, user=user)


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


def read_openai_message_content(response: dict[str, object]) -> str:
    choices = response.get('choices')
    if not isinstance(choices, list) or not choices:
        raise JudgeTransportError('OpenAI judge response did not include choices.')

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        raise JudgeTransportError('OpenAI judge choice was malformed.')

    message = first_choice.get('message')
    if not isinstance(message, dict):
        raise JudgeTransportError('OpenAI judge response did not include a message.')

    content = message.get('content')
    if not isinstance(content, str) or not content.strip():
        raise JudgeTransportError('OpenAI judge response did not include content.')
    return content


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
