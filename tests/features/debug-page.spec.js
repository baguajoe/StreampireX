// tests/features/debug-page.spec.js
import { test, expect } from '../fixtures/auth.js';

test('debug podcast-create page content', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/podcast-create');
  
  // Get page content and title
  const title = await authenticatedPage.title();
  const content = await authenticatedPage.content();
  
  console.log('Page title:', title);
  console.log('Page HTML length:', content.length);
  console.log('Page contains "SpectraSphere":', content.includes('SpectraSphere'));
  console.log('Page contains "StreampireX":', content.includes('StreampireX'));
  console.log('Page contains "podcast":', content.includes('podcast'));
  console.log('All inputs:', await authenticatedPage.locator('input').count());
  console.log('All forms:', await authenticatedPage.locator('form').count());
  
  // Take screenshot for debugging
  await authenticatedPage.screenshot({ path: 'debug-podcast-create.png', fullPage: true });
});