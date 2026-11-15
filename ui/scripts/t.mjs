import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.PW });
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:3200/signin', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="email"]', 'local@curio.test');
await page.fill('input[placeholder="password"]', 'localpassword123');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(5000);
await page.goto('http://localhost:3200/chats/44444444-4444-4444-8444-444444444444', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
try {
  await page.locator('textarea[placeholder="Ask anything..."]').first().type('hello world', { timeout: 8000 });
  console.log('typed ok');
} catch { console.log('typing STILL times out'); }
const v = await page.evaluate(() => document.querySelector('textarea[placeholder="Ask anything..."]')?.value ?? 'n/a');
console.log('value:', JSON.stringify(v));
await browser.close();
