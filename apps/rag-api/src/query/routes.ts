import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AnswerProviderError } from './answerProvider.js';
import { QueryService } from './queryService.js';

const QueryRequestSchema = z.object({
  question: z.string().trim().min(1),
  topK: z.number().int().min(1).max(20).optional()
});

export async function registerQueryRoutes(app: FastifyInstance, queryService: QueryService) {
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
}
