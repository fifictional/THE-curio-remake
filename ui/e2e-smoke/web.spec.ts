import { expect, test } from '@playwright/test';

/**
 * Browser checks for the NEW UI (`web/`, TanStack Start).
 *
 * Self-contained: it signs up a throwaway account through the API, so it runs
 * against an empty database too (CI), and deletes the account at the end.
 * Data-rich assertions run only when SMOKE_EMAIL/SMOKE_PASSWORD point at a
 * seeded user.
 *
 * Requires: API on :3101 and the web dev/prod server on :5173.
 */

const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:3101';

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

function watch(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon|vite/i.test(msg.text())) {
      errors.push(msg.text().slice(0, 160));
    }
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message.slice(0, 160)}`));
  return errors;
}

test('new UI: signed-out gates, a throwaway account, and the empty states', async ({
  context,
  page,
}) => {
  const errors = watch(page);

  for (const path of ['/', '/library', '/settings']) {
    const res = await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle' });
    expect(res?.status(), path).toBe(200);
    expect(await page.locator('body').innerText(), path).toContain('Sign in to continue');
  }

  const email = `web-verify-${stamp}@curio.test`;
  const password = 'verify-password-123';

  const signUp = await context.request.post(`${API}/api/auth/sign-up/email`, {
    data: { email, password, name: 'Web Verify' },
    headers: { origin: WEB },
  });
  expect(signUp.status(), 'sign-up').toBe(200);
  const signIn = await context.request.post(`${API}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { origin: WEB },
  });
  expect(signIn.status(), 'sign-in').toBe(200);

  // Library: empty state, not a crash.
  await page.goto(`${WEB}/library`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Your library')).toBeVisible();
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  // Bad ids are "not found", never a 500.
  for (const [path, text] of [
    [`/documents/${crypto.randomUUID()}`, 'Document not found'],
    [`/spaces/${crypto.randomUUID()}`, 'Folder not found'],
  ] as const) {
    const res = await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle' });
    expect(res?.status(), path).toBe(200);
    await expect(page.getByText(text)).toBeVisible();
  }

  // Chat: a message round-trips (mock reply without a key) and the page updates.
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
  await page.locator('input[placeholder="Ask Curio anything…"]').fill('hello from the verify spec');
  await page.getByRole('button', { name: 'Send' }).click();
  // Twice, legitimately: the user's message and the mock reply quoting it.
  await expect(page.getByText('hello from the verify spec').first()).toBeVisible({
    timeout: 15_000,
  });

  // Settings shows the account and offers export.
  await page.goto(`${WEB}/settings`, { waitUntil: 'networkidle' });
  await expect(page.getByText(email).first()).toBeVisible();
  expect(await page.locator('a[href="/account/export"]').count()).toBe(1);

  expect(errors, errors.join(' | ')).toHaveLength(0);

  // Clean up: delete the account (cascades rows) and prove the session died.
  const deleted = await context.request.delete(`${API}/account`, {
    data: { confirmEmail: email },
    headers: { origin: WEB },
  });
  expect(deleted.status(), 'delete account').toBe(200);
  expect((await context.request.get(`${API}/me`)).status()).toBe(401);
});

test('new UI: seeded data renders when credentials are provided', async ({ context, page }) => {
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  test.skip(!email || !password, 'set SMOKE_EMAIL/SMOKE_PASSWORD to check seeded data');

  const signIn = await context.request.post(`${API}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { origin: WEB },
  });
  expect(signIn.status()).toBe(200);
  const errors = watch(page);

  // Library has documents.
  await page.goto(`${WEB}/library`, { waitUntil: 'networkidle' });
  expect(await page.locator('a[href^="/documents/"]').count()).toBeGreaterThan(0);

  // Search narrows the list.
  const before = await page.locator('a[href^="/documents/"]').count();
  await page.locator('input[placeholder="Search documents…"]').fill('dummy');
  await expect
    .poll(async () => page.locator('a[href^="/documents/"]').count(), { timeout: 5_000 })
    .toBeLessThan(before);

  // A document page renders its summary.
  await page.locator('input[placeholder="Search documents…"]').fill('');
  await page.locator('a[href^="/documents/"]').first().click();
  await expect(page.getByText(/summary/i).first()).toBeVisible();
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(300);

  expect(errors, errors.join(' | ')).toHaveLength(0);
});
