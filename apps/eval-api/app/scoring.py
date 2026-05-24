from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RetrievalScores:
    hit_at_5: bool
    hit_at_10: bool
    recall_at_10: float
    retrieved_expected_sources: list[str]
    missing_expected_sources: list[str]


@dataclass(frozen=True)
class CitationScores:
    citation_present: bool
    citation_count: int
    citation_validity: float
    invalid_citations: list[str]


@dataclass(frozen=True)
class DeterministicScores:
    retrieval: RetrievalScores
    citations: CitationScores
    verdict: str
    failure_type: str


def score_case_result(
    expected_sources: list[str],
    retrieved_sources: list[str],
    citations: list[str],
    status: str,
) -> DeterministicScores:
    normalised_expected = normalise_values(expected_sources)
    normalised_retrieved = normalise_values(retrieved_sources)
    normalised_citations = normalise_values(citations)

    retrieval = score_retrieval(normalised_expected, normalised_retrieved)
    citation_scores = score_citations(normalised_expected, normalised_citations)
    verdict, failure_type = calculate_verdict(status, retrieval, citation_scores)

    return DeterministicScores(
        retrieval=retrieval,
        citations=citation_scores,
        verdict=verdict,
        failure_type=failure_type,
    )


def score_retrieval(expected_sources: list[str], retrieved_sources: list[str]) -> RetrievalScores:
    if not expected_sources:
        return RetrievalScores(
            hit_at_5=True,
            hit_at_10=True,
            recall_at_10=1,
            retrieved_expected_sources=[],
            missing_expected_sources=[],
        )

    top_5 = set(retrieved_sources[:5])
    top_10 = set(retrieved_sources[:10])
    expected = set(expected_sources)
    retrieved_expected_sources = sorted(expected.intersection(top_10))
    missing_expected_sources = sorted(expected.difference(top_10))

    return RetrievalScores(
        hit_at_5=bool(expected.intersection(top_5)),
        hit_at_10=bool(expected.intersection(top_10)),
        recall_at_10=len(retrieved_expected_sources) / len(expected),
        retrieved_expected_sources=retrieved_expected_sources,
        missing_expected_sources=missing_expected_sources,
    )


def score_citations(expected_sources: list[str], citations: list[str]) -> CitationScores:
    if not citations:
        return CitationScores(
            citation_present=False,
            citation_count=0,
            citation_validity=0,
            invalid_citations=[],
        )

    expected = set(expected_sources)
    invalid_citations = sorted(set(citations).difference(expected)) if expected else []
    valid_citation_count = len(citations) - len(invalid_citations)

    return CitationScores(
        citation_present=True,
        citation_count=len(citations),
        citation_validity=valid_citation_count / len(citations),
        invalid_citations=invalid_citations,
    )


def calculate_verdict(
    status: str,
    retrieval: RetrievalScores,
    citations: CitationScores,
) -> tuple[str, str]:
    if status == 'failed':
        return 'error', 'provider_error'

    if not retrieval.hit_at_5:
        return 'fail', 'retrieval_miss'

    if retrieval.recall_at_10 < 1:
        return 'fail', 'low_recall'

    if not citations.citation_present:
        return 'fail', 'missing_citation'

    if citations.citation_validity < 1:
        return 'fail', 'invalid_citation'

    return 'pass', ''


def normalise_values(values: list[str]) -> list[str]:
    return [value.strip() for value in values if value.strip()]
