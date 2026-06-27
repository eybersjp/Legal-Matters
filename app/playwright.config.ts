import { defineConfig, devices } from '@playwright/test';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;

// Load environment variables from app/.env.local (or root if process.cwd() is root)
loadEnvConfig(process.cwd());

const E2E_PORT = 3333;
const E2E_BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start the local dev webServer if E2E_BASE_URL is not overridden (i.e. testing locally)
  webServer: !process.env.E2E_BASE_URL ? {
    command: 'npm run dev',
    url: E2E_BASE_URL,
    reuseExistingServer: false, // force clean start
    env: {
      E2E_TEST_MODE: 'true',
      PORT: String(E2E_PORT),
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/login',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/register',
    }
  } : undefined,
});

