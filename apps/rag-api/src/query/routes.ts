import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QueryProviderFailure, QueryService } from './queryService.js';
import type { RagConfigRepository } from './ragConfigRepository.js';
import type { QueryTraceRepository } from './queryTraceRepository.js';

const RetrievalModeSchema = z.enum(['vector', 'keyword', 'hybrid', 'hybrid_reranked']);

const QueryRequestSchema = z.object({
  question: z.string().trim().min(1),
  topK: z.number().int().min(1).max(20).optional(),
  ragConfigId: z.string().trim().min(1).max(120).optional(),
  retrievalMode: RetrievalModeSchema.optional(),
  rewriteQuery: z.boolean().optional(),
  metadataFilters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
});

export async function registerQueryRoutes(
  app: FastifyInstance,
  queryService: QueryService,
  queryTraceRepository: QueryTraceRepository,
  ragConfigRepository: RagConfigRepository
) {
  app.get('/api/v1/rag-configs', async () => ({
    ragConfigs: await ragConfigRepository.listActive()
  }));

  app.post('/api/v1/query', async (request, reply) => {
    const requestId = resolveRequestId(request);
    const parseResult = QueryRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'invalid_query_payload',
        message: 'Query payload is invalid.',
        requestId,
        issues: parseResult.error.issues
      });
    }

    const ragConfigId = parseResult.data.ragConfigId?.trim();
    const ragConfig = ragConfigId ? await ragConfigRepository.getById(ragConfigId) : null;

    if (ragConfigId && !ragConfig) {
      return reply.status(404).send({
        error: 'rag_config_not_found',
        message: 'RAG config was not found.',
        requestId,
        ragConfigId,
      });
    }

    try {
      const result = await queryService.answer({
        ...parseResult.data,
        ragConfig
      });
      request.log.info({
        requestId,
        traceId: result.traceId,
        ragConfigId: ragConfig?.id ?? 'deterministic',
        retrievalMode: parseResult.data.retrievalMode ?? ragConfig?.retrievalMode ?? 'vector',
        queryRewriteEnabled: result.queryRewriteEnabled,
        retrievalQuery: result.retrievalQuery,
        provider: result.usage.provider,
        model: result.usage.model,
        latencyMs: result.latencyMs,
        status: 'succeeded'
      }, 'rag_query_completed');
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof QueryProviderFailure) {
        request.log.warn(
          {
            requestId,
            traceId: error.traceId,
            ragConfigId: ragConfig?.id ?? 'deterministic',
            retrievalMode: parseResult.data.retrievalMode ?? ragConfig?.retrievalMode ?? 'vector',
            provider: error.providerError.provider,
            model: 'unknown',
            latencyMs: null,
            status: 'failed',
            providerErrorCode: error.providerError.code
          },
          'rag_query_failed'
        );
        return reply.status(502).send({
          error: 'answer_provider_failed',
          code: error.providerError.code,
          message: error.providerError.message,
          provider: error.providerError.provider,
          retryable: error.providerError.retryable,
          traceId: error.traceId,
          requestId
        });
      }

      throw error;
    }
  });

  app.get('/api/v1/queries', async () => ({
    traces: await queryTraceRepository.list()
  }));

  app.get('/api/v1/queries/:traceId', async (request, reply) => {
    const params = request.params as { traceId: string };
    const trace = await queryTraceRepository.get(params.traceId);

    if (!trace) {
      return queryTraceNotFound(reply);
    }

    return reply.status(200).send({ trace });
  });

  app.get('/api/v1/queries/:traceId/chunks', async (request, reply) => {
    const params = request.params as { traceId: string };
    const chunks = await queryTraceRepository.listChunks(params.traceId);

    if (!chunks) {
      return queryTraceNotFound(reply);
    }

    return reply.status(200).send({ chunks });
  });

  app.get('/api/v1/queries/:traceId/citations', async (request, reply) => {
    const params = request.params as { traceId: string };
    const citations = await queryTraceRepository.listCitations(params.traceId);

    if (!citations) {
      return queryTraceNotFound(reply);
    }

    return reply.status(200).send({ citations });
  });
}

function resolveRequestId(request: { requestId?: string; headers: Record<string, unknown> }): string {
  if (request.requestId && request.requestId.trim().length > 0) {
    return request.requestId;
  }

  const header = request.headers['x-request-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }

  if (Array.isArray(header) && typeof header[0] === 'string' && header[0].trim().length > 0) {
    return header[0].trim();
  }

  return '';
}

function queryTraceNotFound(reply: { status: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  return reply.status(404).send({
    error: 'query_trace_not_found',
    message: 'Query trace was not found.'
  });
}
