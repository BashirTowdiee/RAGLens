from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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
