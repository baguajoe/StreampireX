// tests/fixtures/auth.js
import { test as base, expect } from '@playwright/test';

// Define the authenticated page fixture
const test = base.extend({
  authenticatedPage: async ({ page, context }, use) => {
    // Set up authentication state
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'demo-auth-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Set localStorage with auth data
    await page.addInitScript(() => {
      localStorage.setItem('token', 'demo-auth-token');
      localStorage.setItem('userId', '1');
      localStorage.setItem('username', 'demo-user');
    });

    // Go to base URL first to set context
    await page.goto('/');
    
    // Pass the authenticated page to the test
    await use(page);
  },
});

export { test, expect };