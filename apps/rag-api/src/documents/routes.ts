import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DocumentRepository } from './documentRepository.js';

const IngestDocumentSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  sourceType: z.literal('markdown'),
  sourceUri: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function registerDocumentRoutes(
  app: FastifyInstance,
  repository: DocumentRepository
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
