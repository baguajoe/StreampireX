const { test, expect } = require('@playwright/test');

test.describe('Basic Setup Validation', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    const url = page.url();
    
    console.log('Page title:', title);
    console.log('Page URL:', url);
    
    expect(title).toBeTruthy();
    expect(url).toContain('localhost:3000');
  });

  test('should check which routes exist', async ({ page }) => {
    const routes = ['/podcast-create', '/artist/upload', '/upload-video', '/create-radio'];

    for (const route of routes) {
      try {
        console.log(`Testing route: ${route}`);
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1000);
        
        const bodyText = await page.textContent('body');
        const is404 = bodyText.includes('Not found!') || await page.locator('h1:has-text("Not found!")').count() > 0;
        
        console.log(`Route ${route}: ${is404 ? 'MISSING' : 'EXISTS'}`);
      } catch (error) {
        console.log(`Route ${route}: ERROR - ${error.message}`);
      }
    }
  });
});