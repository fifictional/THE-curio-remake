import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const page = await (await browser.newContext()).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0,120)));
await page.goto('http://localhost:3200/signin', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="email"]', 'local@curio.test');
await page.fill('input[placeholder="password"]', 'localpassword123');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(5000);
await page.goto('http://localhost:3200/chats/44444444-4444-4444-8444-444444444444', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
// type without playwright's stability checks
await page.evaluate(() => document.querySelector('textarea[placeholder="Ask anything..."]').focus());
await page.keyboard.type('hello world', { delay: 20 });
await page.waitForTimeout(800);
const v = await page.evaluate(() => document.querySelector('textarea[placeholder="Ask anything..."]')?.value ?? 'n/a');
console.log('typed value:', JSON.stringify(v));
// click something to check the UI no longer freezes
await page.click('text=Biology', { timeout: 5000 }).then(()=>console.log('click ok')).catch(()=>console.log('click failed'));
await page.waitForTimeout(1500);
console.log('url after click:', page.url());
console.log('errors:', errs.slice(0,2));
await browser.close();
