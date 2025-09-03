import { test, expect } from '@playwright/test';
import { StreamPirexAuth } from '../utils/auth-helpers.js';

test.describe('StreamPirex Dashboard Features', () => {
  let auth;

  test.beforeEach(async ({ page }) => {
    auth = new StreamPirexAuth(page);
    await auth.registerNewUser();
  });

  test('should display user dashboard after login', async ({ page }) => {
    // Verify dashboard elements
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();
    
    // Check for main navigation
    await expect(page.locator('[data-testid="nav-music"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-podcasts"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-radio"]')).toBeVisible();
  });

  test('should navigate to different sections', async ({ page }) => {
    // Test music section
    await page.click('[data-testid="nav-music"]');
    await expect(page).toHaveURL(/.*music/);
    
    // Test podcasts section
    await page.click('[data-testid="nav-podcasts"]');
    await expect(page).toHaveURL(/.*podcasts/);
    
    // Test radio section
    await page.click('[data-testid="nav-radio"]');
    await expect(page).toHaveURL(/.*radio/);
  });

  test('should display user profile information', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="profile-link"]');
    
    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
  });
});