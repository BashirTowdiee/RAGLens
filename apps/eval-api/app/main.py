from fastapi import FastAPI

from app.settings import get_settings

settings = get_settings()
app = FastAPI(title='RAGLens Eval API', version='0.0.0')


@app.get('/api/v1/health')
def health() -> dict[str, str]:
    return {
        'status': 'ok',
        'service': 'eval-api',
        'environment': settings.environment,
    }
