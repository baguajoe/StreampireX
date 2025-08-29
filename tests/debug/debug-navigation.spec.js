// tests/debug/debug-navigation.spec.js
// Run this test to debug what's happening with page loading

import { test, expect } from '../fixtures/auth.js';

test.describe('Debug Navigation Issues', () => {
  test('debug page loading and routing', async ({ authenticatedPage }) => {
    console.log('=== DEBUG TEST START ===');
    
    // Check initial page state
    console.log('Initial URL:', authenticatedPage.url());
    console.log('Initial title:', await authenticatedPage.title());
    
    // Take initial screenshot
    await authenticatedPage.screenshot({ 
      path: 'debug-initial-state.png',
      fullPage: true 
    });
    
    // Check what elements are actually on the page
    const pageElements = await authenticatedPage.evaluate(() => {
      const elements = {
        forms: Array.from(document.querySelectorAll('form')).length,
        inputs: Array.from(document.querySelectorAll('input')).length,
        buttons: Array.from(document.querySelectorAll('button')).length,
        links: Array.from(document.querySelectorAll('a')).length,
        navElements: Array.from(document.querySelectorAll('nav, .navbar')).length,
        sidebarElements: Array.from(document.querySelectorAll('.sidebar, aside')).length,
        errors: Array.from(document.querySelectorAll('.error, .error-message')).map(el => el.textContent),
        bodyText: document.body.textContent.slice(0, 200)
      };
      return elements;
    });
    
    console.log('Page elements found:', pageElements);
    
    // Test navigation to podcast-create
    console.log('=== TESTING PODCAST-CREATE NAVIGATION ===');
    try {
      await authenticatedPage.goto('/podcast-create', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      console.log('Podcast-create URL:', authenticatedPage.url());
      console.log('Podcast-create title:', await authenticatedPage.title());
      
      // Check for form elements
      const formElements = await authenticatedPage.evaluate(() => {
        return {
          titleInputs: Array.from(document.querySelectorAll('input[name="title"]')).length,
          titleInputsAlt: Array.from(document.querySelectorAll('input[placeholder*="title"], input[id="title"]')).length,
          allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
            name: input.name,
            type: input.type,
            id: input.id,
            placeholder: input.placeholder
          })),
          allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent.trim(),
            type: btn.type,
            id: btn.id
          }))
        };
      });
      
      console.log('Form elements on podcast-create:', formElements);
      
      await authenticatedPage.screenshot({ 
        path: 'debug-podcast-create.png',
        fullPage: true 
      });
      
    } catch (error) {
      console.error('Failed to navigate to podcast-create:', error);
      
      await authenticatedPage.screenshot({ 
        path: 'debug-podcast-create-error.png',
        fullPage: true 
      });
    }
    
    // Test navigation to artist/upload
    console.log('=== TESTING ARTIST/UPLOAD NAVIGATION ===');
    try {
      await authenticatedPage.goto('/artist/upload', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      console.log('Artist/upload URL:', authenticatedPage.url());
      
      const uploadElements = await authenticatedPage.evaluate(() => {
        return {
          titleInputs: Array.from(document.querySelectorAll('input[name="title"]')).length,
          fileInputs: Array.from(document.querySelectorAll('input[type="file"]')).length,
          forms: Array.from(document.querySelectorAll('form')).length,
          allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
            name: input.name,
            type: input.type,
            placeholder: input.placeholder
          }))
        };
      });
      
      console.log('Upload form elements:', uploadElements);
      
    } catch (error) {
      console.error('Failed to navigate to artist/upload:', error);
    }
    
    console.log('=== DEBUG TEST END ===');
  });
});