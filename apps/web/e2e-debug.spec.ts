import { test, expect } from '@playwright/test';
test('debug web app', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://localhost:5200', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('JS ERRORS:', errors);
  console.log('BODY:', await page.locator('body').innerText());
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  expect(errors).toHaveLength(0);
});
