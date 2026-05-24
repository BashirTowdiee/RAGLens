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


@dataclass(frozen=True)
class DatasetRecord:
    id: str
    name: str
    version: str
    description: str
    status: str
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


class InMemoryDatasetRepository(DatasetRepository):
    def __init__(self) -> None:
        self._datasets: dict[str, DatasetRecord] = {}

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    'error': 'dataset_not_found',
                    'message': 'Dataset was not found.',
                },
            )

        return dataset

    return router


def to_dataset_response(dataset: DatasetRecord) -> DatasetResponse:
    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        version=dataset.version,
        description=dataset.description,
        status=dataset.status,
        created_at=dataset.created_at,
    )
