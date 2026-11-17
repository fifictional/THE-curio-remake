import { expect, test, type BrowserContext, type Page, type Response } from '@playwright/test';

/**
 * Walk the real screens against the real migrated database and report what is
 * broken, in one table.
 *
 * What counts as broken:
 *   - an uncaught exception in the page
 *   - a console error that is not on the known-noise list
 *   - a 5xx response
 *   - Next's error boundary ("Application error" / "Unhandled Runtime Error")
 *
 * What does not: an empty state, a 404 for an unmigrated feature, blocked
 * analytics. Those are recorded and printed so they are visible without
 * failing the run.
 */

const EMAIL = process.env.SMOKE_EMAIL ?? 'test@curio.to';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'localpass123';

/** Third-party noise: no Mixpanel token locally, no Sentry, no CDN. */
const IGNORED_CONSOLE = [
  /mixpanel/i,
  /sentry/i,
  /customer\.io/i,
  /loops\.io/i,
  /paddle/i,
  /favicon/i,
  /Failed to load resource.*(fonts|cdn|jsdelivr|googleapis)/i,
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  // 404s are expected for features that are not migrated; they are reported as
  // notes with the URL instead of failing the run.
  /Failed to load resource/i,
];

const ERROR_TEXT = [
  'Application error',
  'Unhandled Runtime Error',
  'This page could not be found',
  'Something went wrong',
  'NoPermission',
];

interface Finding {
  route: string;
  problem: string;
}

const findings: Finding[] = [];
/** Expected-for-now gaps (unmigrated endpoints), printed but not failures. */
const notes: string[] = [];
const rows: Array<{ route: string; dbRows: number; dbCalls: number; text: number }> = [];

function isIgnoredConsole(text: string): boolean {
  return IGNORED_CONSOLE.some((re) => re.test(text));
}

async function signIn(context: BrowserContext): Promise<void> {
  // Same origin as the app, so Better Auth's cookie is first-party and the
  // Next rewrite is exercised too.
  const res = await context.request.post('/api/auth/sign-in/email', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { origin: 'http://localhost:3300' },
  });
  expect(res.status(), `sign-in as ${EMAIL}: ${await res.text()}`).toBe(200);
}

/** One page of a model through the bridge, with the browser's cookie. */
async function bridge<T = Record<string, unknown>>(
  context: BrowserContext,
  model: string,
  limit = 50,
): Promise<T[]> {
  const res = await context.request.post('/db', {
    data: { model, method: 'list', options: { limit } },
  });
  const body = (await res.json()) as { data?: T[] };
  return body.data ?? [];
}

async function visit(
  page: Page,
  route: string,
  options: { expectText?: RegExp } = {},
): Promise<void> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  let dbCalls = 0;
  let dbRows = 0;

  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!isIgnoredConsole(text)) consoleErrors.push(text);
  };
  const onPageError = (err: Error) => pageErrors.push(err.message);
  const onResponse = async (res: Response) => {
    const url = res.url();
    if (res.status() >= 500) serverErrors.push(`${res.status()} ${url}`);
    if (res.status() === 404 && !/favicon|\.map$|_next\//.test(url)) {
      notes.push(`${route}  404 ${new URL(url).pathname}`);
    }
    if (url.includes('/db') && res.request().method() === 'POST') {
      dbCalls += 1;
      try {
        const body = (await res.json()) as { data?: unknown };
        if (Array.isArray(body.data)) dbRows += body.data.length;
        else if (body.data) dbRows += 1;
      } catch {
        /* non-JSON (error page) — already counted by status */
      }
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  await page.goto(route, { waitUntil: 'domcontentloaded' });
  // The chat page polls every 4s, so `networkidle` never settles.
  await page.waitForTimeout(3_500);

  const text = (await page.locator('body').innerText().catch(() => '')) ?? '';
  const bodyLength = text.length;

  for (const marker of ERROR_TEXT) {
    if (text.includes(marker) && !(options.expectText?.test(marker) ?? false)) {
      findings.push({ route, problem: `rendered "${marker}"` });
    }
  }
  for (const err of pageErrors) findings.push({ route, problem: `uncaught: ${err.slice(0, 200)}` });
  for (const err of consoleErrors) findings.push({ route, problem: `console: ${err.slice(0, 200)}` });
  for (const err of serverErrors) findings.push({ route, problem: `5xx: ${err}` });

  if (options.expectText && !options.expectText.test(text)) {
    findings.push({ route, problem: `missing expected text ${options.expectText}` });
  }

  rows.push({ route: `${page.url().replace(/^http:\/\/[^/]+/, '') || '/'}${page.url().includes(route) ? '' : ' (redirected)'}`, dbRows, dbCalls, text: bodyLength });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('response', onResponse);
}

test('core screens against the migrated database', async ({ context, page }) => {
  await signIn(context);

  const chats = await bridge<{ chatUuid: string }>(context, 'Chat', 5);
  const documents = await bridge<{ documentUuid: string }>(context, 'Document', 5);
  const spaces = await bridge<{ spaceUuid: string }>(context, 'Space', 5);

  const routes: Array<{ route: string; expectText?: RegExp }> = [
    { route: '/', expectText: /Curio/i },
    { route: '/library', expectText: /library|document/i },
    { route: '/settings' },
    { route: '/profile' },
    { route: '/onboarding' },
  ];
  if (chats[0]) routes.push({ route: `/chats/${chats[0].chatUuid}` });
  if (documents[0]) routes.push({ route: `/documents/${documents[0].documentUuid}` });
  if (spaces[0]) {
    routes.push({ route: `/spaces/${spaces[0].spaceUuid}` });
    if (chats[0]) routes.push({ route: `/spaces/${spaces[0].spaceUuid}/chats/${chats[0].chatUuid}` });
  }
  // Ids that do not exist must render a not-found state, not throw.
  routes.push({ route: `/documents/${crypto.randomUUID()}` });
  routes.push({ route: `/chats/${crypto.randomUUID()}` });

  for (const { route, expectText } of routes) {
    await visit(page, route, { expectText });
  }

  // Features dropped on 2026-11-17 must be gone from the URL space, not just
  // hidden: a route that still renders would mean the cleanup missed a link.
  for (const dropped of ['/satus', '/satus-onboarding', '/mock-exams', '/sat-us-exam-bundle']) {
    const res = await context.request.get(dropped);
    expect(res.status(), `${dropped} should be gone (docs/decisions.md)`).toBe(404);
  }

  console.log('\nscreen                                   /db rows  calls  chars');
  for (const row of rows) {
    console.log(
      `${row.route.padEnd(40)} ${String(row.dbRows).padStart(8)} ${String(row.dbCalls).padStart(6)} ${String(row.text).padStart(6)}`,
    );
  }

  if (notes.length) {
    console.log(`\n${notes.length} expected gap(s) (404 from a dropped feature):`);
    for (const note of notes) console.log(`  ${note}`);
  }

  if (findings.length) {
    console.log(`\n${findings.length} finding(s):`);
    for (const f of findings) console.log(`  ${f.route}  ${f.problem}`);
  } else {
    console.log('\nno findings');
  }

  expect(findings, JSON.stringify(findings, null, 2)).toHaveLength(0);
});
