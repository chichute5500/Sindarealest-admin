import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['combined-mobile-checkout.spec.js'],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 40000,
  use: {
    baseURL: 'http://127.0.0.1:8793',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'node node_modules/wrangler/bin/wrangler.js pages dev public --ip 127.0.0.1 --port 8793',
    url: 'http://127.0.0.1:8793/',
    reuseExistingServer: false,
    timeout: 65000,
  },
});
