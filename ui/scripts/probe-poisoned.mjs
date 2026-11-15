import { chromium } from '@playwright/test';

// Reproduces a browser that still has junk from the earlier redirect loop.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

await page.goto('http://localhost:3200/signin');
await page.evaluate(() =>
  localStorage.setItem(
    'post_auth_redirect',
    '/signin?redirect=%2Fsignin%3Fredirect%3D%252Fchats',
  ),
);
await page.reload({ waitUntil: 'networkidle' });
await page.fill('input[placeholder="email"]', 'local@curio.test');
await page.fill('input[placeholder="password"]', 'localpassword123');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(7000);
console.log('url:', page.url());
console.log('body:', (await page.innerText('body')).replace(/\n+/g, ' | ').slice(0, 200));
console.log('errors:', errs.slice(0, 2));
await browser.close();
