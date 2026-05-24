import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AnswerProviderError } from './answerProvider.js';
import { QueryService } from './queryService.js';
import type { QueryTraceRepository } from './queryTraceRepository.js';

const QueryRequestSchema = z.object({
  question: z.string().trim().min(1),
  topK: z.number().int().min(1).max(20).optional()
});

export async function registerQueryRoutes(
  app: FastifyInstance,
  queryService: QueryService,
  queryTraceRepository: QueryTraceRepository
) {
  app.post('/api/v1/query', async (request, reply) => {
    const parseResult = QueryRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'invalid_query_payload',
        message: 'Query payload is invalid.',
        issues: parseResult.error.issues
      });
    }

    try {
      const result = await queryService.answer(parseResult.data);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AnswerProviderError) {
        return reply.status(502).send({
          error: 'answer_provider_failed',
          code: error.code,
          message: error.message,
          provider: error.provider,
          retryable: error.retryable
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

function queryTraceNotFound(reply: { status: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  return reply.status(404).send({
    error: 'query_trace_not_found',
    message: 'Query trace was not found.'
  });
}
