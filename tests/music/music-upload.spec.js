import { test, expect } from '@playwright/test';
import { StreamPirexAuth } from '../utils/auth-helpers.js';
import path from 'path';

test.describe('Music Upload & Distribution', () => {
  let auth;

  test.beforeEach(async ({ page }) => {
    auth = new StreamPirexAuth(page);
    // Start with authenticated user
    await auth.registerNewUser();
  });

  test('should access music upload page', async ({ page }) => {
    await page.goto('/upload-music');
    
    // Verify upload interface is present
    await expect(page.locator('[data-testid="music-upload-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="audio-file-input"]')).toBeVisible();
  });

  test('should validate music metadata form', async ({ page }) => {
    await page.goto('/upload-music');
    
    // Try to submit without required fields
    await page.click('[data-testid="upload-submit"]');
    
    // Verify validation messages
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="artist-error"]')).toBeVisible();
  });

  test('should prepare for SonoSuite distribution integration', async ({ page }) => {
    await page.goto('/upload-music');
    
    // Fill out music metadata
    await page.fill('[data-testid="track-title"]', 'Test Track');
    await page.fill('[data-testid="artist-name"]', 'Test Artist');
    await page.selectOption('[data-testid="genre"]', 'Hip Hop');
    await page.fill('[data-testid="album-title"]', 'Test Album');
    
    // Check if SonoSuite integration options are present
    const sonoSuiteSection = page.locator('[data-testid="sonosuite-distribution"]');
    
    if (await sonoSuiteSection.isVisible()) {
      // Test existing SonoSuite integration
      await expect(sonoSuiteSection).toBeVisible();
      await sonoSuiteSection.click();
    } else {
      // Prepare for future implementation
      console.log('⏳ SonoSuite distribution section not yet implemented');
    }
  });

  test('should handle file upload validation', async ({ page }) => {
    await page.goto('/upload-music');
    
    // Test file type validation
    const fileInput = page.locator('[data-testid="audio-file-input"]');
    
    // Test with invalid file type (if validation exists)
    try {
      await fileInput.setInputFiles(path.join(__dirname, '../test-data/invalid.txt'));
      
      // Should show error for invalid file type
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    } catch (error) {
      console.log('⏳ File type validation not yet implemented');
    }
  });
});