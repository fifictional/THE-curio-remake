import { NextResponse, NextRequest } from 'next/server';

/**
 * Patched for the remake.
 *
 * The original created an empty assistant Message + a Task row in AppSync and
 * let the DynamoDB stream trigger the chat Lambda. Locally there is no stream,
 * so this forwards straight to the new API's /aiChat, which persists both turns
 * and returns them.
 *
 * The caller (`useMessagesByChat`) only checks `response.success`, then relies on
 * realtime to show the reply; the hook refetches instead (see the comment there).
 */
export const POST = async (req: NextRequest) => {
  const body = await req.json();
  const { message, chatUuid } = body ?? {};

  if (!message || !chatUuid) {
    return NextResponse.json({ success: false, error: 'message and chatUuid are required' }, { status: 400 });
  }

  const api = process.env.API_ORIGIN ?? 'http://localhost:3101';
  const res = await fetch(`${api}/aiChat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
    body: JSON.stringify({ chatUuid, message }),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || payload.success === false) {
    return NextResponse.json(
      { success: false, error: (payload.error as string) ?? `aiChat failed (${res.status})` },
      { status: res.status === 200 ? 500 : res.status },
    );
  }

  return NextResponse.json({ success: true, ...payload });
};
