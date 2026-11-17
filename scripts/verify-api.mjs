#!/usr/bin/env node
/**
 * API contract sweep: the security boundary, the bridge, retrieval and the
 * document pipeline, over HTTP against a running server.
 *
 *   npm run verify:api
 *   API_URL=http://localhost:3101 npm run verify:api
 *
 * Self-contained on purpose: it creates its own users, its own chat, its own PDF
 * and its own document, then deletes the accounts at the end (which removes the
 * rows, files and vectors). Nothing to seed, nothing to clean up by hand, safe to
 * run against CI or your local database.
 */

const API = process.env.API_URL ?? 'http://localhost:3101';
const results = [];

const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 160) });
};

const json = async (path, init = {}, cookie) => {
  const headers = { origin: API, ...(init.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  if (init.body && typeof init.body === 'string') headers['content-type'] ??= 'application/json';

  const res = await fetch(API + path, { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
};

const cookieOf = (res) =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');

/** A one-page PDF with a sentence in it — enough for text extraction and search. */
function tinyPdf(text) {
  const stream = `BT /F1 18 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  objects.forEach((body, i) => {
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += '0000000000 00000 n \n';
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n0\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emailA = `verify-a-${stamp}@curio.test`;
const emailB = `verify-b-${stamp}@curio.test`;
const password = 'verify-password-123';

async function makeUser(email) {
  const signUp = await json('/api/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Verify' }),
  });
  check(`sign-up ${email.split('@')[0]} → 200`, signUp.status === 200, signUp.status);

  const signIn = await json('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  check(`sign-in ${email.split('@')[0]} → 200`, signIn.status === 200, signIn.status);

  const cookie = cookieOf(signIn);
  const me = await json('/me', {}, cookie);
  return { cookie, sub: me.body?.user?.sub };
}

async function main() {
  console.log(`API: ${API}\n`);

  /* ---------------- anonymous boundary ---------------- */
  for (const path of ['/me', '/messages?chat=x', '/files?key=x', '/rag/search?q=x']) {
    const res = await json(path);
    check(`anonymous ${path.split('?')[0]} → 401`, res.status === 401, res.status);
  }
  for (const [path, body] of [
    ['/aiChat', JSON.stringify({ chatUuid: 'x', message: 'hi' })],
    ['/log', '{}'],
    ['/db', JSON.stringify({ model: 'Chat', method: 'list' })],
  ]) {
    const res = await json(path, { method: 'POST', body });
    check(`anonymous POST ${path} → 401`, res.status === 401, res.status);
  }
  const hello = await json('/__hello');
  check('/__hello → 200', hello.status === 200, hello.status);
  check('/db/health → models', hello.status === 200 && (await json('/db/health')).body.models > 20);

  /* ---------------- two users, real sessions ---------------- */
  const a = await makeUser(emailA);
  const b = await makeUser(emailB);
  check('distinct users', Boolean(a.sub && b.sub && a.sub !== b.sub));
  const wrong = await json('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password: 'wrong-password' }),
  });
  check('wrong password rejected', wrong.status >= 400, wrong.status);

  /* ---------------- chat + messages isolation ---------------- */
  const chatUuid = crypto.randomUUID();
  const created = await json(
    '/db',
    { method: 'POST', body: JSON.stringify({ model: 'Chat', method: 'create', args: { chatUuid, name: 'verify' } }) },
    a.cookie,
  );
  check('A creates a chat (ownership defaults to caller)', created.body?.data?.userUuid === a.sub, created.status);

  const ownMsgs = await json(`/messages?chat=${chatUuid}`, {}, a.cookie);
  check('A reads own chat → 200', ownMsgs.status === 200, ownMsgs.status);
  const foreignMsgs = await json(`/messages?chat=${chatUuid}`, {}, b.cookie);
  check('B reads A chat → 404', foreignMsgs.status === 404, foreignMsgs.status);

  const postA = await json('/messages', { method: 'POST', body: JSON.stringify({ chatUuid, role: 'user', content: 'hello' }) }, a.cookie);
  check('A posts a message → 200', postA.status === 200, postA.status);
  for (const [label, path, body] of [
    ['B posts into A chat', '/messages', JSON.stringify({ chatUuid, role: 'user', content: 'x' })],
    ['B /aiChat into A chat', '/aiChat', JSON.stringify({ chatUuid, message: 'x' })],
    ['B /moveChat A chat', '/moveChat', JSON.stringify({ chatUuid, spaceUuid: crypto.randomUUID() })],
  ]) {
    const res = await json(path, { method: 'POST', body }, b.cookie);
    check(`${label} → 404`, res.status === 404, res.status);
  }

  /* ---------------- files + documents ---------------- */
  const keyA = `student-documents/${a.sub}/verify/file.pdf`;
  const upload = await fetch(`${API}/files?key=${encodeURIComponent(keyA)}`, {
    method: 'POST',
    headers: { cookie: a.cookie },
    body: new Uint8Array([37, 80, 68, 70]),
  });
  check('A uploads to own prefix → 200', upload.status === 200, upload.status);
  const readOwn = await fetch(`${API}/files?key=${encodeURIComponent(keyA)}`, { headers: { cookie: a.cookie } });
  check('A reads own file → 200', readOwn.status === 200, readOwn.status);
  const readForeign = await fetch(`${API}/files?key=${encodeURIComponent(keyA)}`, { headers: { cookie: b.cookie } });
  check('B reads A file → 404', readForeign.status === 404, readForeign.status);
  const keyB = `student-documents/${b.sub}/verify/file.pdf`;
  const writeForeign = await fetch(`${API}/files?key=${encodeURIComponent(keyB)}`, {
    method: 'POST',
    headers: { cookie: a.cookie },
    body: new Uint8Array([1]),
  });
  check('A uploads to B prefix → 404', writeForeign.status === 404, writeForeign.status);

  const badDoc = await json('/api/documents', { method: 'POST', body: JSON.stringify({ originalKey: keyB, fileName: 'x.pdf', type: 'application/pdf' }) }, a.cookie);
  check('A creates a document for B key → 404', badDoc.status === 404, badDoc.status);
  await fetch(`${API}/files?key=${encodeURIComponent(keyA)}`, { method: 'DELETE', headers: { cookie: a.cookie } });

  /* ---------------- bridge behaviour ---------------- */
  const unknown = await json('/db', { method: 'POST', body: JSON.stringify({ model: 'NotAModel', method: 'list' }) }, a.cookie);
  check('unknown model → empty list', Array.isArray(unknown.body?.data) && unknown.body.data.length === 0, unknown.status);
  const badId = await json('/db', { method: 'POST', body: JSON.stringify({ model: 'Chat', method: 'get', args: { chatUuid: 'abc' } }) }, a.cookie);
  check('malformed id → 400 (not 500)', badId.status === 400, badId.status);
  const profile = await json('/db', { method: 'POST', body: JSON.stringify({ model: 'UserProfile', method: 'list' }) }, a.cookie);
  check('UserProfile list is self-only', profile.body?.data?.length === 1 && profile.body.data[0].id === a.sub, profile.body?.data?.length);

  /* ---------------- retrieval endpoints ---------------- */
  const noTarget = await json('/rag/reindex', { method: 'POST', body: '{}' }, a.cookie);
  check('reindex without a target → 400', noTarget.status === 400, noTarget.status);
  const noQuery = await json('/rag/search', {}, a.cookie);
  check('search without q → 400', noQuery.status === 400, noQuery.status);
  const search = await json('/rag/search?q=hello', {}, a.cookie);
  check('search → 200 with a mode', search.status === 200 && ['text', 'vector'].includes(search.body?.mode), search.body?.mode);

  /* ---------------- pipeline: upload → summary → citations ---------------- */
  const pdfBytes = tinyPdf('Research ethics require informed consent from every participant');
  const pipeKey = `student-documents/${a.sub}/verify-pipeline/file.pdf`;
  const pipeUpload = await fetch(`${API}/files?key=${encodeURIComponent(pipeKey)}`, {
    method: 'POST',
    headers: { cookie: a.cookie },
    body: pdfBytes,
  });
  check('pipeline: upload PDF → 200', pipeUpload.status === 200, pipeUpload.status);

  const pipeDoc = await json('/api/documents', {
    method: 'POST',
    body: JSON.stringify({ originalKey: pipeKey, fileName: 'verify-policy.pdf', type: 'application/pdf' }),
  }, a.cookie);
  check('pipeline: create document → 200', pipeDoc.status === 200, pipeDoc.status);
  const pipeDocUuid = pipeDoc.body?.document?.documentUuid;

  let task = null;
  for (let i = 0; i < 25; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await json('/db', { method: 'POST', body: JSON.stringify({ model: 'Task', method: 'get', args: { documentUuid: pipeDocUuid } }) }, a.cookie);
    task = res.body?.data ?? null;
    if (task && ['COMPLETED', 'FAILED'].includes(task.status)) break;
  }
  check('pipeline: worker completed the task', task?.status === 'COMPLETED', `${task?.status} ${task?.result}`);

  const summaries = await json('/db', { method: 'POST', body: JSON.stringify({ model: 'DocumentSummary', method: 'list', args: { documentUuid: pipeDocUuid } }) }, a.cookie);
  const summary = summaries.body?.data?.[0]?.summary ?? '';
  check('pipeline: summary written', summary.length > 20, summary.slice(0, 50));
  check('pipeline: no NUL bytes in summary', !summary.includes('\u0000'));

  const grounded = await json('/aiChat', {
    method: 'POST',
    body: JSON.stringify({ chatUuid, message: 'what does research ethics require for consent?' }),
  }, a.cookie);
  check('pipeline: retrieval grounded the answer', (grounded.body?.retrieved ?? 0) > 0, grounded.body?.retrieved);
  check('pipeline: citations recorded', (grounded.body?.citations?.length ?? 0) > 0, grounded.body?.citations?.length);

  const cited = await json('/db', {
    method: 'POST',
    body: JSON.stringify({ model: 'ChatCitation', method: 'listChatCitationByChatUuidAndCreatedAt', args: { chatUuid } }),
  }, a.cookie);
  check('pipeline: Sources data readable by the owner', (cited.body?.data?.length ?? 0) > 0, cited.body?.data?.length);
  const foreignCited = await json('/db', {
    method: 'POST',
    body: JSON.stringify({ model: 'ChatCitation', method: 'listChatCitationByChatUuidAndCreatedAt', args: { chatUuid } }),
  }, b.cookie);
  check('pipeline: citations invisible to another user', (foreignCited.body?.data?.length ?? 0) === 0, foreignCited.body?.data?.length);

  /* ---------------- sign out ---------------- */
  const out = await json('/api/auth/sign-out', { method: 'POST', body: '{}' }, a.cookie);
  check('sign-out → 200', out.status === 200, out.status);
  const afterOut = await json('/me', {}, a.cookie);
  check('after sign-out /me → 401', afterOut.status === 401, afterOut.status);

  /* ---------------- cleanup: delete both accounts ---------------- */
  for (const [label, user, email] of [
    ['A', a, emailA],
    ['B', b, emailB],
  ]) {
    // sign-out above killed A's cookie; sign in again just to delete it.
    const signIn = await json('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) });
    const cookie = cookieOf(signIn) || user.cookie;
    const del = await json('/account', { method: 'DELETE', body: JSON.stringify({ confirmEmail: email }) }, cookie);
    check(`cleanup: delete account ${label}`, del.status === 200, del.status);
  }

  /* ---------------- report ---------------- */
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
  }
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
