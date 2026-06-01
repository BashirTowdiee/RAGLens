import type { AppConfig } from '../config.js';
import { parseConfig } from '../config.js';
import type { Reranker } from '../documents/reranker.js';
import { DeterministicReranker, NoopReranker } from '../documents/reranker.js';
import type { EmbeddingProvider } from '../documents/embeddings.js';
import { resolveEmbeddingProvider } from '../documents/embeddingProviderFactory.js';
import { createAnswerProvider, type AnswerProviderSelection } from '../query/providerFactory.js';
import type { AnswerProvider } from '../query/answerProvider.js';

export type RuntimeSettingOption = {
  value: string;
  label: string;
};

export type RuntimeSettingField = {
  key: string;
  label: string;
  description: string;
  kind: 'text' | 'url' | 'number' | 'select' | 'secret';
  options?: RuntimeSettingOption[];
};

export type RuntimeSettingSection = {
  id: string;
  title: string;
  description: string;
  fields: RuntimeSettingField[];
};

export const ragRuntimeSettingSections: RuntimeSettingSection[] = [
  {
    id: 'rag-query-runtime',
    title: 'RAG query runtime',
    description: 'Default query behavior used when a request does not override values via ragConfigId.',
    fields: [
      {
        key: 'ANSWER_PROVIDER',
        label: 'answer provider',
        description: 'Default provider used by /api/v1/query.',
        kind: 'select',
        options: [
          { value: 'deterministic', label: 'deterministic' },
          { value: 'ollama', label: 'ollama' },
          { value: 'openai', label: 'openai' },
          { value: 'anthropic', label: 'anthropic' },
          { value: 'openrouter', label: 'openrouter' }
        ]
      },
      {
        key: 'ANSWER_MODEL',
        label: 'answer model',
        description: 'Model id for the default answer provider.',
        kind: 'text'
      },
      {
        key: 'ANSWER_PROVIDER_TIMEOUT_MS',
        label: 'answer timeout (ms)',
        description: 'Provider timeout boundary for generated answers.',
        kind: 'number'
      },
      {
        key: 'ANSWER_INPUT_COST_PER_1M_TOKENS',
        label: 'input cost / 1M tokens',
        description: 'Optional accounting price for provider input tokens.',
        kind: 'number'
      },
      {
        key: 'ANSWER_OUTPUT_COST_PER_1M_TOKENS',
        label: 'output cost / 1M tokens',
        description: 'Optional accounting price for provider output tokens.',
        kind: 'number'
      },
      {
        key: 'PROMPT_CONTEXT_TOKEN_BUDGET',
        label: 'prompt context token budget',
        description: 'Maximum context budget for query prompt assembly.',
        kind: 'number'
      }
    ]
  },
  {
    id: 'rag-retrieval-runtime',
    title: 'RAG retrieval runtime',
    description: 'Embedding and reranker defaults used for ingestion and retrieval.',
    fields: [
      {
        key: 'EMBEDDING_PROVIDER',
        label: 'embedding provider',
        description: 'Embedding provider used for ingest/search embedding calls.',
        kind: 'select',
        options: [
          { value: 'ollama', label: 'ollama' },
          { value: 'deterministic', label: 'deterministic' }
        ]
      },
      {
        key: 'EMBEDDING_MODEL',
        label: 'embedding model',
        description: 'Embedding model id.',
        kind: 'text'
      },
      {
        key: 'EMBEDDING_TIMEOUT_MS',
        label: 'embedding timeout (ms)',
        description: 'Timeout boundary for embedding-provider calls.',
        kind: 'number'
      },
      {
        key: 'RERANKER_PROVIDER',
        label: 'reranker provider',
        description: 'Retrieval reranker strategy.',
        kind: 'select',
        options: [
          { value: 'deterministic', label: 'deterministic' },
          { value: 'none', label: 'none' }
        ]
      }
    ]
  },
  {
    id: 'rag-provider-endpoints',
    title: 'Provider endpoints',
    description: 'Base URLs and credentials for provider integrations.',
    fields: [
      {
        key: 'OLLAMA_BASE_URL',
        label: 'ollama base URL',
        description: 'Ollama API endpoint.',
        kind: 'url'
      },
      {
        key: 'OPENAI_BASE_URL',
        label: 'openai base URL',
        description: 'OpenAI API endpoint.',
        kind: 'url'
      },
      {
        key: 'ANTHROPIC_BASE_URL',
        label: 'anthropic base URL',
        description: 'Anthropic API endpoint.',
        kind: 'url'
      },
      {
        key: 'OPENROUTER_BASE_URL',
        label: 'openrouter base URL',
        description: 'OpenRouter API endpoint.',
        kind: 'url'
      },
      {
        key: 'OPENAI_API_KEY',
        label: 'openai api key',
        description: 'Credential for OpenAI provider calls.',
        kind: 'secret'
      },
      {
        key: 'ANTHROPIC_API_KEY',
        label: 'anthropic api key',
        description: 'Credential for Anthropic provider calls.',
        kind: 'secret'
      },
      {
        key: 'OPENROUTER_API_KEY',
        label: 'openrouter api key',
        description: 'Credential for OpenRouter provider calls.',
        kind: 'secret'
      }
    ]
  }
];

