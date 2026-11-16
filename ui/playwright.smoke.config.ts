import { existsSync } from 'node:fs';

import { defineConfig } from '@playwright/test';

/**
 * Smoke run for the strangler UI against the migrated database.
 *
 *   npm --prefix ui run build      # or reuse an existing .next
 *   npm --prefix ui run start      # :3300
 *   npm start                      # API :3101
 *   npx playwright test -c playwright.smoke.config.ts
 *
 * Not part of `npm test` on purpose: it needs both servers and real data.
 */
/**
 * Reuse the Chromium this machine already downloaded when it is there; otherwise
 * fall back to Playwright's own resolution (`npx playwright install chromium`).
 */
const CACHED_CHROMIUM = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const EXECUTABLE =
  process.env.SMOKE_CHROMIUM ?? (existsSync(CACHED_CHROMIUM) ? CACHED_CHROMIUM : undefined);

export default defineConfig({
  testDir: './e2e-smoke',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.UI_URL ?? 'http://localhost:3300',
    launchOptions: EXECUTABLE ? { executablePath: EXECUTABLE } : {},
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
});
