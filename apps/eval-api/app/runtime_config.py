from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field, ValidationError

from app.rag_client import HttpRagApiClient, RagApiClient, StubRagApiClient
from app.settings import Settings


class RuntimeConfigUpdatePayload(BaseModel):
    plainValues: dict[str, str] = Field(default_factory=dict)
    secretSetValues: dict[str, str] = Field(default_factory=dict)
    clearSecrets: list[str] = Field(default_factory=list)


class EvalRuntimeConfigStore:
    def __init__(self, initial_settings: Settings) -> None:
        self._state = {
            'environment': initial_settings.environment,
            'rag_client_mode': initial_settings.rag_client_mode,
            'rag_api_base_url': initial_settings.rag_api_base_url,
            'rag_api_timeout_seconds': initial_settings.rag_api_timeout_seconds,
            'rag_api_max_retries': initial_settings.rag_api_max_retries,
        }

    def snapshot(self) -> dict[str, str | float | int]:
        return dict(self._state)

    def max_retries(self) -> int:
        return int(self._state['rag_api_max_retries'])

    def update(self, payload: RuntimeConfigUpdatePayload) -> tuple[bool, list[str]]:
        next_state = dict(self._state)
        for key, raw_value in payload.plainValues.items():
            value = raw_value.strip()
            if key == 'ENVIRONMENT':
                next_state['environment'] = value
            elif key == 'RAG_CLIENT_MODE':
                next_state['rag_client_mode'] = value
            elif key == 'RAG_API_BASE_URL':
                next_state['rag_api_base_url'] = value
            elif key == 'RAG_API_TIMEOUT_SECONDS':
                next_state['rag_api_timeout_seconds'] = float(value)
            elif key == 'RAG_API_MAX_RETRIES':
                next_state['rag_api_max_retries'] = int(value)

        try:
            validate_runtime_state(next_state)
        except ValidationError as exc:
            return False, [format_validation_error(error) for error in exc.errors()]
        except ValueError:
            return False, ['Runtime setting values are invalid.']

        self._state = next_state
        return True, []

    def sections_with_values(self) -> list[dict[str, object]]:
        state = self.snapshot()
        return [
            {
                'id': 'eval-runtime',
                'title': 'Eval runtime',
                'description': 'Eval runner mode and rag-api call policy.',
                'fields': [
                    {
                        'key': 'ENVIRONMENT',
                        'label': 'environment',
                        'description': 'Eval API runtime environment label.',
                        'kind': 'text',
                        'value': str(state['environment']),
                        'isSet': bool(str(state['environment']).strip()),
                    },
                    {
                        'key': 'RAG_CLIENT_MODE',
                        'label': 'rag client mode',
                        'description': 'rag-api integration mode used by eval execution.',
                        'kind': 'select',
                        'options': [
                            {'value': 'http', 'label': 'http'},
                            {'value': 'stub', 'label': 'stub'},
                        ],
                        'value': str(state['rag_client_mode']),
                        'isSet': True,
                    },
                    {
                        'key': 'RAG_API_BASE_URL',
                        'label': 'rag-api base URL',
                        'description': 'Target base URL for rag-api HTTP calls.',
                        'kind': 'url',
                        'value': str(state['rag_api_base_url']),
                        'isSet': bool(str(state['rag_api_base_url']).strip()),
                    },
                    {
                        'key': 'RAG_API_TIMEOUT_SECONDS',
                        'label': 'rag-api timeout (seconds)',
                        'description': 'Timeout boundary for eval -> rag requests.',
                        'kind': 'number',
                        'value': str(state['rag_api_timeout_seconds']),
                        'isSet': True,
                    },
                    {
                        'key': 'RAG_API_MAX_RETRIES',
                        'label': 'rag-api max retries',
                        'description': 'Retry attempts for retryable rag provider failures.',
                        'kind': 'number',
                        'value': str(state['rag_api_max_retries']),
                        'isSet': True,
                    },
                ],
            }
        ]


class RuntimeConfigStateModel(BaseModel):
    environment: str
    rag_client_mode: Literal['http', 'stub']
    rag_api_base_url: str
    rag_api_timeout_seconds: float
    rag_api_max_retries: int


def validate_runtime_state(state: dict[str, object]) -> RuntimeConfigStateModel:
    model = RuntimeConfigStateModel.model_validate(state)
    if model.rag_api_timeout_seconds <= 0:
        raise ValueError('RAG_API_TIMEOUT_SECONDS must be greater than zero.')
    if model.rag_api_max_retries < 0:
        raise ValueError('RAG_API_MAX_RETRIES must be greater than or equal to zero.')
    return model


def format_validation_error(error: dict[str, object]) -> str:
    location = '.'.join(str(item) for item in error.get('loc', []))
    message = str(error.get('msg', 'invalid value'))
    return f'{location}: {message}' if location else message


class RuntimeConfigRagClient(RagApiClient):
    def __init__(
        self,
        config_store: EvalRuntimeConfigStore,
        client_factory=httpx.Client,
    ) -> None:
        self._config_store = config_store
        self._client_factory = client_factory
        self._stub_client = StubRagApiClient()

    def _resolve(self) -> RagApiClient:
        snapshot = self._config_store.snapshot()
        if snapshot['rag_client_mode'] == 'stub':
            return self._stub_client

        return HttpRagApiClient(
            base_url=str(snapshot['rag_api_base_url']),
            timeout_seconds=float(snapshot['rag_api_timeout_seconds']),
            client_factory=self._client_factory,
        )

    def query(
        self,
        question: str,
        rag_config_id: str,
        request_id: str | None = None,
    ):
        return self._resolve().query(question, rag_config_id, request_id=request_id)

    def list_rag_configs(self, request_id: str | None = None):
        return self._resolve().list_rag_configs(request_id=request_id)


def create_runtime_config_router(config_store: EvalRuntimeConfigStore) -> APIRouter:
    router = APIRouter(prefix='/api/v1', tags=['runtime-config'])

    @router.get('/runtime-config')
    def get_runtime_config() -> dict[str, object]:
        return {
            'service': 'eval-api',
            'persistence': 'in-memory',
            'restartRequired': False,
            'sections': config_store.sections_with_values(),
        }

    @router.put('/runtime-config')
    def update_runtime_config(
        request: Request,
        payload: RuntimeConfigUpdatePayload,
    ) -> dict[str, object]:
        success, issues = config_store.update(payload)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    'error': 'invalid_runtime_config_values',
                    'message': 'Runtime config contains invalid values.',
                    'issues': issues,
                    'requestId': getattr(request.state, 'request_id', ''),
                },
            )

        return {
            'service': 'eval-api',
            'persistence': 'in-memory',
            'restartRequired': False,
            'sections': config_store.sections_with_values(),
        }

    return router
