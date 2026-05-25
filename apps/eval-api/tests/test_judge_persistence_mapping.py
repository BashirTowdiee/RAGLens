from app.eval_runs import CaseResultRecord, to_judge_persistence_fields
from app.judging import JudgeEvaluation, JudgeScores
from app.scoring import CitationScores, DeterministicScores, RetrievalScores


def make_case_result(
    judge: JudgeEvaluation | None,
    judge_error: str = '',
) -> CaseResultRecord:
    return CaseResultRecord(
        id='result-1',
        eval_run_id='run-1',
        test_case_id='case-1',
        trace_id='trace-1',
        question='What is the refund policy?',
        answer='Customers can request refunds within 30 days.',
        expected_answer='Customers can request refunds within 30 days.',
        status='completed',
        latency_ms=100,
        cost_usd=0,
        error_message='',
        scores=DeterministicScores(
            retrieval=RetrievalScores(
                hit_at_5=True,
                hit_at_10=True,
                recall_at_10=1,
                retrieved_expected_sources=['refund-policy.md'],
                missing_expected_sources=[],
            ),
            citations=CitationScores(
                citation_present=True,
                citation_count=1,
                citation_validity=1,
                invalid_citations=[],
            ),
            verdict='pass',
            failure_type='',
        ),
        judge=judge,
        judge_error=judge_error,
        created_at='2026-05-25T12:30:00+00:00',
    )


def test_maps_judge_result_to_persistence_fields() -> None:
    result = make_case_result(
        JudgeEvaluation(
            scores=JudgeScores(
                groundedness=0.9,
                correctness=0.8,
                completeness=0.7,
                citation_support=0.6,
                refusal_quality=None,
            ),
            unsupported_claims=['Unsupported claim.'],
            missing_important_points=['Missing point.'],
            verdict='warning',
            rationale='Mostly correct but incomplete.',
        )
    )

    fields = to_judge_persistence_fields(result)

    assert fields.judge_scores == {
        'groundedness': 0.9,
        'correctness': 0.8,
        'completeness': 0.7,
        'citationSupport': 0.6,
        'refusalQuality': None,
    }
    assert fields.judge_unsupported_claims == ['Unsupported claim.']
    assert fields.judge_missing_important_points == ['Missing point.']
    assert fields.judge_verdict == 'warning'
    assert fields.judge_rationale == 'Mostly correct but incomplete.'
    assert fields.judge_error == ''


def test_maps_missing_judge_to_empty_persistence_fields() -> None:
    result = make_case_result(judge=None)

    fields = to_judge_persistence_fields(result)

    assert fields.judge_scores == {}
    assert fields.judge_unsupported_claims == []
    assert fields.judge_missing_important_points == []
    assert fields.judge_verdict == ''
    assert fields.judge_rationale == ''
    assert fields.judge_error == ''


def test_maps_judge_error_without_judge_result() -> None:
    result = make_case_result(judge=None, judge_error='Judge output was not valid JSON.')

    fields = to_judge_persistence_fields(result)

    assert fields.judge_scores == {}
    assert fields.judge_unsupported_claims == []
    assert fields.judge_missing_important_points == []
    assert fields.judge_verdict == ''
    assert fields.judge_rationale == ''
    assert fields.judge_error == 'Judge output was not valid JSON.'
