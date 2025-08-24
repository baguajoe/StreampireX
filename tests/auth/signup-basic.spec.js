// tests/auth/signup-basic.spec.js
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

test.describe('Basic Signup Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/register`);
    await page.waitForLoadState('networkidle');
  });

  test('should load signup page correctly', async ({ page }) => {
    // Basic page loading tests
    await expect(page).toHaveURL(/.*register/);
    await expect(page.locator('h1')).toContainText('Create Your StreampireX Account');
    await expect(page.locator('.signup-container')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
  });

  test('should show step 1 basic information fields', async ({ page }) => {
    // Test that step 1 fields are visible
    await expect(page.locator('h3')).toContainText('Basic Information');
    
    // Check all required fields are present
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    
    // Check optional fields
    await expect(page.locator('input[name="phoneNumber"]')).toBeVisible();
    await expect(page.locator('input[name="dateOfBirth"]')).toBeVisible();
  });

  test('should fill basic information fields', async ({ page }) => {
    // Test filling out the form fields
    await page.locator('input[name="firstName"]').fill('John');
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    
    await page.locator('input[name="lastName"]').fill('Doe');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    
    await page.locator('input[name="email"]').fill('john.doe@example.com');
    await expect(page.locator('input[name="email"]')).toHaveValue('john.doe@example.com');
    
    await page.locator('input[name="username"]').fill('johndoe');
    await expect(page.locator('input[name="username"]')).toHaveValue('johndoe');
    
    await page.locator('input[name="password"]').fill('SecurePassword123!');
    await expect(page.locator('input[name="password"]')).toHaveValue('SecurePassword123!');
    
    await page.locator('input[name="confirmPassword"]').fill('SecurePassword123!');
    await expect(page.locator('input[name="confirmPassword"]')).toHaveValue('SecurePassword123!');
  });

  test('should show Next button in step 1', async ({ page }) => {
    // Check that navigation elements are present
    await expect(page.locator('button.btn-primary')).toBeVisible();
    await expect(page.locator('button.btn-primary')).toContainText('Next');
    
    // Previous button should not be visible in step 1
    await expect(page.locator('button.btn-secondary')).not.toBeVisible();
  });

  test('should debug step navigation by clicking Next', async ({ page }) => {
    // Fill minimum required fields
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="email"]').fill('john.doe@example.com');
    await page.locator('input[name="username"]').fill('johndoe');
    await page.locator('input[name="password"]').fill('SecurePassword123!');
    await page.locator('input[name="confirmPassword"]').fill('SecurePassword123!');
    await page.locator('input[name="dateOfBirth"]').fill('1990-01-01');
    
    // Take screenshot before clicking Next
    await page.screenshot({ path: 'debug-before-next.png' });
    
    // Click Next button
    await page.locator('button.btn-primary').click();
    
    // Wait a moment to see what happens
    await page.waitForTimeout(2000);
    
    // Take screenshot after clicking Next
    await page.screenshot({ path: 'debug-after-next.png' });
    
    // Check current step - this will help debug what's happening
    const stepIndicators = page.locator('.step-circle.active');
    const activeStepCount = await stepIndicators.count();
    console.log(`Active steps after clicking Next: ${activeStepCount}`);
    
    // Check if we're still on step 1 or moved to step 2
    const currentStepText = await page.locator('.step-circle.active').last().textContent();
    console.log(`Current step number: ${currentStepText}`);
    
    // If we moved to step 2, check for step 2 content
    const step2Content = page.locator('h3');
    const step2Text = await step2Content.textContent();
    console.log(`Current step heading: ${step2Text}`);
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that signup container is still visible and responsive
    await expect(page.locator('.signup-container')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
  });
});

// Performance test
test.describe('Signup Page Performance', () => {
  test('should load signup page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${FRONTEND_URL}/register`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });
});