import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().default('postgres://raglens:raglens@localhost:5432/raglens'),
  DOCUMENT_REPOSITORY: z.enum(['memory', 'postgres']).default('postgres')
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(env);
}
