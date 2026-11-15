import { chromium } from '@playwright/test';
// Headless smoke probe: sign in, open the chat page, print what rendered and
// any client errors. Requires `npx playwright install chromium` (or an existing
// PLAYWRIGHT_CHROMIUM_PATH).
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.stack || e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) errs.push('[console] ' + m.text()); });

await page.goto('http://localhost:3200/signin', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="email"]', 'local@curio.test');
await page.fill('input[placeholder="password"]', 'localpassword123');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(6000);
console.log('after signin url:', page.url());

await page.goto('http://localhost:3200/chats/44444444-4444-4444-8444-444444444444', { waitUntil: 'networkidle' });
await page.waitForTimeout(7000);
console.log('chat url:', page.url());
const body = (await page.innerText('body')).replace(/\n+/g, ' | ');
console.log('chat body:', body.slice(0, 700));
console.log('--- errors ---');
console.log(errs.slice(0, 3).join('\n=====\n').slice(0, 1500));
await page.screenshot({ path: '/tmp/chat.png', fullPage: false });
await browser.close();
