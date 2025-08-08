const { test, expect } = require('@playwright/test');

test('Complete YC Demo - All 4 Core Features', async ({ page }) => {
  await page.goto('/');
  
  // Check homepage loads
  await expect(page.locator('h1')).toContainText('StreampireX', { timeout: 10000 });
  
  // Test all 4 core features from your YC app
  await expect(page.locator('text=Music Distribution').first()).toBeVisible();
  await expect(page.locator('text=Gaming').first()).toBeVisible(); 
  await expect(page.locator('text=Podcast').first()).toBeVisible();
  await expect(page.locator('text=Radio').first()).toBeVisible();
  
  console.log('✅ All 4 YC features confirmed: Music, Gaming, Podcasts, Radio');
});

test('Radio Station Feature Check', async ({ page }) => {
  await page.goto('/');
  
  // Look for radio-specific content
  await expect(page.locator('text=24/7').first()).toBeVisible();
  await expect(page.locator('text=radio').first()).toBeVisible();
  
  console.log('✅ Radio station features found');
});
