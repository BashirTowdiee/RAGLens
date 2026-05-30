import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().default('postgres://raglens:raglens@localhost:5432/raglens'),
  DOCUMENT_REPOSITORY: z.enum(['memory', 'postgres']).default('postgres'),
  ANSWER_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  PROMPT_CONTEXT_TOKEN_BUDGET: z.coerce.number().int().positive().default(1200),
  RERANKER_PROVIDER: z.enum(['deterministic', 'none']).default('deterministic')
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(env);
}
