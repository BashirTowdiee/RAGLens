import pytest
from fastapi.testclient import TestClient

from app.judging import (
    HeuristicJudgeProvider,
    JudgeEvaluationInput,
    MalformedJudgeOutputError,
    parse_judge_output,
)
from app.main import app

client = TestClient(app)


def test_parse_judge_output_accepts_valid_structured_json() -> None:
    evaluation = parse_judge_output(
        '''
        {
          "scores": {
            "groundedness": 0.9,
            "correctness": 0.8,
            "completeness": 0.7,
            "citationSupport": 1.0,
            "refusalQuality": null
          },
          "unsupportedClaims": ["Unsupported detail"],
          "missingImportantPoints": ["Missing point"],
          "verdict": "warning",
          "rationale": "Mostly correct but incomplete."
        }
        '''
    )

    assert evaluation.scores.groundedness == 0.9
    assert evaluation.scores.correctness == 0.8
    assert evaluation.scores.completeness == 0.7
    assert evaluation.scores.citation_support == 1.0
    assert evaluation.scores.refusal_quality is None
    assert evaluation.unsupported_claims == ['Unsupported detail']
    assert evaluation.missing_important_points == ['Missing point']
    assert evaluation.verdict == 'warning'
    assert evaluation.rationale == 'Mostly correct but incomplete.'


def test_parse_judge_output_rejects_malformed_json() -> None:
    with pytest.raises(MalformedJudgeOutputError):
        parse_judge_output('not-json')


def test_parse_judge_output_rejects_out_of_range_scores() -> None:
    with pytest.raises(MalformedJudgeOutputError):
        parse_judge_output(
            '''
            {
              "scores": {
                "groundedness": 1.2,
                "correctness": 1,
                "completeness": 1,
                "citationSupport": 1
              },
              "verdict": "pass"
            }
            '''
        )


def test_heuristic_judge_passes_grounded_matching_answer() -> None:
    evaluation = HeuristicJudgeProvider().evaluate(
        JudgeEvaluationInput(
            question='What is the refund window?',
            expected_answer='Refunds are available within 30 days.',
            generated_answer='Refunds are available within 30 days.',
            expected_sources=['refund-policy.md'],
            citations=['refund-policy.md'],
        )
    )

    assert evaluation.verdict == 'pass'
    assert evaluation.scores.groundedness == 1
    assert evaluation.scores.correctness == 1
    assert evaluation.scores.completeness == 1
    assert evaluation.scores.citation_support == 1
    assert evaluation.unsupported_claims == []
    assert evaluation.missing_important_points == []


def test_heuristic_judge_scores_no_answer_refusal() -> None:
    evaluation = HeuristicJudgeProvider().evaluate(
        JudgeEvaluationInput(
            question='Does the policy mention unlimited travel?',
            expected_answer='',
            generated_answer='I could not find enough evidence in the indexed documents to answer this question.',
            no_answer_expected=True,
        )
    )

    assert evaluation.verdict == 'pass'
    assert evaluation.scores.refusal_quality == 1
    assert evaluation.unsupported_claims == []


def test_judging_endpoint_returns_scores() -> None:
    response = client.post(
        '/api/v1/judging/evaluate',
        json={
            'question': 'What is the refund window?',
            'expected_answer': 'Refunds are available within 30 days.',
            'generated_answer': 'Refunds are available within 30 days.',
            'expected_sources': ['refund-policy.md'],
            'citations': ['refund-policy.md'],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        'scores': {
            'groundedness': 1,
            'correctness': 1,
            'completeness': 1,
            'citation_support': 1,
            'refusal_quality': None,
        },
        'unsupported_claims': [],
        'missing_important_points': [],
        'verdict': 'pass',
        'rationale': 'Heuristic judge provider result. Replace with LLM provider after contract stabilises.',
    }
