import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
 testDir: './tests/e2e',
 fullyParallel: false,
 forbidOnly: Boolean(process.env.CI),
 retries: 0,
 workers: 1,
 reporter: [['list']],
 timeout: 45000,
 expect: { timeout: 10000 },
 use: {
  ...devices['Desktop Chrome'],
  channel: process.env.SD_OWNER_QA_SYSTEM_CHROME === '1' ? 'chrome' : undefined,
  headless: true,
  serviceWorkers: 'block',
  trace: 'off',
  video: 'off'
 }
});
