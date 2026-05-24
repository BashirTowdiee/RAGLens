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

export type DocumentsResult =
  | { ok: true; documents: DocumentRecord[] }
  | { ok: false; error: string };

export type DocumentDetailResult =
  | { ok: true; document: DocumentRecord; chunks: DocumentChunkRecord[] }
  | { ok: false; error: string };

export function getRagApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_RAG_API_BASE_URL ?? 'http://localhost:8000';
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
