import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  use: {
    // Your working URLs from tests
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  expect: {
    timeout: 10000
  },
  
  projects: [
    // Core functionality tests
    {
      name: 'auth-tests',
      testDir: './tests/auth',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api-integration',
      testDir: './tests/api',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sonosuite-integration',
      testDir: './tests/sonosuite',
      use: { ...devices['Desktop Chrome'] },
    },
    // Feature tests
    {
      name: 'music-features',
      testDir: './tests/music',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-tests'],
    },
    {
      name: 'distribution-features',
      testDir: './tests/distribution',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-tests'],
    },
    // Cross-browser testing
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './tests/core',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testDir: './tests/core',
    },
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testDir: './tests/mobile',
    },
  ],
  
  webServer: [
    {
      command: 'npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd src && python app.py',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    }
  ],
});