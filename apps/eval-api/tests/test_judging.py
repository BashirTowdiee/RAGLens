import json

import pytest

from app.judging import (
    HeuristicJudgeProvider,
    JsonJudgeProvider,
    JudgeEvaluationInput,
    MalformedJudgeOutputError,
    build_judge_prompt,
    parse_judge_output,
)


def test_parse_valid_judge_output() -> None:
    evaluation = parse_judge_output(
        json.dumps(
            {
                'scores': {
                    'groundedness': 1,
                    'correctness': 0.8,
                    'completeness': 0.75,
                    'citationSupport': 1,
                    'refusalQuality': None,
                },
                'unsupportedClaims': ['unsupported claim'],
                'missingImportantPoints': ['missing point'],
                'verdict': 'warning',
                'rationale': 'Mostly grounded.',
            }
        )
    )

    assert evaluation.scores.groundedness == 1
    assert evaluation.scores.correctness == 0.8
    assert evaluation.scores.completeness == 0.75
    assert evaluation.scores.citation_support == 1
    assert evaluation.scores.refusal_quality is None
    assert evaluation.unsupported_claims == ['unsupported claim']
    assert evaluation.missing_important_points == ['missing point']
    assert evaluation.verdict == 'warning'
    assert evaluation.rationale == 'Mostly grounded.'


def test_parse_rejects_malformed_judge_output() -> None:
    with pytest.raises(MalformedJudgeOutputError):
        parse_judge_output('not-json')


def test_parse_rejects_out_of_range_scores() -> None:
    payload = {
        'scores': {
            'groundedness': 2,
            'correctness': 1,
            'completeness': 1,
            'citationSupport': 1,
        },
        'verdict': 'pass',
        'rationale': 'invalid score',
    }

    with pytest.raises(MalformedJudgeOutputError):
        parse_judge_output(json.dumps(payload))


def test_json_judge_provider_uses_structured_parser() -> None:
    provider = JsonJudgeProvider(
        json.dumps(
            {
                'scores': {
                    'groundedness': 1,
                    'correctness': 1,
                    'completeness': 1,
                    'citationSupport': 1,
                },
                'verdict': 'pass',
                'rationale': 'grounded',
            }
        )
    )

    evaluation = provider.evaluate(
        JudgeEvaluationInput(
            question='What is the refund policy?',
            expected_answer='Customers can request refunds within 30 days.',
            generated_answer='Customers can request refunds within 30 days.',
        )
    )

    assert evaluation.verdict == 'pass'
    assert evaluation.rationale == 'grounded'


def test_build_judge_prompt_includes_expected_inputs() -> None:
    prompt = build_judge_prompt(
        JudgeEvaluationInput(
            question='What is the refund policy?',
            expected_answer='Customers can request refunds within 30 days.',
            generated_answer='Customers can request refunds within 30 days. [refund-policy.md]',
            expected_sources=['refund-policy.md'],
            retrieved_context=['Refund policy: refunds are available within 30 days.'],
            citations=['refund-policy.md'],
        )
    )

    assert prompt.version == 'judge-prompt-v1'
    assert 'Return strict JSON' in prompt.system
    assert 'scores.groundedness' in prompt.system
    assert 'verdict must be one of pass, fail, warning, or error'.lower() in prompt.user.lower()

    payload = json.loads(prompt.user.split('\n\n', maxsplit=1)[1])
    assert payload == {
        'question': 'What is the refund policy?',
        'expectedAnswer': 'Customers can request refunds within 30 days.',
        'generatedAnswer': 'Customers can request refunds within 30 days. [refund-policy.md]',
        'expectedSources': ['refund-policy.md'],
        'retrievedContext': ['Refund policy: refunds are available within 30 days.'],
        'citations': ['refund-policy.md'],
        'noAnswerExpected': False,
    }


def test_build_judge_prompt_cleans_empty_list_items() -> None:
    prompt = build_judge_prompt(
        JudgeEvaluationInput(
            question=' What is the refund policy? ',
            expected_answer=' Customers can request refunds within 30 days. ',
            generated_answer=' Customers can request refunds within 30 days. ',
            expected_sources=[' refund-policy.md ', ''],
            retrieved_context=[' Refund policy content. ', ''],
            citations=[' refund-policy.md ', ''],
        )
    )

    payload = json.loads(prompt.user.split('\n\n', maxsplit=1)[1])
    assert payload['question'] == 'What is the refund policy?'
    assert payload['expectedAnswer'] == 'Customers can request refunds within 30 days.'
    assert payload['generatedAnswer'] == 'Customers can request refunds within 30 days.'
    assert payload['expectedSources'] == ['refund-policy.md']
    assert payload['retrievedContext'] == ['Refund policy content.']
    assert payload['citations'] == ['refund-policy.md']


def test_build_judge_prompt_includes_no_answer_instruction() -> None:
    prompt = build_judge_prompt(
        JudgeEvaluationInput(
            question='What is the office pet policy?',
            expected_answer='',
            generated_answer='I cannot answer because there is insufficient evidence.',
            no_answer_expected=True,
        )
    )

    payload = json.loads(prompt.user.split('\n\n', maxsplit=1)[1])
    assert payload['noAnswerExpected'] is True
    assert 'score refusalQuality' in prompt.user
    assert 'insufficient evidence' in prompt.user


def test_heuristic_judge_passes_grounded_answer() -> None:
    evaluation = HeuristicJudgeProvider().evaluate(
        JudgeEvaluationInput(
            question='What is the refund policy?',
            expected_answer='Customers can request refunds within 30 days.',
            generated_answer=(
                'Customers can request refunds within 30 days. '
                '[refund-policy.md]'
            ),
            expected_sources=['refund-policy.md'],
            citations=['refund-policy.md'],
        )
    )

    assert evaluation.verdict == 'pass'
    assert evaluation.scores.correctness == 1
    assert evaluation.scores.citation_support == 1
    assert evaluation.unsupported_claims == []
    assert evaluation.missing_important_points == []


def test_heuristic_judge_scores_no_answer_refusal() -> None:
    evaluation = HeuristicJudgeProvider().evaluate(
        JudgeEvaluationInput(
            question='What is the office pet policy?',
            expected_answer='',
            generated_answer=(
                'I cannot answer because there is insufficient evidence.'
            ),
            no_answer_expected=True,
        )
    )

    assert evaluation.verdict == 'pass'
    assert evaluation.scores.refusal_quality == 1
    assert evaluation.unsupported_claims == []
    assert evaluation.missing_important_points == []
