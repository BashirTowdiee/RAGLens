export type DocumentRecord = {
  id: string;
  sourceId: string;
  title: string;
  sourceType: string;
  sourceUri?: string;
  version: string;
  contentHash: string;
  status: 'indexed';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DocumentChunkRecord = {
  id: string;
  documentId: string;
  chunkIndex: number;
  headingPath: string[];
  content: string;
  tokenCountEstimate: number;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type RetrievedChunkRecord = DocumentChunkRecord & {
  score: number;
  document: Pick<DocumentRecord, 'id' | 'sourceId' | 'title' | 'sourceUri' | 'version'>;
};

export type RetrievalTraceChunk = {
  rank: number;
  chunkId: string;
  documentId: string;
  sourceId: string;
  title: string;
  score: number;
  chunkIndex: number;
  headingPath: string[];
};

export type RetrievalTraceRecord = {
  id: string;
  query: string;
  limit: number;
  resultCount: number;
  durationMs: number;
  chunks: RetrievalTraceChunk[];
  createdAt: string;
};

export type DocumentsResult =
  | { ok: true; documents: DocumentRecord[] }
  | { ok: false; error: string };

export type DocumentDetailResult =
  | { ok: true; document: DocumentRecord; chunks: DocumentChunkRecord[] }
  | { ok: false; error: string };

export type RetrievalResult =
  | { ok: true; query: string; traceId?: string; chunks: RetrievedChunkRecord[] }
  | { ok: false; error: string };

export type RetrievalTraceResult =
  | { ok: true; trace: RetrievalTraceRecord }
  | { ok: false; error: string };

export type IngestDocumentRequest = {
  sourceId: string;
  title: string;
  sourceType: 'markdown';
  sourceUri?: string;
  version?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type IngestDocumentResponse = {
  document: DocumentRecord;
  chunks: DocumentChunkRecord[];
};

export type IngestDocumentResult =
  | { ok: true; status: number; data: IngestDocumentResponse }
  | { ok: false; status: number; error: string };

export function getRagApiBaseUrl(): string {
  return (
    process.env.RAG_API_BASE_URL ??
    process.env.NEXT_PUBLIC_RAG_API_BASE_URL ??
    'http://localhost:8000'
  );
}

export function getRagApiDisplayBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_RAG_API_BASE_URL ??
    process.env.RAG_API_BASE_URL ??
    'http://localhost:8000'
  );
}

export async function fetchDocuments(): Promise<DocumentsResult> {
  try {
    const response = await fetch(`${getRagApiBaseUrl()}/api/v1/documents`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `rag-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as { documents?: DocumentRecord[] };
    return { ok: true, documents: body.documents ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch documents.'
    };
  }
}

export async function fetchDocumentDetail(documentId: string): Promise<DocumentDetailResult> {
  try {
    const response = await fetch(
      `${getRagApiBaseUrl()}/api/v1/documents/${documentId}/chunks`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return { ok: false, error: `rag-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as {
      document?: DocumentRecord;
      chunks?: DocumentChunkRecord[];
    };

    if (!body.document) {
      return { ok: false, error: 'rag-api response did not include a document.' };
    }

    return { ok: true, document: body.document, chunks: body.chunks ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch document detail.'
    };
  }
}

export async function fetchRetrievalResults(query: string, limit = 5): Promise<RetrievalResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { ok: true, query: '', chunks: [] };
  }

  try {
    const searchParams = new URLSearchParams({
      q: trimmedQuery,
      limit: String(limit)
    });
    const response = await fetch(
      `${getRagApiBaseUrl()}/api/v1/documents/search?${searchParams.toString()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return { ok: false, error: `rag-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as {
      query?: string;
      traceId?: string;
      chunks?: RetrievedChunkRecord[];
    };

    return {
      ok: true,
      query: body.query ?? trimmedQuery,
      traceId: body.traceId,
      chunks: body.chunks ?? []
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch retrieval results.'
    };
  }
}

export async function fetchRetrievalTrace(traceId: string): Promise<RetrievalTraceResult> {
  try {
    const response = await fetch(`${getRagApiBaseUrl()}/api/v1/retrieval-traces/${traceId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `rag-api returned HTTP ${response.status}` };
    }

    const body = (await response.json()) as { trace?: RetrievalTraceRecord };

    if (!body.trace) {
      return { ok: false, error: 'rag-api response did not include a retrieval trace.' };
    }

    return { ok: true, trace: body.trace };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to fetch retrieval trace.'
    };
  }
}

export async function ingestDocument(payload: IngestDocumentRequest): Promise<IngestDocumentResult> {
  try {
    const response = await fetch(`${getRagApiBaseUrl()}/api/v1/documents/ingest`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      return {
        ok: false,
        status: response.status,
        error: body?.message ?? `rag-api returned HTTP ${response.status}`
      };
    }

    const body = (await response.json()) as IngestDocumentResponse;
    return { ok: true, status: response.status, data: body };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : 'Unable to ingest document.'
    };
  }
}
