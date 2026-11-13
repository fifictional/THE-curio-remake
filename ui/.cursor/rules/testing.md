# Testing Rules

This project uses three testing layers: **unit tests** (Vitest), **end-to-end tests** (Playwright), and **component documentation/testing** (Storybook). Use the right layer for the change you make and run the relevant commands before considering the task complete.

---

## Overview

| Layer | Tool | Purpose |
|-------|------|---------|
| **Unit** | Vitest | Logic, utilities, AI client, providers, Lambda helpers. Fast, no browser. |
| **E2E** | Playwright | Full user flows in the app (auth, upload, chat, documents, gifting, etc.). Runs against dev server. |
| **Component** | Storybook | Isolate and document UI components; a11y addon; optional Vitest integration for story-based tests. |

---

## Unit Tests (Vitest)

### Config & location

- **Config**: `vitest.config.ts` at project root. Resolve aliases match `tsconfig` (e.g. `@ai-client`, `@ai-providers`, `@database-schema`). Tests exclude `node_modules`, `dist`, and `e2e`.
- **Timeout**: Default test timeout 60s (`testTimeout: 60000`).
- **Where tests live**: Co-located in `__tests__` folders next to the code they test:
  - `amplify/ai/__tests__/` – AI client
  - `amplify/ai/providers/__tests__/` – GPT provider, Gemini provider, extract helpers
  - `amplify/ai/agents/chat/__tests__/` – e.g. query-understanding-agent
  - `amplify/functions/<name>/__tests__/` – e.g. subscription-update (handler, validation, services)

### Conventions

- Use `describe` / `test` (or `it`) and `expect` from `vitest`.
- Mock external deps with `vi.mock()` (e.g. `@ai-providers/index` to avoid real provider init). Use `vi.fn()` for callbacks.
- Reset state in `beforeEach` (e.g. clear ProviderResolver, reset mocks with `vi.clearAllMocks()`).
- Test one concern per test; use descriptive names (e.g. "should return provider rate limit error when provider throws ProviderRateLimitError").

### Commands

```bash
npm run test              # Run all unit tests (watch mode in dev)
npm run test -- --run     # Single run (e.g. for CI)
```

### Adding unit tests

- **New logic or util**: Add a `__tests__` folder next to the module and a `*.test.ts` (or `.spec.ts`) file.
- **Bug fix**: If the bug is in testable logic (e.g. AI client, validation, subscription handler), add or update a unit test that would have caught it.
- **Amplify/backend**: Unit tests for Lambda handlers or shared code live under `amplify/functions/<name>/__tests__/` or `amplify/ai/**/__tests__/`.

---

## End-to-End Tests (Playwright)

### Config & location

- **Config**: `playwright.config.ts` at project root.
- **Test directory**: `e2e/` – all E2E specs live here (e.g. `auth.spec.ts`, `document-processing.spec.ts`, `chat.spec.ts`, `gifting.spec.ts`).
- **Base URL**: `http://localhost:3000`. Optional override (e.g. `https://dev.curio.to`) is commented in config.
- **Web server**: Playwright can start the app with `npm run dev` and wait for the URL; `reuseExistingServer: !process.env.CI` so local runs reuse an existing dev server.
- **Timeout**: 300s per test (`timeout: 300000`); document processing and chat flows can be slow.
- **CI**: `forbidOnly: !!process.env.CI` – fails the build if `test.only` or `describe.only` is left in code. Retries: 2 on CI; 0 locally. Workers: 1 on CI for stability.
- **Artifacts**: `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`. Use the HTML report to inspect failures.

### Browsers

- Projects: Chromium, Firefox, WebKit (Desktop Chrome, Firefox, Safari). Mobile projects are commented out.

### Helpers

Shared E2E helpers live in `e2e/helpers/`:

- **auth-helpers.ts** – `login`, `goToSignIn`, `goToSignUp`, `waitForAuthForm`, `fillSignUpForm`, etc.
- **upload-helpers.ts** – `uploadDocument` (uses test docs from `e2e/test_docs/`).
- **chat-helpers.ts** – `verifyChatMessageFlow` and chat-related helpers.
- **gifting-helpers.ts** – Gifting flow helpers.
- **quiz-helpers.ts** – Quiz flow helpers.
- **subscription-helpers.ts** – Subscription/checkout helpers.
- **fixtures.ts**, **test-utils.ts** – Shared fixtures and utilities.

