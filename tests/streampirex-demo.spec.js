const { test, expect } = require('@playwright/test');

test('StreampireX Homepage Loads', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page loads and contains StreampireX
  await expect(page.locator('h1')).toContainText('StreampireX', { timeout: 10000 });
  
  console.log('✅ Homepage loaded successfully');
});

test('Key Features Are Visible', async ({ page }) => {
  await page.goto('/');
  
  // Check for specific feature headings (use first() to handle multiple matches)
  await expect(page.locator('h4:has-text("Music Distribution")').first()).toBeVisible();
  await expect(page.locator('h4:has-text("Gaming Community")').first()).toBeVisible();
  await expect(page.locator('h4:has-text("Podcast")').first()).toBeVisible();
  
  console.log('✅ All key features found');
});

test('Navigation Elements Present', async ({ page }) => {
  await page.goto('/');
  
  // Check for key navigation elements
  await expect(page.locator('text=Get Started')).toBeVisible();
  
  console.log('✅ Navigation elements found');
});

test('YC Demo Flow - Multi-Modal Platform', async ({ page }) => {
  await page.goto('/');
  
  // Verify the core value proposition is visible
  await expect(page.locator('text=ultimate creator platform')).toBeVisible();
  
  // Check that all main verticals are represented (use first() for multiple matches)
  await expect(page.locator('text=music').first()).toBeVisible();
  await expect(page.locator('text=gaming').first()).toBeVisible();
  await expect(page.locator('text=podcast').first()).toBeVisible();
  
  console.log('✅ Multi-modal platform validated for YC demo');
});
