import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 3333;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

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
  webServer: {
    command: 'npm run dev',
    url: E2E_BASE_URL,
    reuseExistingServer: false, // force clean start
    env: {
      NEXT_PUBLIC_TEST_MODE: 'true',
      PORT: String(E2E_PORT),
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/login',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/register',
    }
  },
});
