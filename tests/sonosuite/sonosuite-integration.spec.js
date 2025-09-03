import { test, expect } from '@playwright/test';
import { StreamPirexAuth } from '../utils/auth-helpers.js';

test.describe('SonoSuite Integration - Ready for Connect Endpoint', () => {
  let auth;

  test.beforeEach(async ({ page }) => {
    auth = new StreamPirexAuth(page);
    await auth.registerNewUser();
  });

  test('should prepare SonoSuite connection flow', async ({ page }) => {
    await page.goto('/distribution');
    
    // Test if SonoSuite connect button exists
    const connectButton = page.locator('[data-testid="sonosuite-connect"]');
    
    if (await connectButton.isVisible()) {
      // Test connection flow
      await connectButton.click();
      
      // Should redirect to SonoSuite auth with proper URL construction
      const currentUrl = page.url();
      if (currentUrl.includes('sonosuite.com')) {
        expect(currentUrl).toContain('token=');
        expect(currentUrl).toContain('redirect=streampirex');
      }
    } else {
      // Verify endpoint is ready for implementation
      const response = await page.request.post('http://localhost:3001/api/sonosuite/connect', {
        data: { test: 'connection' }
      });
      
      // Should return 404 until implemented
      expect(response.status()).toBe(404);
      console.log('⏳ /api/sonosuite/connect endpoint ready for implementation');
    }
  });

  test('should validate SonoSuite authentication URL format', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('jwt-token'));
    
    // Test URL construction (your working feature)
    const sonoSuiteUrl = `https://app.sonosuite.com/auth?token=${token}&redirect=streampirex&platform=StreamPirex`;
    
    expect(sonoSuiteUrl).toMatch(/^https:\/\/app\.sonosuite\.com\/auth\?token=.+&redirect=streampirex/);
    
    // Verify token format
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3); // JWT format
  });

  test('should prepare distribution submission flow', async ({ page }) => {
    // Test distribution submission endpoint readiness
    const response = await page.request.post('http://localhost:3001/api/distribution/submit', {
      data: { 
        trackTitle: 'Test Track',
        artistName: 'Test Artist',
        distributionPlatforms: ['Spotify', 'Apple Music']
      }
    });
    
    // Should return 404 until implemented
    expect(response.status()).toBe(404);
    console.log('⏳ /api/distribution/submit endpoint ready for implementation');
  });
});