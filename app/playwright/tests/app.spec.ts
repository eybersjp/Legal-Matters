import { test, expect } from '@playwright/test';

const matterId = process.env.E2E_CLERK_EMAIL ? 'd5555555-5555-5555-5555-555555555555' : 'mock-matter-1';

async function loginAsTestUser(page: any, context: any) {
  if (process.env.E2E_CLERK_EMAIL && process.env.E2E_CLERK_PASSWORD) {
    await page.goto('/login');
    
    // 1. Fill email/identifier
    const emailInput = page.locator('input[type="email"], input[name="identifier"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(process.env.E2E_CLERK_EMAIL);
    
    // 2. Click Continue if it's a multi-step Clerk flow
    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]:has-text("Continue")');
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }
    
    // 3. Fill password
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await passwordInput.fill(process.env.E2E_CLERK_PASSWORD);
    
    // 4. Click Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    
    // 5. Wait for redirect or check for explicit errors
    const errors = [
      'Additional authentication steps are required',
      'Invalid credentials',
      'Authentication failed',
      'incorrect',
      'error'
    ];
    
    try {
      await page.waitForURL(/.*dashboard.*/, { timeout: 20000 });
    } catch (err) {
      for (const errorText of errors) {
        if (await page.locator(`text=${errorText}`).first().isVisible()) {
          throw new Error(`E2E Auth Failure: Clerk returned "${errorText}" error during login.`);
        }
      }
      throw new Error(`E2E Auth Failure: Timeout waiting for dashboard redirect. Current URL: ${page.url()}`);
    }
  } else {
    const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3333';
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: baseUrl
    }]);
  }
}

test.describe('Legal Matters E2E Workspace Verification', () => {
  
  test('1. Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=The operating system for South African').first()).toBeVisible();
    await expect(page.locator('text=Designed for POPIA-conscious operations').first()).toBeVisible();
  });

  test('2. Auth pages (login & register) render successfully', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Email Address').first()).toBeVisible();
    await expect(page.locator('text=Password').first()).toBeVisible();

    await page.goto('/register');
    await expect(page.locator('text=LPC Practice Number').first()).toBeVisible();
  });

  test('3. Route protection prevents unauthenticated access', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('4. Logged-in user can access administrative dashboard', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    await page.goto('/dashboard');
    await expect(page.locator('text=Admin Dashboard').first()).toBeVisible();
  });

  test('5. Main navigation links redirect correctly', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    await page.goto('/dashboard');

    await page.click('text=Clients Registry');
    await expect(page).toHaveURL(/.*clients.*/);

    await page.click('text=Matters Registry');
    await expect(page).toHaveURL(/.*matters.*/);

    await page.click('text=Documents Vault');
    await expect(page).toHaveURL(/.*documents.*/);
  });

  test('6. Global Documents Vault search and loading', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    await page.goto('/dashboard/documents');
    await expect(page.locator('text=Documents Vault').first()).toBeVisible();
    
    const searchInput = page.locator('input[placeholder*="Search documents"]');
    await expect(searchInput).toBeVisible();
  });

  test('7. Notifications Center bell panel acts reactively', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    await page.goto('/dashboard');
    
    const bellBtn = page.locator('button[aria-label*="unread notifications"]');
    await expect(bellBtn).toBeVisible();
    
    await bellBtn.click();
    await expect(page.locator('text=Notifications Center')).toBeVisible();
  });

  test('8. Mobile responsiveness navigation menu works', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    const menuBtn = page.locator('button[aria-label*="Toggle Navigation Menu"]');
    await expect(menuBtn).toBeVisible();
    
    await menuBtn.click();
    // Target the link inside the mobile side menu overlay specifically
    const clientLink = page.locator('aside.lg\\:hidden >> text=Clients Registry');
    await expect(clientLink).toBeVisible();
  });

  test('9. Invalid login credentials display clear error warning', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'fail@example.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');

    // Handle both Clerk real and mock auth error states gracefully
    const errorLocator = page.locator('text=Invalid credentials').or(page.locator('text=Authentication failed').or(page.locator('text=incorrect')));
    await expect(errorLocator.first()).toBeVisible();
  });

  test('10. Successful practitioner login redirects dynamically to dashboard', async ({ page, context }) => {
    await loginAsTestUser(page, context);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('11. Authenticated user without active firm workspace is handled clearly', async ({ page }) => {
    // Only verify mock case locally, bypass remote as it requires a specific un-linked user
    if (process.env.E2E_CLERK_EMAIL) {
      console.log('Skipping User Without Firm test in staging environment');
      return;
    }
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nofirm@example.com');
    await page.fill('input[type="password"]', 'valid_password');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=no firm workspace has been linked yet').first()).toBeVisible();
  });

  test('12. Matter Documents Hub workflow works (AI summary, details drawer, approval)', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    // Navigate to Matter Documents page
    await page.goto(`/dashboard/matters/${matterId}/documents`);
    await expect(page.locator('text=Document Hub').first()).toBeVisible();

    // Verify document records are listed
    await expect(page.locator('text=Summons and Particulars of Claim').first()).toBeVisible();
    await expect(page.locator('text=Client Interview Notes').first()).toBeVisible();

    // Click on Client Interview Notes to open details panel
    await page.click('text=Client Interview Notes');

    // Verify detail panel elements are visible
    await expect(page.locator('text=Vault Metadata').first()).toBeVisible();
    await expect(page.locator('text=AI Summary Hub').first()).toBeVisible();
    await expect(page.locator('text=Placeholder Document Summary').first()).toBeVisible();

    // Perform approval action
    const approveBtn = page.locator('button:has-text("Approve Summary")').first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify success banner is shown
    await expect(page.locator('text=AI summary was successfully approved').first()).toBeVisible();
  });

  test('13. Matter Control Center tabs navigation and elements load', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    await page.goto(`/dashboard/matters/${matterId}`);
    
    // Check tabs are visible
    await expect(page.locator('button:has-text("Overview")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Timeline")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Tasks")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Deadlines")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Billing & Ledgers")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Close Matter")').first()).toBeVisible();

    // Navigate to Tasks tab
    await page.click('button:has-text("Tasks")');
    await expect(page.locator('text=Matter Action Items').first()).toBeVisible();

    // Navigate to Deadlines tab
    await page.click('button:has-text("Deadlines")');
    await expect(page.locator('text=Calculated Court Deadlines').first()).toBeVisible();

    // Navigate to Billing tab
    await page.click('button:has-text("Billing & Ledgers")');
    await expect(page.locator('text=Case Financial Ledger').first()).toBeVisible();

    // Navigate to Close Matter tab
    await page.click('button:has-text("Close Matter")');
    await expect(page.locator('text=LPC Guided Case Closure Checklist').first()).toBeVisible();
  });
});