Use these in specs to keep tests readable and avoid duplication.

### Conventions

- Use `test.describe` for grouping; `test.beforeEach` for login or shared setup when many tests need an authenticated session.
- Prefer stable selectors: `page.getByTestId('...')` when available, or `page.getByRole`, `page.getByText`; avoid fragile class-based selectors.
- For async UI (e.g. “Analyzing document”, summary streaming), use `waitFor` or `expect(...).toBeVisible({ timeout: ... })` with generous timeouts where the backend is slow.
- Test data: use `e2e/test_docs/` for uploads (e.g. `integrals.pdf`, `math notes.jpg`). Credentials (e.g. TEST_EMAIL, TEST_PASSWORD) are in the spec or env; do not commit real secrets.

### Commands

```bash
npm run test:e2e           # Run all E2E tests (starts dev server if needed)
npm run test:e2e:ui       # Open Playwright UI to run/debug tests
npm run test:e2e:debug    # Run with Playwright Inspector (step through)
npm run test:e2e:report   # Open last HTML report (screenshots, trace)
```

### Adding or changing E2E tests

- **New flow**: Add a new `e2e/<feature>.spec.ts` and use helpers from `e2e/helpers/` where possible. Reuse `login()` and existing helpers (upload, chat, etc.) so specs stay short.
- **Bug fix**: If the bug is in a user flow (e.g. upload, chat, gifting), add or update an E2E test that would have caught it. Prefer one focused test over a single huge spec.
- **Flakiness**: Prefer waiting for visible state or network over fixed `setTimeout`. Use `page.waitForURL`, `expect(...).toBeVisible({ timeout })`, or wait for a specific element that indicates the step is done.
- **CI**: Do not leave `test.only` or `describe.only` in committed code; CI will fail.

---

## Storybook

### Purpose

- Develop and document UI components in isolation.
- Check accessibility (addon-a11y).
- Optionally run story-based tests via `@storybook/addon-vitest` (configured in project; Vitest integration may be disabled in `vitest.config.ts`).

### Config & stories

- **Config**: `.storybook/main.ts` – framework `@storybook/nextjs-vite`; stories from `../src/**/*.stories.@(js|jsx|mjs|ts|tsx)` and `*.mdx`.
- **Addons**: Chromatic, addon-vitest, addon-a11y, addon-docs, addon-onboarding.
- **Preview/setup**: `.storybook/preview.*` and `.storybook/vitest.setup.ts` (e.g. for a11y and portable stories).

### Commands

```bash
npm run storybook        # Dev server on port 6006
npm run build-storybook  # Build static Storybook
```

### When to use Storybook

- Adding or changing a reusable UI component: add or update a story so the component can be verified in isolation and a11y can be checked.
- Documenting variants (e.g. button sizes, states): use multiple stories or args.

---

## Verification Before Completing a Task

1. **Type-check**: `npm run type-check` (Next.js + Amplify). Must pass.
2. **Lint**: `npm run lint`. Fix any new issues in changed files.
3. **Unit tests**: `npm run test` (or `npm run test -- --run`). If you changed logic that has unit tests, run them and add/update tests as needed.
4. **E2E**: For bug fixes or features that affect user flows, run the relevant E2E specs (e.g. `npm run test:e2e -- document-processing`) or full suite. Ensure no `test.only`/`describe.only` is committed.

See **debugging.md** for how to run tests in debug mode (E2E UI, Inspector, report) and how to interpret failures.

---

## When to Add or Update Tests

| Change type | Prefer |
|-------------|--------|
| **Bug fix (logic)** | Unit test that reproduces the bug and asserts the fix (e.g. AI client, validation, subscription handler). |
| **Bug fix (UI flow)** | E2E test that performs the user action and asserts the correct outcome (or update existing E2E that covers that flow). |
| **New feature (logic)** | Unit tests for new or modified functions, handlers, or services. |
| **New feature (user flow)** | E2E test for the happy path (and critical alternates if needed). |
| **New or changed UI component** | Storybook story (and a11y check). Optionally story-based Vitest tests if the addon is enabled. |

---

## Never

- Commit with `test.only` or `describe.only` (CI will fail).
- Skip running type-check and lint before considering the task complete.
- Add E2E tests that depend on hardcoded production data or secrets; use test accounts and test data (e2e/test_docs, fixtures).
- Introduce a new test framework; use Vitest for unit tests and Playwright for E2E (see **stack.md**).
