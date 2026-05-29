import os

# Keep tests isolated from external services by default.
os.environ.setdefault('EVAL_REPOSITORY', 'memory')
os.environ.setdefault('RAG_CLIENT_MODE', 'stub')
os.environ.setdefault('RAG_API_TIMEOUT_SECONDS', '0.1')
os.environ.setdefault('RAG_API_MAX_RETRIES', '2')
os.environ.setdefault('ENVIRONMENT', 'test')
