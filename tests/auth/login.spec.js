// tests/auth/login.spec.js
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    console.log(`Navigating to: ${FRONTEND_URL}/login`);
    await page.goto(`${FRONTEND_URL}/login`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Debug: Log what we actually see on the page
    const pageTitle = await page.title();
    const bodyText = await page.textContent('body');
    console.log(`Page title: ${pageTitle}`);
    console.log(`Page content preview: ${bodyText.substring(0, 200)}...`);
  });

  test('should display login page correctly', async ({ page }) => {
    // First check if we're getting the "Not found" error
    const notFoundHeading = page.locator('h1:has-text("Not found!")');
    if (await notFoundHeading.isVisible()) {
      console.log('ERROR: Getting "Not found!" page instead of login page');
      console.log('This suggests the frontend server might not be running or route is not working');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/login-not-found-debug.png' });
      
      // Fail the test with helpful message
      throw new Error(`Expected login page but got "Not found!" page. Check if frontend server is running on ${FRONTEND_URL}`);
    }
    
    // Check URL contains login
    await expect(page).toHaveURL(/.*login/);
    
    // Check for login heading
    await expect(page.locator('h1')).toContainText('Login');
    
    // Check for email input (your actual form uses type="email" with placeholder)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Check for password input (your actual form uses type="password" with placeholder)
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for signup link (be specific to avoid multiple matches)
    await expect(page.locator('text=Please click')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Please click' }).locator('a')).toContainText('here');
  });

  test('should show placeholders correctly', async ({ page }) => {
    // Check email placeholder
    await expect(page.locator('input[type="email"]')).toHaveAttribute('placeholder', 'Email');
    
    // Check password placeholder
    await expect(page.locator('input[type="password"]')).toHaveAttribute('placeholder', 'Password');
  });

  test('should have required fields', async ({ page }) => {
    // Check that email is required
    await expect(page.locator('input[type="email"]')).toHaveAttribute('required');
    
    // Check that password is required
    await expect(page.locator('input[type="password"]')).toHaveAttribute('required');
  });

  test('should fill form fields correctly', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Fill email field
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    // Fill password field
    await passwordInput.fill('testpassword123');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('should navigate to signup page when clicking signup link', async ({ page }) => {
    // Click the specific signup link in the login form (not the navigation)
    await page.locator('p').filter({ hasText: 'Please click' }).locator('a').click();
    
    // Should navigate to register/signup page
    await expect(page).toHaveURL(/.*register/);
  });

  test('should attempt login with form submission', async ({ page }) => {
    // Fill the login form
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('testpassword123');
    
    // Mock the login API to avoid actual authentication during tests
    await page.route('**/api/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          access_token: 'mock-token',
          user: { email: 'test@example.com' }
        })
      });
    });
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Should show success alert (your code shows alert on success)
    // Note: This might need adjustment based on how your app handles success
  });

  test('should handle login failure', async ({ page }) => {
    // Fill the login form with invalid credentials
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Mock failed login response
    await page.route('**/api/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Invalid credentials'
        })
      });
    });
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Should show error alert (your code shows alert on failure)
    // Note: This might need adjustment based on how your app handles errors
  });

  test('should have autocomplete attributes', async ({ page }) => {
    // Check email autocomplete
    await expect(page.locator('input[type="email"]')).toHaveAttribute('autocomplete', 'username');
    
    // Check password autocomplete
    await expect(page.locator('input[type="password"]')).toHaveAttribute('autocomplete', 'current-password');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that form elements are still visible and accessible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

// Performance test
test.describe('Login Page Performance', () => {
  test('should load login page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });
});