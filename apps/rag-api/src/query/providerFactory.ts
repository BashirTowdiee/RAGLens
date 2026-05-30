import type { AppConfig } from '../config.js';
import {
  AnswerProviderError,
  DeterministicAnswerProvider,
  type AnswerProvider,
  type AnswerProviderResult
} from './answerProvider.js';
import type { QueryPrompt } from './promptBuilder.js';

const DEFAULT_MODELS = {
  deterministic: 'deterministic-context-preview-v1',
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-3-5-haiku-latest',
  openrouter: 'openai/gpt-4.1-mini',
  ollama: 'qwen3:8b'
} as const;

type ProviderName = AppConfig['ANSWER_PROVIDER'];

type OpenAiCompatibleProviderConfig = {
  provider: Exclude<ProviderName, 'anthropic' | 'deterministic'>;
  apiKey?: string;
  baseUrl: string;
  model: string;
};

type AnthropicProviderConfig = {
  provider: 'anthropic';
  apiKey?: string;
  baseUrl: string;
  model: string;
};

export function createAnswerProvider(config: AppConfig): AnswerProvider {
  if (config.ANSWER_PROVIDER === 'deterministic') {
    return new DeterministicAnswerProvider();
  }

  if (config.ANSWER_PROVIDER === 'anthropic') {
    return new AnthropicAnswerProvider({
      provider: 'anthropic',
      apiKey: config.ANTHROPIC_API_KEY,
      baseUrl: config.ANTHROPIC_BASE_URL,
      model: config.ANSWER_MODEL ?? DEFAULT_MODELS.anthropic
    });
  }

  if (config.ANSWER_PROVIDER === 'openai') {
    return new OpenAiCompatibleAnswerProvider({
      provider: 'openai',
      apiKey: config.OPENAI_API_KEY,
      baseUrl: config.OPENAI_BASE_URL,
      model: config.ANSWER_MODEL ?? DEFAULT_MODELS.openai
    });
  }

  if (config.ANSWER_PROVIDER === 'openrouter') {
    return new OpenAiCompatibleAnswerProvider({
      provider: 'openrouter',
      apiKey: config.OPENROUTER_API_KEY,
      baseUrl: config.OPENROUTER_BASE_URL,
      model: config.ANSWER_MODEL ?? DEFAULT_MODELS.openrouter
    });
  }

  return new OpenAiCompatibleAnswerProvider({
    provider: 'ollama',
    baseUrl: config.OLLAMA_BASE_URL,
    model: config.ANSWER_MODEL ?? DEFAULT_MODELS.ollama
  });
}

class OpenAiCompatibleAnswerProvider implements AnswerProvider {
  constructor(private readonly config: OpenAiCompatibleProviderConfig) {}

  async generate(input: { question: string; prompt: QueryPrompt }): Promise<AnswerProviderResult> {
    const response = await requestProvider(() =>
      fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          ...authorizationHeaders(this.config.provider, this.config.apiKey),
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: input.prompt.system },
            { role: 'user', content: input.prompt.user }
          ],
          temperature: 0
        })
      }),
      this.config.provider
    );

    const body = await parseProviderJson(response, this.config.provider);
    const answer = extractOpenAiCompatibleAnswer(body);
    if (!answer) {
      throw new AnswerProviderError(
        'provider_invalid_response',
        'Provider response did not include an answer message.',
        this.config.provider,
        false
      );
    }

    return {
      answer,
      provider: this.config.provider,
      model: this.config.model
    };
  }
}

class AnthropicAnswerProvider implements AnswerProvider {
  constructor(private readonly config: AnthropicProviderConfig) {}

  async generate(input: { question: string; prompt: QueryPrompt }): Promise<AnswerProviderResult> {
    const apiKey = requireApiKey(this.config.provider, this.config.apiKey);
    const response = await requestProvider(() =>
      fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 800,
          system: input.prompt.system,
          messages: [{ role: 'user', content: input.prompt.user }]
        })
      }),
      this.config.provider
    );

    const body = await parseProviderJson(response, this.config.provider);
    const answer = extractAnthropicAnswer(body);
    if (!answer) {
      throw new AnswerProviderError(
        'provider_invalid_response',
        'Provider response did not include text content.',
        this.config.provider,
        false
      );
    }

    return {
      answer,
      provider: this.config.provider,
      model: this.config.model
    };
  }
}

function authorizationHeaders(provider: string, apiKey?: string): Record<string, string> {
  if (provider === 'ollama') {
    return {};
  }

  return {
    authorization: `Bearer ${requireApiKey(provider, apiKey)}`
  };
}

function requireApiKey(provider: string, apiKey?: string): string {
  const resolved = apiKey?.trim();
  if (!resolved) {
    throw new AnswerProviderError(
      'provider_unavailable',
      `Missing API key for provider "${provider}".`,
      provider,
      false
    );
  }

  return resolved;
}

async function requestProvider(
  operation: () => Promise<Response>,
  provider: string
): Promise<Response> {
  let response: Response;
  try {
    response = await operation();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'The answer provider request failed.';
    throw new AnswerProviderError('provider_unavailable', message, provider, true);
  }

  if (response.ok) {
    return response;
  }

  const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
  const code = retryable ? 'provider_unavailable' : 'provider_invalid_response';

  throw new AnswerProviderError(
    code,
    `Provider "${provider}" returned HTTP ${response.status}.`,
    provider,
    retryable
  );
}

async function parseProviderJson(response: Response, provider: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AnswerProviderError(
      'provider_invalid_response',
      `Provider "${provider}" returned invalid JSON.`,
      provider,
      false
    );
  }
}

function normalizeTextContent(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function extractOpenAiCompatibleAnswer(body: unknown): string {
  if (!isObject(body)) {
    return '';
  }

  const choices = body['choices'];
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }

  const choice = choices[0];
  if (!isObject(choice)) {
    return '';
  }

  const message = choice['message'];
  if (!isObject(message)) {
    return '';
  }

  return normalizeTextContent(message['content']);
}

function extractAnthropicAnswer(body: unknown): string {
  if (!isObject(body)) {
    return '';
  }

  const content = body['content'];
  if (!Array.isArray(content) || content.length === 0) {
    return '';
  }

  const firstBlock = content[0];
  if (!isObject(firstBlock)) {
    return '';
  }

  return normalizeTextContent(firstBlock['text']);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
