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
      url: 'http://localhost:3001'
    }]);

    await page.goto('/dashboard');
    await expect(page.locator('text=Admin Dashboard').first()).toBeVisible();
  });

  test('5. Main navigation links redirect correctly', async ({ page, context }) => {
    await context.addCookies([{
      name: 'mock-authenticated',
      value: 'true',
      url: 'http://localhost:3001'
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
      url: 'http://localhost:3001'
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
      url: 'http://localhost:3001'
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
      url: 'http://localhost:3001'
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
});
