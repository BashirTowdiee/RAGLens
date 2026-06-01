import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEvalApiBaseUrl } from '../../../lib/evalApi';
import { getRagApiBaseUrl } from '../../../lib/ragApi';

export const dynamic = 'force-dynamic';

const RuntimeSettingsUpdateSchema = z.object({
  plainValues: z.record(z.string(), z.string()).default({}),
  secretSetValues: z.record(z.string(), z.string()).default({}),
  clearSecrets: z.array(z.string()).default([])
});

type RuntimeConfigServiceResponse = {
  service: string;
  persistence: string;
  restartRequired: boolean;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      description: string;
      kind: 'text' | 'url' | 'number' | 'select' | 'secret';
      options?: Array<{ value: string; label: string }>;
      value: string;
      isSet: boolean;
    }>;
  }>;
};

export async function GET() {
  const ragBaseUrl = getRagApiBaseUrl();
  const evalBaseUrl = getEvalApiBaseUrl();

  const [ragResult, evalResult] = await Promise.all([
    fetchRuntimeConfig(ragBaseUrl),
    fetchRuntimeConfig(evalBaseUrl)
  ]);

  if (!ragResult.ok || !evalResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'runtime_config_unavailable',
        message: 'Unable to load runtime config from backend services.',
        rag: ragResult,
        eval: evalResult
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    configSurface: 'backend-runtime-config',
    sources: {
      ragApiBaseUrl: ragBaseUrl,
      evalApiBaseUrl: evalBaseUrl
    },
    persistence: mergePersistence(ragResult.data.persistence, evalResult.data.persistence),
    restartRequired: ragResult.data.restartRequired || evalResult.data.restartRequired,
    sections: [
      ...prefixSections('rag', ragResult.data.sections),
      ...prefixSections('eval', evalResult.data.sections)
    ]
  });
}

export async function PUT(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parseResult = RuntimeSettingsUpdateSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_runtime_settings_payload',
        issues: parseResult.error.issues
      },
      { status: 400 }
    );
  }

  const ragBaseUrl = getRagApiBaseUrl();
  const evalBaseUrl = getEvalApiBaseUrl();
  const updatePayload = parseResult.data;

  const [ragUpdate, evalUpdate] = await Promise.all([
    updateRuntimeConfig(ragBaseUrl, updatePayload),
    updateRuntimeConfig(evalBaseUrl, updatePayload)
  ]);

  if (!ragUpdate.ok || !evalUpdate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'runtime_config_update_failed',
        message: 'Unable to update runtime config on backend services.',
        rag: ragUpdate,
        eval: evalUpdate
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Runtime config updated in rag-api and eval-api.',
    configSurface: 'backend-runtime-config',
    sources: {
      ragApiBaseUrl: ragBaseUrl,
      evalApiBaseUrl: evalBaseUrl
    },
    persistence: mergePersistence(ragUpdate.data.persistence, evalUpdate.data.persistence),
    restartRequired: ragUpdate.data.restartRequired || evalUpdate.data.restartRequired,
    sections: [
      ...prefixSections('rag', ragUpdate.data.sections),
      ...prefixSections('eval', evalUpdate.data.sections)
    ]
  });
}

async function fetchRuntimeConfig(baseUrl: string): Promise<
  { ok: true; data: RuntimeConfigServiceResponse } | { ok: false; error: string; status?: number }
> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/runtime-config`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, status: response.status };
    }

    return { ok: true, data: (await response.json()) as RuntimeConfigServiceResponse };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to reach backend service.'
    };
  }
}

async function updateRuntimeConfig(
  baseUrl: string,
  payload: z.infer<typeof RuntimeSettingsUpdateSchema>
): Promise<{ ok: true; data: RuntimeConfigServiceResponse } | { ok: false; error: string; status?: number; body?: unknown }> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/runtime-config`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message?: unknown }).message)
          : `HTTP ${response.status}`;
      return { ok: false, error: message, status: response.status, body };
    }

    return { ok: true, data: body as RuntimeConfigServiceResponse };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to reach backend service.'
    };
  }
}

function prefixSections(
  servicePrefix: 'rag' | 'eval',
  sections: RuntimeConfigServiceResponse['sections']
): RuntimeConfigServiceResponse['sections'] {
  return sections.map((section) => ({
    ...section,
    id: `${servicePrefix}:${section.id}`
  }));
}

function mergePersistence(left: string, right: string): string {
  if (left === right) {
    return left;
  }
  return `${left}+${right}`;
}
