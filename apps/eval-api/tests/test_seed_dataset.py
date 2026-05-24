import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DOCUMENTS_ROOT = ROOT / 'infra' / 'seed' / 'documents'
DATASET_PATH = ROOT / 'infra' / 'seed' / 'datasets' / 'company-kb-eval-v1.json'

EXPECTED_SOURCE_IDS = {
    'remote-work-policy-v1': DOCUMENTS_ROOT / 'policies' / 'remote-work-policy-v1.md',
    'remote-work-policy-v2': DOCUMENTS_ROOT / 'policies' / 'remote-work-policy-v2.md',
    'expense-policy': DOCUMENTS_ROOT / 'policies' / 'expense-policy.md',
    'onboarding-policy': DOCUMENTS_ROOT / 'policies' / 'onboarding-policy.md',
    'mobile-release-process': DOCUMENTS_ROOT / 'engineering' / 'mobile-release-process.md',
    'incident-response-runbook': DOCUMENTS_ROOT
    / 'engineering'
    / 'incident-response-runbook.md',
    'api-integration-guide': DOCUMENTS_ROOT / 'engineering' / 'api-integration-guide.md',
    'architecture-decision-records': DOCUMENTS_ROOT
    / 'engineering'
    / 'architecture-decision-records.md',
    'refund-policy': DOCUMENTS_ROOT / 'support' / 'refund-policy.md',
    'escalation-process': DOCUMENTS_ROOT / 'support' / 'escalation-process.md',
    'known-issues': DOCUMENTS_ROOT / 'support' / 'known-issues.md',
}

REQUIRED_CASE_TYPES = {
    'factual',
    'comparison',
    'temporal',
    'multi_hop',
    'no_answer',
    'citation_sensitive',
}


def load_dataset() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding='utf-8'))


def test_seed_dataset_contains_required_case_types() -> None:
    dataset = load_dataset()

    case_types = {test_case['type'] for test_case in dataset['testCases']}

    assert REQUIRED_CASE_TYPES <= case_types


def test_seed_dataset_expected_sources_exist() -> None:
    dataset = load_dataset()

    for test_case in dataset['testCases']:
        for source_id in test_case['expectedSourceIds']:
            assert source_id in EXPECTED_SOURCE_IDS
            assert EXPECTED_SOURCE_IDS[source_id].exists()


def test_no_answer_cases_have_no_expected_sources() -> None:
    dataset = load_dataset()

    no_answer_cases = [case for case in dataset['testCases'] if case['type'] == 'no_answer']

    assert no_answer_cases
    for test_case in no_answer_cases:
        assert test_case['mustAbstain'] is True
        assert test_case['expectedAnswer'] is None
        assert test_case['expectedSourceIds'] == []
