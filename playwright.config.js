const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Add retries for local development
  workers: 1,
  reporter: 'list', // Fix reporter syntax
  
  // CRITICAL FIX: Remove global baseURL and HTTP headers
  // The feature tests need to interact with the frontend, not the API
  use: {
    // Don't set baseURL globally - let projects define their own
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api-tests',
      testMatch: '**/api/**/*.spec.js',
      use: {
        baseURL: 'http://localhost:3001/api', // API tests use backend URL
        extraHTTPHeaders: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
    },
    {
      name: 'feature-tests',
      testMatch: '**/features/**/*.spec.js',
      use: {
        baseURL: 'https://studious-space-goggles-r4rp7v96jgr62x5j-3000.app.github.dev', // Frontend URL
        // REMOVED: extraHTTPHeaders - these interfere with browser requests
        actionTimeout: 60000, // Increase action timeout
        navigationTimeout: 60000, // Increase navigation timeout
      },
    },
  ],

  // Increase timeouts across the board
  timeout: 90000, // Overall test timeout
  expect: {
    timeout: 30000, // Assertion timeout
  },
  
  // Add global setup and teardown if needed
  // globalSetup: require.resolve('./tests/setup/global-setup.js'),
  // globalTeardown: require.resolve('./tests/setup/global-teardown.js'),
});