import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RagRuntimeConfigStore } from './runtimeConfig.js';

const RuntimeConfigUpdateSchema = z.object({
  plainValues: z.record(z.string(), z.string()).default({}),
  secretSetValues: z.record(z.string(), z.string()).default({}),
  clearSecrets: z.array(z.string()).default([])
});

export async function registerRuntimeConfigRoutes(
  app: FastifyInstance,
  runtimeConfigStore: RagRuntimeConfigStore
) {
  app.get('/api/v1/runtime-config', async () => ({
    service: 'rag-api',
    persistence: 'in-memory',
    restartRequired: false,
    sections: runtimeConfigStore.getSectionsWithValues()
  }));

  app.put('/api/v1/runtime-config', async (request, reply) => {
    const requestId = request.requestId;
    const parseResult = RuntimeConfigUpdateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'invalid_runtime_config_payload',
        message: 'Runtime config payload is invalid.',
        requestId,
        issues: parseResult.error.issues
      });
    }

    const result = runtimeConfigStore.update(parseResult.data);
    if (!result.ok) {
      return reply.status(400).send({
        error: 'invalid_runtime_config_values',
        message: 'Runtime config contains invalid values.',
        requestId,
        issues: result.issues
      });
    }

    return reply.status(200).send({
      service: 'rag-api',
      persistence: 'in-memory',
      restartRequired: false,
      sections: runtimeConfigStore.getSectionsWithValues()
    });
  });
}
