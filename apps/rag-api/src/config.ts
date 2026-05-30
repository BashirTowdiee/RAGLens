import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().default('postgres://raglens:raglens@localhost:5432/raglens'),
  DOCUMENT_REPOSITORY: z.enum(['memory', 'postgres']).default('postgres'),
  ANSWER_PROVIDER: z
    .enum(['deterministic', 'openai', 'anthropic', 'openrouter', 'ollama'])
    .default('deterministic'),
  ANSWER_MODEL: z.string().optional(),
  ANSWER_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  PROMPT_CONTEXT_TOKEN_BUDGET: z.coerce.number().int().positive().default(1200),
  RERANKER_PROVIDER: z.enum(['deterministic', 'none']).default('deterministic'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com/v1'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434/v1')
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(env);
}
