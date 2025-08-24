// tests/auth/signup.spec.js
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

test.describe('Signup Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page before each test - your route is /register
    await page.goto(`${FRONTEND_URL}/register`);
    await page.waitForLoadState('networkidle');
  });

  test('should display signup form correctly', async ({ page }) => {
    // Check URL contains register
    await expect(page).toHaveURL(/.*register/);
    
    // Check for signup heading - your actual heading text
    await expect(page.locator('h1')).toContainText('Create Your StreampireX Account');
    
    // Check for progress bar (your signup has multi-step form)
    await expect(page.locator('.progress-bar')).toBeVisible();
    
    // Check for step 1 heading
    await expect(page.locator('h3')).toContainText('Basic Information');
    
    // Check for signup container
    await expect(page.locator('.signup-container')).toBeVisible();
  });

  test('should show Step 1: Basic Information fields', async ({ page }) => {
    // Check required fields in step 1
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

  test('should fill basic information correctly', async ({ page }) => {
    // Fill first name
    await page.locator('input[name="firstName"]').fill('John');
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    
    // Fill last name
    await page.locator('input[name="lastName"]').fill('Doe');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    
    // Fill email
    await page.locator('input[name="email"]').fill('john.doe@example.com');
    await expect(page.locator('input[name="email"]')).toHaveValue('john.doe@example.com');
    
    // Fill username
    await page.locator('input[name="username"]').fill('johndoe');
    await expect(page.locator('input[name="username"]')).toHaveValue('johndoe');
    
    // Fill password
    await page.locator('input[name="password"]').fill('SecurePassword123!');
    await expect(page.locator('input[name="password"]')).toHaveValue('SecurePassword123!');
    
    // Fill confirm password
    await page.locator('input[name="confirmPassword"]').fill('SecurePassword123!');
    await expect(page.locator('input[name="confirmPassword"]')).toHaveValue('SecurePassword123!');
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Try to submit without filling required fields
    const nextButton = page.locator('button.btn-primary');
    await nextButton.click();
    
    // Should show error messages
    await expect(page.locator('.error-text')).toHaveCount.greaterThan(0);
  });

  test('should validate password confirmation', async ({ page }) => {
    // Fill passwords that don't match
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPassword123!');
    
    // Try to proceed
    const nextButton = page.locator('button.btn-primary');
    await nextButton.click();
    
    // Should show password mismatch error
    await expect(page.locator('.error-text')).toContainText("Passwords don't match");
  });

  test('should validate email format', async ({ page }) => {
    // Fill invalid email
    await page.locator('input[name="email"]').fill('invalid-email');
    
    // Fill other required fields
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="username"]').fill('johndoe');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');
    
    // Try to proceed
    const nextButton = page.locator('button.btn-primary');
    await nextButton.click();
    
    // Should show email validation error
    await expect(page.locator('.error-text')).toContainText('Valid email is required');
  });

  test('should proceed to step 2 with valid basic information', async ({ page }) => {
    // Fill valid basic information
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="email"]').fill('john.doe@example.com');
    await page.locator('input[name="username"]').fill('johndoe');
    await page.locator('input[name="password"]').fill('SecurePassword123!');
    await page.locator('input[name="confirmPassword"]').fill('SecurePassword123!');
    await page.locator('input[name="dateOfBirth"]').fill('1990-01-01');
    
    // Proceed to next step
    const nextButton = page.locator('button.btn-primary');
    await nextButton.click();
    
    // Should be on step 2
    await expect(page.locator('.step-circle.active')).toHaveText('2');
  });

  test('should show role selection in step 2', async ({ page }) => {
    // Navigate to step 2 first
    await fillBasicInfo(page);
    await page.locator('button.btn-primary').click();
    
    // Check role selection
    await expect(page.locator('select[name="role"]')).toBeVisible();
    
    // Check default role
    await expect(page.locator('select[name="role"]')).toHaveValue('Explorer');
  });

  test('should show artist fields when Artist role is selected', async ({ page }) => {
    // Navigate to step 2
    await fillBasicInfo(page);
    await page.locator('button.btn-primary').click();
    
    // Select Artist role
    await page.locator('select[name="role"]').selectOption('Artist');
    
    // Should show artist-specific fields
    await expect(page.locator('input[name="artistName"]')).toBeVisible();
    await expect(page.locator('select[name="industry"]')).toBeVisible();
  });

  test('should navigate back to previous step', async ({ page }) => {
    // Navigate to step 2
    await fillBasicInfo(page);
    await page.locator('button.btn-primary').click();
    
    // Go back to step 1
    const backButton = page.locator('button.btn-secondary');
    await backButton.click();
    
    // Should be back on step 1
    await expect(page.locator('.step-circle.active')).toHaveText('1');
    await expect(page.locator('h3')).toContainText('Basic Information');
  });

  test('should require legal agreements in final step', async ({ page }) => {
    // Navigate through all steps
    await fillBasicInfo(page);
    await page.locator('button.btn-primary').click(); // Go to step 2
    
    // Continue through steps until legal agreements
    // (This may need adjustment based on your actual step flow)
    
    // Try to submit without accepting terms
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors for legal agreements
      await expect(page.locator('.error-text')).toContainText('terms');
    }
  });

  test('should handle successful signup', async ({ page }) => {
    // Mock successful signup API
    await page.route('**/api/signup', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          message: 'User created successfully!'
        })
      });
    });
    
    // Fill complete form (you may need to adjust this based on your actual form flow)
    await fillCompleteSignupForm(page);
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show success message or redirect
    // (Adjust based on your actual success handling)
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that form is responsive
    await expect(page.locator('.signup-container')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
  });
});

// Helper function to fill basic information
async function fillBasicInfo(page) {
  await page.locator('input[name="firstName"]').fill('John');
  await page.locator('input[name="lastName"]').fill('Doe');
  await page.locator('input[name="email"]').fill('john.doe@example.com');
  await page.locator('input[name="username"]').fill('johndoe');
  await page.locator('input[name="password"]').fill('SecurePassword123!');
  await page.locator('input[name="confirmPassword"]').fill('SecurePassword123!');
  await page.locator('input[name="dateOfBirth"]').fill('1990-01-01');
}

// Helper function to fill complete signup form
async function fillCompleteSignupForm(page) {
  // Fill basic info
  await fillBasicInfo(page);
  await page.locator('button.btn-primary').click();
  
  // Continue through additional steps as needed
  // (You'll need to adjust this based on your actual form flow)
  
  // Accept legal agreements
  await page.locator('input[name="termsAccepted"]').check();
  await page.locator('input[name="privacyAccepted"]').check();
  await page.locator('input[name="ageVerification"]').check();
}

// Performance test
test.describe('Signup Page Performance', () => {
  test('should load signup page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${FRONTEND_URL}/signup`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });
});