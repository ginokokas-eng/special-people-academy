import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end browser suite (wave 2, Part 1).
 *
 * Run locally against `npm run dev`:
 *   cp .env.e2e.example .env.e2e   # fill in the two long-lived accounts
 *   npm run test:e2e
 *
 * See tests/e2e/README.md for account creation and the one-time staff role SQL.
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests/e2e',
  // Specs share one authored course, so they must not run against each other.
  workers: 1,
  fullyParallel: false,
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // Fail fast on a missing element instead of burning the whole test timeout.
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Scroll-reveal, trickle veils and card flips settle instantly.
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: /global\.setup\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only boot a dev server when no external target was named.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        port: 8080,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
