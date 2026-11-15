import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.PW });
const ctx = await browser.newContext();
const page = await ctx.newPage();
let errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:3200/signin', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="email"]', 'local@curio.test');
await page.fill('input[placeholder="password"]', 'localpassword123');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(5000);
for (const r of ['/welcome','/onboarding','/library','/upload','/login']) {
  errs = [];
  await page.goto('http://localhost:3200' + r, { waitUntil: 'networkidle' }).catch(()=>{});
  await page.waitForTimeout(2500);
  const txt = (await page.innerText('body').catch(()=>'')).replace(/\n+/g,' ').slice(0,90);
  console.log(r, '->', page.url().replace('http://localhost:3200',''), '|', txt, '|', errs[0]?.slice(0,80) ?? '');
}
await browser.close();
