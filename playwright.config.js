// playwright.config.js - StreamPirex Testing Configuration
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    process.env.CI ? ['github'] : null
  ].filter(Boolean),
  
  use: {
    // Your working URLs
    baseURL: 'http://localhost:3000',
    
    // Enhanced debugging and reporting
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts optimized for StreamPirex
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Headers for API requests
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  },
  
  expect: {
    timeout: 10000,
    toHaveScreenshot: { threshold: 0.2, mode: 'pixel' },
    toMatchSnapshot: { threshold: 0.2 }
  },
  
  projects: [
    // ===== CORE FEATURE TESTING =====
    {
      name: 'auth-tests',
      testDir: './tests/auth',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: undefined // Clean state for auth tests
      },
    },
    
    {
      name: 'api-integration', 
      testDir: './tests/api',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001' // Backend API
      },
    },
    
    {
      name: 'frontend-tests',
      testDir: './tests/frontend',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-tests']
    },
    
    // ===== STREAMPIREX FEATURES =====
    {
      name: 'music-features',
      testDir: './tests/music',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json' // Pre-authenticated state
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'podcast-features',
      testDir: './tests/podcasts', 
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'radio-features',
      testDir: './tests/radio',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'gaming-features',
      testDir: './tests/gaming',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'video-editor-features',
      testDir: './tests/video-editor',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'marketplace-features',
      testDir: './tests/marketplace',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    // ===== INTEGRATION TESTING =====
    {
      name: 'sonosuite-integration',
      testDir: './tests/sonosuite',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'distribution-features',
      testDir: './tests/distribution',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-data/auth-state.json'
      },
      dependencies: ['auth-tests']
    },
    
    {
      name: 'integration-tests',
      testDir: './tests/integration',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-tests', 'api-integration']
    },
    
    // ===== CROSS-BROWSER TESTING =====
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './tests/core',
      dependencies: ['auth-tests']
    },
    
    {
      name: 'webkit', 
      use: { ...devices['Desktop Safari'] },
      testDir: './tests/core',
      dependencies: ['auth-tests']
    },
    
    // ===== MOBILE TESTING =====
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testDir: './tests/mobile',
      dependencies: ['auth-tests']
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testDir: './tests/mobile',
      dependencies: ['auth-tests']
    },
    
    // ===== PERFORMANCE & ACCESSIBILITY =====
    {
      name: 'performance-tests',
      testDir: './tests/performance',
      use: { 
        ...devices['Desktop Chrome'],
        video: 'off', // Disable video for performance tests
        screenshot: 'off'
      }
    },
    
    {
      name: 'a11y-tests',
      testDir: './tests/accessibility',
      use: { ...devices['Desktop Chrome'] }
    },
    
    {
      name: 'visual-tests',
      testDir: './tests/visual',
      use: { 
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure'
      }
    },
    
    // ===== SMOKE TESTING =====
    {
      name: 'smoke-tests',
      testDir: './tests/smoke',
      use: { ...devices['Desktop Chrome'] },
      timeout: 30000 // Quick smoke tests
    }
  ],
  
  // Start your StreamPirex services before running tests
  webServer: [
    {
      command: 'npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'cd src && python app.py',
      port: 3001, 
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],
  
  // Global test setup
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js'
});