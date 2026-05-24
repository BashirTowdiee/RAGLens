from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field


class CreateDatasetRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=40)
    description: str = Field(default='', max_length=1000)


class DatasetResponse(BaseModel):
    id: str
    name: str
    version: str
    description: str
    status: str
    created_at: str


class DatasetListResponse(BaseModel):
    datasets: list[DatasetResponse]


class CreateTestCaseRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    expected_answer: str = Field(min_length=1, max_length=4000)
    reference_citations: list[str] = Field(default_factory=list, max_length=20)


class TestCaseResponse(BaseModel):
    id: str
    dataset_id: str
    question: str
    expected_answer: str
    reference_citations: list[str]
    created_at: str


class TestCaseListResponse(BaseModel):
    test_cases: list[TestCaseResponse]


@dataclass(frozen=True)
class DatasetRecord:
    id: str
    name: str
    version: str
    description: str
    status: str
    created_at: str


@dataclass(frozen=True)
class TestCaseRecord:
    id: str
    dataset_id: str
    question: str
    expected_answer: str
    reference_citations: list[str]
    created_at: str


class DuplicateDatasetError(Exception):
    pass


class DatasetRepository:
    def create(self, request: CreateDatasetRequest) -> DatasetRecord:
        raise NotImplementedError

    def list(self) -> list[DatasetRecord]:
        raise NotImplementedError

    def get(self, dataset_id: str) -> DatasetRecord | None:
        raise NotImplementedError

    def create_test_case(
        self,
        dataset_id: str,
        request: CreateTestCaseRequest,
    ) -> TestCaseRecord | None:
        raise NotImplementedError

    def list_test_cases(self, dataset_id: str) -> list[TestCaseRecord] | None:
        raise NotImplementedError

    def get_test_case(self, dataset_id: str, test_case_id: str) -> TestCaseRecord | None:
        raise NotImplementedError


class InMemoryDatasetRepository(DatasetRepository):
    def __init__(self) -> None:
        self._datasets: dict[str, DatasetRecord] = {}
        self._test_cases: dict[str, TestCaseRecord] = {}

    def create(self, request: CreateDatasetRequest) -> DatasetRecord:
        normalised_name = request.name.strip()
        normalised_version = request.version.strip()
        duplicate = any(
            dataset.name == normalised_name and dataset.version == normalised_version
            for dataset in self._datasets.values()
        )

        if duplicate:
            raise DuplicateDatasetError

        dataset = DatasetRecord(
            id=str(uuid4()),
            name=normalised_name,
            version=normalised_version,
            description=request.description.strip(),
            status='draft',
            created_at=datetime.now(UTC).isoformat(),
        )
        self._datasets[dataset.id] = dataset
        return dataset

    def list(self) -> list[DatasetRecord]:
        return sorted(self._datasets.values(), key=lambda dataset: dataset.created_at, reverse=True)

    def get(self, dataset_id: str) -> DatasetRecord | None:
        return self._datasets.get(dataset_id)

    def create_test_case(
        self,
        dataset_id: str,
        request: CreateTestCaseRequest,
    ) -> TestCaseRecord | None:
        if dataset_id not in self._datasets:
            return None

        test_case = TestCaseRecord(
            id=str(uuid4()),
            dataset_id=dataset_id,
            question=request.question.strip(),
            expected_answer=request.expected_answer.strip(),
            reference_citations=[citation.strip() for citation in request.reference_citations],
            created_at=datetime.now(UTC).isoformat(),
        )
        self._test_cases[test_case.id] = test_case
        return test_case

    def list_test_cases(self, dataset_id: str) -> list[TestCaseRecord] | None:
        if dataset_id not in self._datasets:
            return None

        test_cases = [
            test_case for test_case in self._test_cases.values() if test_case.dataset_id == dataset_id
        ]
        return sorted(test_cases, key=lambda test_case: test_case.created_at, reverse=True)

    def get_test_case(self, dataset_id: str, test_case_id: str) -> TestCaseRecord | None:
        if dataset_id not in self._datasets:
            return None

        test_case = self._test_cases.get(test_case_id)
        if test_case is None or test_case.dataset_id != dataset_id:
            return None

        return test_case


def create_dataset_router(repository: DatasetRepository) -> APIRouter:
    router = APIRouter(prefix='/api/v1/datasets', tags=['datasets'])

    @router.post('', response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
    def create_dataset(request: CreateDatasetRequest) -> DatasetRecord:
        try:
            return repository.create(request)
        except DuplicateDatasetError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    'error': 'duplicate_dataset_version',
                    'message': 'A dataset with this name and version already exists.',
                },
            ) from exc

    @router.get('', response_model=DatasetListResponse)
    def list_datasets() -> DatasetListResponse:
        datasets = [to_dataset_response(dataset) for dataset in repository.list()]
        return DatasetListResponse(datasets=datasets)

    @router.get('/{dataset_id}', response_model=DatasetResponse)
    def get_dataset(dataset_id: str) -> DatasetRecord:
        dataset = repository.get(dataset_id)

        if dataset is None:
            raise_dataset_not_found()

        return dataset

    @router.post(
        '/{dataset_id}/test-cases',
        response_model=TestCaseResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def create_test_case(dataset_id: str, request: CreateTestCaseRequest) -> TestCaseRecord:
        test_case = repository.create_test_case(dataset_id, request)

        if test_case is None:
            raise_dataset_not_found()

        return test_case

    @router.get('/{dataset_id}/test-cases', response_model=TestCaseListResponse)
    def list_test_cases(dataset_id: str) -> TestCaseListResponse:
        test_cases = repository.list_test_cases(dataset_id)

        if test_cases is None:
            raise_dataset_not_found()

        return TestCaseListResponse(
            test_cases=[to_test_case_response(test_case) for test_case in test_cases]
        )

    @router.get('/{dataset_id}/test-cases/{test_case_id}', response_model=TestCaseResponse)
    def get_test_case(dataset_id: str, test_case_id: str) -> TestCaseRecord:
        test_case = repository.get_test_case(dataset_id, test_case_id)

        if test_case is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'test_case_not_found',
                    'message': 'Test case was not found.',
                },
            )

        return test_case

    return router


def raise_dataset_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            'error': 'dataset_not_found',
            'message': 'Dataset was not found.',
        },
    )


def to_dataset_response(dataset: DatasetRecord) -> DatasetResponse:
    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        version=dataset.version,
        description=dataset.description,
        status=dataset.status,
        created_at=dataset.created_at,
    )


def to_test_case_response(test_case: TestCaseRecord) -> TestCaseResponse:
    return TestCaseResponse(
        id=test_case.id,
        dataset_id=test_case.dataset_id,
        question=test_case.question,
        expected_answer=test_case.expected_answer,
        reference_citations=test_case.reference_citations,
        created_at=test_case.created_at,
    )
