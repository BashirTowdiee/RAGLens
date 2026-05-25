import pytest

from app.judging import (
    HeuristicJudgeProvider,
    JudgeEvaluationInput,
    JsonJudgeProvider,
    MalformedJudgeOutputError,
    parse_judge_output,
)


def test_parse_valid_judge_output() -> None:
    evaluation = parse_judge_output(
        '{'
        '"scores": {'
        '"groundedness": 1,'
        '"correctness": 0.8,'
        '"completeness": 0.75,'
        '"citationSupport": 1,'
        '"refusalQuality": null'
        '},'
        '"unsupportedClaims": ["unsupported claim"],'
        '"missingImportantPoints": ["missing point"],'
        '"verdict": "warning",'
        '"rationale": "Mostly grounded."
        '"}'
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
    with pytest.raises(MalformedJudgeOutputError):
        parse_judge_output(
            '{'
            '"scores": {'
            '"groundedness": 2,'
            '"correctness": 1,'
            '"completeness": 1,'
            '"citationSupport": 1'
            '},'
            '"verdict": "pass",'
            '"rationale": "invalid score"'
            '}'
        )


def test_json_judge_provider_uses_structured_parser() -> None:
    provider = JsonJudgeProvider(
        '{'
        '"scores": {'
        '"groundedness": 1,'
        '"correctness": 1,'
        '"completeness": 1,'
        '"citationSupport": 1'
        '},'
        '"verdict": "pass",'
        '"rationale": "grounded"'
        '}'
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


def test_heuristic_judge_passes_grounded_answer() -> None:
    evaluation = HeuristicJudgeProvider().evaluate(
        JudgeEvaluationInput(
            question='What is the refund policy?',
            expected_answer='Customers can request refunds within 30 days.',
            generated_answer='Customers can request refunds within 30 days. [refund-policy.md]',
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
            generated_answer='I cannot answer because there is insufficient evidence.',
            no_answer_expected=True,
        )
    )

    assert evaluation.verdict == 'pass'
    assert evaluation.scores.refusal_quality == 1
    assert evaluation.unsupported_claims == []
    assert evaluation.missing_important_points == []
