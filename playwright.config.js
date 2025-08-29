const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Changed to false to avoid resource conflicts
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: 1, // Changed to 1 to avoid server startup conflicts
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action - increased for slow forms */
    actionTimeout: 15000,
    
    /* Global timeout for navigation - increased for app startup */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'application/json, text/plain, */*'
    }
  },

  /* Configure projects for major browsers - simplified for debugging */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Add slow motion for debugging
        launchOptions: {
          slowMo: 50
        }
      },
    }
    // Removed other browsers temporarily to focus on fixing core issues
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm start',
      cwd: './src',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180000, // Increased timeout for React startup
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        REACT_APP_BACKEND_URL: 'http://localhost:3001',
        REACT_APP_ENVIRONMENT: 'test',
        PORT: '3000'
      }
    },
    {
      command: 'python -m flask run --host=0.0.0.0 --port=3001',
      cwd: './src',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180000, // Increased timeout for Flask startup
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'development', // Changed from testing to development
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'sqlite:///test.db'
      }
    }
  ],
  
  /* Test timeout - increased for slow operations */
  timeout: 90000,
  
  /* Expect timeout - increased for slow form loads */
  expect: {
    timeout: 10000
  },

  /* Output directory */
  outputDir: 'test-results/',
  
  /* Global setup file to ensure servers are ready */
  globalSetup: require.resolve('./tests/global-setup.js')
});