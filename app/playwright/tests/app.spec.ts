import { test, expect } from '@playwright/test';

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
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3333'
    }]);

    await page.goto('/dashboard');
    await expect(page.locator('text=Admin Dashboard').first()).toBeVisible();
  });

  test('5. Main navigation links redirect correctly', async ({ page, context }) => {
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3333'
    }]);

    await page.goto('/dashboard');

    await page.click('text=Clients Registry');
    await expect(page).toHaveURL(/.*clients.*/);

    await page.click('text=Matters Registry');
    await expect(page).toHaveURL(/.*matters.*/);

    await page.click('text=Documents Vault');
    await expect(page).toHaveURL(/.*documents.*/);
  });

  test('6. Global Documents Vault search and loading', async ({ page, context }) => {
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3333'
    }]);

    await page.goto('/dashboard/documents');
    await expect(page.locator('text=Documents Vault').first()).toBeVisible();
    
    const searchInput = page.locator('input[placeholder*="Search documents"]');
    await expect(searchInput).toBeVisible();
  });

  test('7. Notifications Center bell panel acts reactively', async ({ page, context }) => {
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3333'
    }]);

    await page.goto('/dashboard');
    
    const bellBtn = page.locator('button[aria-label*="unread notifications"]');
    await expect(bellBtn).toBeVisible();
    
    await bellBtn.click();
    await expect(page.locator('text=Notifications Center')).toBeVisible();
  });

  test('8. Mobile responsiveness navigation menu works', async ({ page, context }) => {
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3333'
    }]);

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

    await expect(page.locator('text=Invalid credentials').first()).toBeVisible();
  });

  test('10. Successful practitioner login redirects dynamically to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'partner@example.com');
    await page.fill('input[type="password"]', 'valid_password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('11. Authenticated user without active firm workspace is handled clearly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nofirm@example.com');
    // Our mock signInWithPassword returns a mock user, but in our code, if we want to simulate
    // no firm membership, let's verify if the error message is displayed
    await page.fill('input[type="password"]', 'valid_password');
    await page.click('button[type="submit"]');
    
    // Since our database check inside the mock environment queries firm_members table,
    // in mock mode it queries a mock db which returns empty profiles map.
    // Thus it will correctly return the "no workspace linked yet" error!
    await expect(page.locator('text=no firm workspace has been linked yet').first()).toBeVisible();
  });

  test('12. Matter Documents Hub workflow works (AI summary, details drawer, approval)', async ({ page, context }) => {
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3333'
    }]);

    // Navigate to Matter Documents page
    await page.goto('/dashboard/matters/mock-matter-1/documents');
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
    const approveBtn = page.locator('button:has-text("Approve Summary")');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify success banner is shown
    await expect(page.locator('text=AI summary was successfully approved').first()).toBeVisible();
  });
});
