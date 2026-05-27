export type DocumentStatus = 'indexed';

export type RetrievalMode = 'vector' | 'keyword';

export type DocumentRecord = {
  id: string;
  sourceId: string;
  title: string;
  sourceType: string;
  sourceUri?: string;
  version: string;
  contentHash: string;
  status: DocumentStatus;
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

export type CreateRetrievalTraceInput = {
  query: string;
  limit: number;
  durationMs: number;
  chunks: RetrievedChunkRecord[];
};

export type IngestDocumentInput = {
  sourceId: string;
  title: string;
  sourceType: 'markdown';
  sourceUri?: string;
  version?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type IngestDocumentResult = {
  document: DocumentRecord;
  chunks: DocumentChunkRecord[];
};

export type SearchChunksInput = {
  query: string;
  limit?: number;
  mode?: RetrievalMode;
};
