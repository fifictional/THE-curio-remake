import { NextResponse, NextRequest } from 'next/server';

/**
 * Patched for the remake: forwards document creation to the new API, which
 * writes the Document + a PENDING Task. The polling worker processes it (the
 * old path relied on a DynamoDB stream -> SQS -> ECS -> Step Functions).
 */
export const POST = async (req: NextRequest) => {
  const body = await req.json();
  const api = process.env.API_ORIGIN ?? 'http://localhost:3101';

  const res = await fetch(`${api}/documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
    body: JSON.stringify({
      originalKey: body.originalKey,
      fileName: body.fileName,
      type: body.type ?? 'file',
      spaceUuid: body.spaceUuid ?? null,
      documentUuid: body.documentUuid,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || payload.success === false) {
    return NextResponse.json({ error: payload.error ?? 'Failed to store document' }, { status: 500 });
  }

  return NextResponse.json(payload);
};
