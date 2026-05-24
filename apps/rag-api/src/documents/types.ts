export type DocumentStatus = 'indexed';

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
