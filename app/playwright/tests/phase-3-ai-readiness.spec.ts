import { test, expect } from '@playwright/test';

const matterId = process.env.E2E_CLERK_EMAIL ? 'd5555555-5555-5555-5555-555555555555' : 'mock-matter-1';
const crossFirmMatterId = 'deaddead-0000-4000-8000-000000000099';

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

test.describe('Phase 3 AI and Readiness E2E Tests', () => {

  test('1. Matter detail page loads with the new tab structure and Phase 2 tabs work', async ({ page, context }) => {
    await loginAsTestUser(page, context);
    await page.goto(`/dashboard/matters/${matterId}`);

    // Verify tabs are visible
    await expect(page.locator('button:has-text("Overview")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Timeline")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Tasks")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Deadlines")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Documents")').first()).toBeVisible();
    await expect(page.locator('button:has-text("AI Summary")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Readiness")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Billing & Ledgers")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Close Matter")').first()).toBeVisible();

    // Verify Phase 2 tabs navigation works
    await page.click('button:has-text("Overview")');
    await expect(page.locator('text=Unresolved Tasks').first()).toBeVisible();

    await page.click('button:has-text("Timeline")');
    await expect(page.locator('text=Chronological Activity log').first()).toBeVisible();

    await page.click('button:has-text("Tasks")');
    await expect(page.locator('text=Matter Action Items').first()).toBeVisible();

    await page.click('button:has-text("Billing & Ledgers")');
    await expect(page.locator('text=Case Financial Ledger').first()).toBeVisible();

    await page.click('button:has-text("Close Matter")');
    await expect(page.locator('text=LPC Guided Case Closure Checklist').first()).toBeVisible();
  });

  test('2. Documents tab displays document intelligence entry points', async ({ page, context }) => {
    await loginAsTestUser(page, context);
    await page.goto(`/dashboard/matters/${matterId}`);

    // Go to Documents tab
    await page.click('button:has-text("Documents")');
    await expect(page.locator('text=Case Documents').first()).toBeVisible();
    await expect(page.locator('text=Go to Document Version Hub →').first()).toBeVisible();
    await expect(page.locator('text=Manage File →').first()).toBeVisible();
  });

  test('3. AI Summary tab displays draft warning banner, citations, and controls', async ({ page, context }) => {
    await loginAsTestUser(page, context);
    await page.goto(`/dashboard/matters/${matterId}`);

    // Go to AI Summary tab
    await page.click('button:has-text("AI Summary")');
    await expect(page.locator('text=AI Summary & Document Intelligence').first()).toBeVisible();

    // Verify warning banner, title, confidence level
    await expect(page.locator('text=Draft AI Output').first()).toBeVisible();
    await expect(page.locator('text=This is a draft AI analysis').first()).toBeVisible();
    await expect(page.locator('text=confidence').first()).toBeVisible();

    // Verify missing information alert
    await expect(page.locator('text=Missing Information Alert').first()).toBeVisible();

    // Verify citations panel is present
    await expect(page.locator('text=Source Citations').first()).toBeVisible();

    // Verify approve/reject controls are present
    await expect(page.locator('button:has-text("Approve Summary")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Reject Draft")').first()).toBeVisible();
  });

  test('4. Approved AI output displays locked/superseded-safe state', async ({ page, context }) => {
    await loginAsTestUser(page, context);
    await page.goto(`/dashboard/matters/${matterId}`);

    // Go to AI Summary tab
    await page.click('button:has-text("AI Summary")');
    
    // Check if there is an Approve Summary button
    const approveBtn = page.locator('button:has-text("Approve Summary")').first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Should show Success Banner / Approved state
    await expect(page.locator('text=AI Summary approved and locked successfully.').first()).toBeVisible();
    await expect(page.locator('text=Approved & Locked').first()).toBeVisible();

    // The draft warning banner and approve/reject buttons should not be visible anymore
    await expect(page.locator('text=Draft AI Output')).not.toBeVisible();
    await expect(page.locator('button:has-text("Approve Summary")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Reject Draft")')).not.toBeVisible();
  });

  test('5. Readiness tab displays scoreboard, blocking items, warnings, and rerun check', async ({ page, context }) => {
    await loginAsTestUser(page, context);
    await page.goto(`/dashboard/matters/${matterId}`);

    // Go to Readiness tab
    await page.click('button:has-text("Readiness")');
    await expect(page.locator('text=LPC Compliance & Case Readiness').first()).toBeVisible();

    // Verify compliance elements
    await expect(page.locator('text=Readiness').first()).toBeVisible(); // From circle gauge
    await expect(page.locator('text=Critical Blocking Issues').first()).toBeVisible();
    await expect(page.locator('text=Warnings & Action Required').first()).toBeVisible();
    await expect(page.locator('text=Passed Compliance Audits').first()).toBeVisible();

    // Verify disclaimer
    await expect(page.locator('text=Advisory Disclaimer:').first()).toBeVisible();

    // Verify rerun button works
    const rerunBtn = page.locator('button:has-text("Rerun Compliance Scan")').or(page.locator('button:has-text("Run Compliance Scan")')).first();
    await expect(rerunBtn).toBeVisible();
    await rerunBtn.click();

    // Rerun success notification / loader sanity check
    await expect(page.getByText('Scanning').or(page.getByText('Last Scan')).first()).toBeVisible();
  });

  test('6. User cannot access another firm’s matter, AI output, or readiness check', async ({ page, context }) => {
    await loginAsTestUser(page, context);

    // Navigate to a cross-firm matter page
    await page.goto(`/dashboard/matters/${crossFirmMatterId}`);

    // Should display access restraint message and return link
    await expect(page.locator('text=Access Restrained').first()).toBeVisible();
    await expect(page.locator('text=LPC Privilege quarantine active, or matter ID reference is invalid.').first()).toBeVisible();
    await expect(page.locator('text=Return to Registry').first()).toBeVisible();
  });

});
