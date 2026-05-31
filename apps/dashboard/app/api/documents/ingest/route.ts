import { NextResponse } from 'next/server';
import { ingestDocument, type IngestDocumentRequest } from '../../../lib/ragApi';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as IngestDocumentRequest | null;

  if (!body) {
    return NextResponse.json(
      {
        error: 'invalid_request_body',
        message: 'Request body must be valid JSON.'
      },
      { status: 400 }
    );
  }

  const result = await ingestDocument(body);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'document_ingestion_failed',
        message: result.error
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}
