import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DocumentRepository } from './documentRepository.js';
import type { RetrievalTraceRepository } from './retrievalTraceRepository.js';

const RetrievalModeSchema = z.enum(['vector', 'keyword', 'hybrid', 'hybrid_reranked']);

const IngestDocumentSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  sourceType: z.literal('markdown'),
  sourceUri: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const SearchChunksQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(20).optional(),
  mode: RetrievalModeSchema.optional()
});

export async function registerDocumentRoutes(
  app: FastifyInstance,
  repository: DocumentRepository,
  traceRepository: RetrievalTraceRepository
) {
  app.post('/api/v1/documents/ingest', async (request, reply) => {
    const parseResult = IngestDocumentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'invalid_document_payload',
        message: 'Document ingestion payload is invalid.',
        issues: parseResult.error.issues
      });
    }

    try {
      const result = await repository.ingest(parseResult.data);
      return reply.status(201).send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document ingestion failed.';
      return reply.status(400).send({
        error: 'document_ingestion_failed',
        message
      });
    }
  });

  app.get('/api/v1/documents', async () => ({
    documents: await repository.listDocuments()
  }));

  app.get('/api/v1/documents/search', async (request, reply) => {
    const parseResult = SearchChunksQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'invalid_search_query',
        message: 'Search query is invalid.',
        issues: parseResult.error.issues
      });
    }

    const startTime = Date.now();
    const limit = parseResult.data.limit ?? 5;
    const retrievalMode = parseResult.data.mode ?? 'vector';
    const chunks = await repository.searchChunks({
      query: parseResult.data.q,
      limit,
      mode: retrievalMode
    });
    const trace = await traceRepository.create({
      query: parseResult.data.q,
      limit,
      retrievalMode,
      durationMs: Date.now() - startTime,
      chunks
    });

    return {
      query: parseResult.data.q,
      traceId: trace.id,
      chunks
    };
  });

  app.get('/api/v1/retrieval-traces/:traceId', async (request, reply) => {
    const params = z.object({ traceId: z.string().min(1) }).parse(request.params);
    const trace = await traceRepository.get(params.traceId);

    if (!trace) {
      return reply.status(404).send({
        error: 'retrieval_trace_not_found',
        message: 'Retrieval trace was not found.'
      });
    }

    return { trace };
  });

  app.get('/api/v1/documents/:documentId', async (request, reply) => {
    const params = z.object({ documentId: z.string().min(1) }).parse(request.params);
    const document = await repository.getDocument(params.documentId);

    if (!document) {
      return reply.status(404).send({
        error: 'document_not_found',
        message: 'Document was not found.'
      });
    }

    return { document };
  });

  app.get('/api/v1/documents/:documentId/chunks', async (request, reply) => {
    const params = z.object({ documentId: z.string().min(1) }).parse(request.params);
    const document = await repository.getDocument(params.documentId);

    if (!document) {
      return reply.status(404).send({
        error: 'document_not_found',
        message: 'Document was not found.'
      });
    }

    return {
      document,
      chunks: await repository.listChunks(params.documentId)
    };
  });
}
