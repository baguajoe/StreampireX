// tests/fixtures/auth.js
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Set localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('token', 'demo-auth-token');
      localStorage.setItem('userId', '1');
      localStorage.setItem('username', 'demo-user');
    });

    // Navigate with proper timeout
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 90000 
    });
    
    // Wait for app to load
    await page.waitForSelector('body', { timeout: 30000 });
    
    await use(page);
  },
});

export { test, expect };