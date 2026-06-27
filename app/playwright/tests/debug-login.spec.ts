import { test, expect } from '@playwright/test';

test('debug clerk login result object', async ({ page }) => {
  // Listen to browser console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  const email = process.env.E2E_CLERK_EMAIL;
  const password = process.env.E2E_CLERK_PASSWORD;
  
  if (!email || !password) {
    throw new Error('E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD must be defined.');
  }

  console.log(`Attempting debug login for: ${email}`);
  await page.goto('/login');

  const emailInput = page.locator('input[type="email"], input[name="identifier"]');
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);

  const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]:has-text("Continue")');
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
  }

  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 15000 });
  await passwordInput.fill(password);

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  // Wait a few seconds to let console logs print
  await page.waitForTimeout(5000);
});
