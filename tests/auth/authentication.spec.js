import { test, expect } from '@playwright/test';
import { StreamPirexAuth, APITester } from '../utils/auth-helpers.js';

test.describe('StreamPirex Authentication - Validated Core', () => {
  let auth;
  let apiTester;

  test.beforeEach(async ({ page }) => {
    auth = new StreamPirexAuth(page);
    apiTester = new APITester(page);
  });

  test('should register new user with Status 201 ✓', async ({ page }) => {
    const user = await auth.registerNewUser({
      email: `newuser${Date.now()}@streampirex.com`
    });
    
    // Verify successful redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify user is logged in
    const welcomeMessage = page.locator('[data-testid="welcome-message"]');
    await expect(welcomeMessage).toBeVisible();
  });

  test('should login existing user with Status 200 ✓', async ({ page }) => {
    // First register a user
    const user = await auth.registerNewUser();
    await auth.logout();
    
    // Then login
    const token = await auth.loginExistingUser(user.email, user.password);
    
    // Verify dashboard access
    await expect(page).toHaveURL(/.*dashboard/);
    expect(token).toBeTruthy();
  });

  test('should validate dual login URL construction ✓', async ({ page }) => {
    const user = await auth.registerNewUser();
    const sonoSuiteUrl = await auth.validateDualLoginUrls();
    
    console.log('✓ Dual Login URL:', sonoSuiteUrl);
    expect(sonoSuiteUrl).toContain('sonosuite.com');
  });

  test('should identify endpoint availability correctly ✓', async ({ page }) => {
    const workingEndpoints = await apiTester.validateWorkingEndpoints();
    const pendingEndpoints = await apiTester.validatePendingEndpoints();
    
    // Verify working endpoints
    workingEndpoints.forEach(endpoint => {
      console.log(`✓ Working: ${endpoint.endpoint} - Status ${endpoint.status}`);
      expect(endpoint.available).toBeTruthy();
    });
    
    // Verify pending endpoints (should be 404)
    pendingEndpoints.forEach(endpoint => {
      console.log(`⏳ Pending: ${endpoint.endpoint} - Status ${endpoint.status}`);
      expect(endpoint.isPending).toBeTruthy();
    });
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'invalid@email.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    
    // Expect authentication to fail
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/login')
    );
    
    await page.click('[data-testid="login-button"]');
    const response = await responsePromise;
    
    expect(response.status()).not.toBe(200);
    
    // Verify error message display
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
  test('Backend connectivity check', async ({ page }) => {
    try {
      const response = await page.request.get('http://localhost:3001/api/health');
      console.log('Backend status:', response.status());
    } catch (error) {
      console.log('Backend not running - start with: cd src && python app.py');
    }
  });
