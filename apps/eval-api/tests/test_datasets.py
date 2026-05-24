from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_dataset(name: str = 'dataset-for-test-cases') -> dict:
    response = client.post(
        '/api/v1/datasets',
        json={
            'name': name,
            'version': '1.0.0',
            'description': 'Dataset used by route tests.',
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_fetch_dataset() -> None:
    response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'support-faq-baseline',
            'version': '1.0.0',
            'description': 'Baseline support FAQ dataset.',
        },
    )

    assert response.status_code == 201
    dataset = response.json()
    assert dataset['id']
    assert dataset['name'] == 'support-faq-baseline'
    assert dataset['version'] == '1.0.0'
    assert dataset['description'] == 'Baseline support FAQ dataset.'
    assert dataset['status'] == 'draft'
    assert dataset['created_at']

    detail_response = client.get(f"/api/v1/datasets/{dataset['id']}")

    assert detail_response.status_code == 200
    assert detail_response.json() == dataset


def test_list_datasets_contains_created_dataset() -> None:
    create_response = client.post(
        '/api/v1/datasets',
        json={
            'name': 'refund-policy-baseline',
            'version': '1.0.0',
            'description': 'Refund policy baseline dataset.',
        },
    )
    dataset = create_response.json()

    response = client.get('/api/v1/datasets')

    assert response.status_code == 200
    assert dataset in response.json()['datasets']


def test_rejects_duplicate_dataset_name_and_version() -> None:
    payload = {
        'name': 'duplicate-baseline',
        'version': '1.0.0',
        'description': 'Original dataset.',
    }
    first_response = client.post('/api/v1/datasets', json=payload)
    second_response = client.post('/api/v1/datasets', json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json()['detail'] == {
        'error': 'duplicate_dataset_version',
        'message': 'A dataset with this name and version already exists.',
    }


def test_returns_not_found_for_missing_dataset() -> None:
    response = client.get('/api/v1/datasets/missing-dataset')

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'dataset_not_found',
        'message': 'Dataset was not found.',
    }


def test_create_and_fetch_dataset_test_case() -> None:
    dataset = create_dataset('test-case-detail-dataset')

    response = client.post(
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        json={
            'question': 'What is the refund window?',
            'expected_answer': 'Customers can request refunds within 30 days.',
            'reference_citations': ['refund-policy.md#window'],
        },
    )

    assert response.status_code == 201
    test_case = response.json()
    assert test_case['id']
    assert test_case['dataset_id'] == dataset['id']
    assert test_case['question'] == 'What is the refund window?'
    assert test_case['expected_answer'] == 'Customers can request refunds within 30 days.'
    assert test_case['reference_citations'] == ['refund-policy.md#window']
    assert test_case['created_at']

    detail_response = client.get(f"/api/v1/datasets/{dataset['id']}/test-cases/{test_case['id']}")

    assert detail_response.status_code == 200
    assert detail_response.json() == test_case


def test_list_dataset_test_cases_contains_created_test_case() -> None:
    dataset = create_dataset('test-case-list-dataset')
    create_response = client.post(
        f"/api/v1/datasets/{dataset['id']}/test-cases",
        json={
            'question': 'How do support escalations work?',
            'expected_answer': 'Escalations are routed to the support lead.',
            'reference_citations': ['support.md#escalations'],
        },
    )
    test_case = create_response.json()

    response = client.get(f"/api/v1/datasets/{dataset['id']}/test-cases")

    assert response.status_code == 200
    assert test_case in response.json()['test_cases']


def test_returns_not_found_when_creating_test_case_for_missing_dataset() -> None:
    response = client.post(
        '/api/v1/datasets/missing-dataset/test-cases',
        json={
            'question': 'What is missing?',
            'expected_answer': 'This should not be created.',
            'reference_citations': [],
        },
    )

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'dataset_not_found',
        'message': 'Dataset was not found.',
    }


def test_returns_not_found_for_missing_test_case() -> None:
    dataset = create_dataset('missing-test-case-dataset')

    response = client.get(f"/api/v1/datasets/{dataset['id']}/test-cases/missing-test-case")

    assert response.status_code == 404
    assert response.json()['detail'] == {
        'error': 'test_case_not_found',
        'message': 'Test case was not found.',
    }