const OPTIONAL_VALUE_KEYS = new Set([
  'ANSWER_MODEL',
  'ANSWER_INPUT_COST_PER_1M_TOKENS',
  'ANSWER_OUTPUT_COST_PER_1M_TOKENS',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENROUTER_API_KEY'
]);

type RuntimeUpdatePayload = {
  plainValues: Record<string, string>;
  secretSetValues: Record<string, string>;
  clearSecrets: string[];
};

const runtimeFieldByKey = new Map<string, RuntimeSettingField>(
  ragRuntimeSettingSections.flatMap((section) => section.fields).map((field) => [field.key, field])
);

const runtimeSecretKeys = new Set(
  ragRuntimeSettingSections
    .flatMap((section) => section.fields)
    .filter((field) => field.kind === 'secret')
    .map((field) => field.key)
);

const runtimeNumberKeys = new Set(
  ragRuntimeSettingSections
    .flatMap((section) => section.fields)
    .filter((field) => field.kind === 'number')
    .map((field) => field.key)
);

export class RagRuntimeConfigStore {
  private config: AppConfig;

  constructor(initialConfig: AppConfig) {
    this.config = { ...initialConfig };
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getPromptContextTokenBudget(): number {
    return this.config.PROMPT_CONTEXT_TOKEN_BUDGET;
  }

  getAnswerProviderTimeoutMs(): number {
    return this.config.ANSWER_PROVIDER_TIMEOUT_MS;
  }

  resolveDefaultAnswerProvider(): AnswerProvider {
    return createAnswerProvider(this.getConfig());
  }

  resolveAnswerProviderForSelection(selection: AnswerProviderSelection): AnswerProvider {
    return createAnswerProvider(
      {
        ...this.getConfig(),
        ANSWER_PROVIDER: selection.provider,
        ANSWER_MODEL: selection.model
      }
    );
  }

  resolveEmbeddingProvider(): EmbeddingProvider {
    const config = this.getConfig();
    return resolveEmbeddingProvider(config);
  }

  resolveReranker(): Reranker {
    if (this.config.RERANKER_PROVIDER === 'none') {
      return new NoopReranker();
    }
    return new DeterministicReranker();
  }

  getSectionsWithValues() {
    return ragRuntimeSettingSections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => ({
        ...field,
        value: field.kind === 'secret' ? '' : valueForField(this.config, field.key),
        isSet: isFieldSet(this.config, field.key)
      }))
    }));
  }

  update(payload: RuntimeUpdatePayload): { ok: true } | { ok: false; issues: string[] } {
    const nextConfig: AppConfig = { ...this.config };

    for (const [key, value] of Object.entries(payload.plainValues)) {
      if (!runtimeFieldByKey.has(key) || runtimeSecretKeys.has(key)) {
        continue;
      }
      applyValueToConfig(nextConfig, key, value);
    }

    for (const [key, value] of Object.entries(payload.secretSetValues)) {
      if (!runtimeSecretKeys.has(key)) {
        continue;
      }
      applyValueToConfig(nextConfig, key, value);
    }

    for (const key of payload.clearSecrets) {
      if (!runtimeSecretKeys.has(key)) {
        continue;
      }
      applyValueToConfig(nextConfig, key, '');
    }

    const parseResult = parseRuntimeCandidate(nextConfig);
    if (!parseResult.ok) {
      return parseResult;
    }

    this.config = parseResult.config;
    return { ok: true };
  }
}

function parseRuntimeCandidate(candidate: AppConfig): { ok: true; config: AppConfig } | { ok: false; issues: string[] } {
  try {
    return { ok: true, config: parseConfig(candidate as unknown as Record<string, unknown>) };
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const issues = (error as { issues?: Array<{ message?: string; path?: Array<string | number> }> }).issues;
      return {
        ok: false,
        issues:
          issues?.map((issue) => {
            const key = issue.path?.[0];
            return key ? `${key}: ${issue.message}` : issue.message ?? 'Invalid runtime setting value.';
          }) ?? ['Invalid runtime setting value.']
      };
    }

    return { ok: false, issues: ['Invalid runtime setting value.'] };
  }
}

function applyValueToConfig(config: AppConfig, key: string, rawValue: string): void {
  const value = rawValue.trim();
  if (runtimeNumberKeys.has(key)) {
    if (value.length === 0 && OPTIONAL_VALUE_KEYS.has(key)) {
      (config as unknown as Record<string, unknown>)[key] = undefined;
      return;
    }
    (config as unknown as Record<string, unknown>)[key] = Number(value);
    return;
  }

  if (value.length === 0 && OPTIONAL_VALUE_KEYS.has(key)) {
    (config as unknown as Record<string, unknown>)[key] = undefined;
    return;
  }

  (config as unknown as Record<string, unknown>)[key] = value;
}

function valueForField(config: AppConfig, key: string): string {
  const value = (config as unknown as Record<string, unknown>)[key];
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function isFieldSet(config: AppConfig, key: string): boolean {
  const value = (config as unknown as Record<string, unknown>)[key];
  if (value === undefined || value === null) {
    return false;
  }
  return String(value).trim().length > 0;
}
