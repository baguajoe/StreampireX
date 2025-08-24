// tests/features/basic-test.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Basic Setup Validation', () => {
  
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Take a screenshot to see what's actually loading
    await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
  });

  test('should check which routes exist', async ({ page }) => {
    const routes = ['/podcast-create', '/artist/upload', '/upload-video', '/create-radio'];
    
    for (const route of routes) {
      await page.goto(route);
      const pageContent = await page.content();
      const is404 = pageContent.includes('Not found') || pageContent.includes('404');
      console.log(`Route ${route}: ${is404 ? 'MISSING' : 'EXISTS'}`);
    }
  });

  test('should check podcast-create page elements', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-create');
    
    // Check what elements actually exist
    const titleInput = authenticatedPage.locator('input[name="title"]');
    const isVisible = await titleInput.isVisible();
    
    console.log('Title input exists:', isVisible);
    
    if (!isVisible) {
      // Log what elements DO exist
      const allInputs = await authenticatedPage.locator('input').count();
      const allForms = await authenticatedPage.locator('form').count();
      console.log(`Found ${allInputs} inputs and ${allForms} forms on the page`);
      
      // Take screenshot to see actual page
      await authenticatedPage.screenshot({ path: 'podcast-create-page.png', fullPage: true });
    }
  });
});