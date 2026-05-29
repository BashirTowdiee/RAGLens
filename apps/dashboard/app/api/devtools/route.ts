import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEvalApiBaseUrl } from '../../lib/evalApi';
import { getRagApiBaseUrl } from '../../lib/ragApi';

const DevToolsRequestSchema = z.object({
  service: z.enum(['rag', 'eval']),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().trim().min(1),
  queryString: z.string().default(''),
  body: z.unknown().optional()
});

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parseResult = DevToolsRequestSchema.safeParse(payload);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_devtools_request',
        issues: parseResult.error.issues
      },
      { status: 400 }
    );
  }

  const { service, method, path, queryString, body } = parseResult.data;
  if (!path.startsWith('/api/v1/')) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_path',
        message: 'Path must start with /api/v1/.'
      },
      { status: 400 }
    );
  }

  const baseUrl = service === 'rag' ? getRagApiBaseUrl() : getEvalApiBaseUrl();
  const targetUrl = buildTargetUrl(baseUrl, path, queryString);
  const startTime = Date.now();

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: buildRequestHeaders(body),
      body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });

    const responseText = await response.text();
    return NextResponse.json({
      ok: response.ok,
      service,
      method,
      url: targetUrl,
      status: response.status,
      durationMs: Date.now() - startTime,
      responseHeaders: {
        'content-type': response.headers.get('content-type'),
        'x-request-id': response.headers.get('x-request-id')
      },
      body: parseResponseBody(responseText)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service,
        method,
        url: targetUrl,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unable to reach backend service.'
      },
      { status: 502 }
    );
  }
}

function buildRequestHeaders(body: unknown): HeadersInit {
  if (body === undefined) {
    return {};
  }

  return {
    'content-type': 'application/json'
  };
}

function parseResponseBody(responseText: string): unknown {
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function buildTargetUrl(baseUrl: string, path: string, queryString: string): string {
  const sanitizedBaseUrl = baseUrl.replace(/\/$/, '');
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  const trimmedQueryString = queryString.trim().replace(/^\?/, '');

  if (!trimmedQueryString) {
    return `${sanitizedBaseUrl}${sanitizedPath}`;
  }

  return `${sanitizedBaseUrl}${sanitizedPath}?${trimmedQueryString}`;
}
