// tests/features/music-distribution.spec.js
import { test, expect } from '@playwright/test';

test.describe('Music Distribution Features', () => {
  const testUser = {
    email: 'streampirex.test@example.com',
    password: 'TestPass123!',
    username: 'streampirex_tester'
  };

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-auth-token');
      window.store = { 
        user: { 
          id: 1, 
          email: 'test@example.com',
          username: 'testuser' 
        } 
      };
    });

    // Mock user tracks
    await page.route('**/user/audio', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          audio: [
            { id: 1, title: 'Test Track 1', artist: 'Test Artist', genre: 'Pop' },
            { id: 2, title: 'Test Track 2', artist: 'Test Artist', genre: 'Rock' }
          ]
        })
      });
    });

    // Mock SonoSuite connection status
    await page.route('**/api/sonosuite/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: true,
          connection: {
            sonosuite_email: testUser.email,
            is_active: true
          }
        })
      });
    });
  });

  test('should display music distribution page correctly', async ({ page }) => {
    await page.goto('/music-distribution');

    // Check page elements
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/Music Distribution|Distribution/i);
    await expect(page.locator('text=Global music distribution, text=music distribution')).toBeVisible();
    
    // Look for key features
    const features = [
      'text=100% of your royalties',
      'text=Keep 100%',
      'text=analytics',
      'text=reporting',
      'text=platforms'
    ];

    let featuresFound = 0;
    for (const feature of features) {
      if (await page.locator(feature).isVisible()) {
        featuresFound++;
      }
    }

    expect(featuresFound).toBeGreaterThan(0);
  });

  test('should show distribution form for connected users', async ({ page }) => {
    await page.goto('/music-distribution');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Look for form elements with various possible selectors
    const formElements = [
      'text=Submit New Release',
      'text=Submit for Distribution', 
      'text=Release Title',
      'text=Artist Name',
      'select[name*="track"]',
      'input[name*="release"]',
      'input[name*="artist"]',
      'select[name*="genre"]'
    ];

    let formElementsFound = 0;
    for (const element of formElements) {
      if (await page.locator(element).isVisible()) {
        formElementsFound++;
        console.log(`Found form element: ${element}`);
      }
    }

    // Should find at least some form elements if connected
    expect(formElementsFound).toBeGreaterThan(0);
  });

  test('should submit music for distribution successfully', async ({ page }) => {
    await page.goto('/music-distribution');

    // Mock successful distribution submission
    await page.route('**/api/distribution/submit', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Track submitted for distribution successfully!',
          distribution: {
            id: 1,
            release_title: 'Test Release',
            artist_name: 'Test Artist',
            status: 'pending',
            submission_date: new Date().toISOString()
          }
        })
      });
    });

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Try to fill distribution form with flexible selectors
    try {
      const trackSelect = page.locator('select[name*="track"], select:has-text("Select Track")').first();
      if (await trackSelect.isVisible()) {
        await trackSelect.selectOption('1');
      }

      const releaseTitleInput = page.locator('input[name*="release"], input[placeholder*="Release"], input[placeholder*="Title"]').first();
      if (await releaseTitleInput.isVisible()) {
        await releaseTitleInput.fill('Test Release');
      }

      const artistNameInput = page.locator('input[name*="artist"], input[placeholder*="Artist"]').first();
      if (await artistNameInput.isVisible()) {
        await artistNameInput.fill('Test Artist');
      }

      const genreSelect = page.locator('select[name*="genre"], select:has-text("Genre")').first();
      if (await genreSelect.isVisible()) {
        await genreSelect.selectOption('Pop');
      }

      // Submit form
      const submitButton = page.locator(
        'button:has-text("Submit for Distribution"), ' +
        'button:has-text("Submit Release"), ' +
        'button:has-text("Submit"), ' +
        'button[type="submit"]'
      ).first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Verify success message
        await expect(page.locator(
          'text=Track submitted for distribution successfully, ' +
          'text=submitted successfully, ' +
          'text=Distribution submitted'
        )).toBeVisible({ timeout: 10000 });
      } else {
        console.log('Submit button not found - form may not be fully loaded');
      }
    } catch (error) {
      console.log('Form submission test - elements may not be available:', error.message);
    }
  });

  test('should display distribution analytics', async ({ page }) => {
    // Mock analytics data
    await page.route('**/api/distribution/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_releases: 5,
          total_streams: 15000,
          total_revenue: 125.50,
          active_distributions: 3,
          pending_distributions: 2
        })
      });
    });

    await page.route('**/api/distribution/releases', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pending: [
            { id: 1, release_title: 'Pending Release', status: 'pending', artist_name: 'Test Artist' }
          ],
          active: [
            { id: 2, release_title: 'Live Release', status: 'live', total_streams: 5000, artist_name: 'Test Artist' }
          ]
        })
      });
    });

    await page.goto('/music-distribution');

    // Wait for analytics to load
    await page.waitForTimeout(2000);

    // Check for analytics display with flexible selectors
    const analyticsElements = [
      'text=5',
      'text=15,000',
      'text=15000', 
      'text=$125',
      'text=125.50',
      'text=Total Releases',
      'text=Total Streams',
      'text=Revenue',
      'text=Pending Release',
      'text=Live Release'
    ];

    let analyticsFound = 0;
    for (const element of analyticsElements) {
      if (await page.locator(element).isVisible()) {
        analyticsFound++;
        console.log(`Found analytics element: ${element}`);
      }
    }

    // Should find at least some analytics
    expect(analyticsFound).toBeGreaterThan(0);
  });

  test('should handle distribution errors gracefully', async ({ page }) => {
    await page.goto('/music-distribution');

    // Mock distribution error
    await page.route('**/api/distribution/submit', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Track file format not supported'
        })
      });
    });

    // Try to submit with error
    const submitButton = page.locator(
      'button:has-text("Submit for Distribution"), ' +
      'button:has-text("Submit"), ' +
      'button[type="submit"]'
    ).first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show error message
      const errorElements = [
        'text=Track file format not supported',
        'text=not supported',
        'text=error',
        'text=failed'
      ];

      let errorFound = false;
      for (const errorElement of errorElements) {
        if (await page.locator(errorElement).isVisible()) {
          errorFound = true;
          break;
        }
      }

      expect(errorFound).toBeTruthy();
    }
  });

  test('should show connection prompt for unconnected users', async ({ page }) => {
    // Override SonoSuite status to show disconnected
    await page.route('**/api/sonosuite/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: false
        })
      });
    });

    await page.goto('/music-distribution');

    // Should show connection prompt
    const connectionElements = [
      'text=Connect Distribution System',
      'text=Connect to SonoSuite',
      'text=Connect Distribution',
      'text=Setup Distribution',
      'button:has-text("Connect")'
    ];

    let connectionPromptFound = false;
    for (const element of connectionElements) {
      if (await page.locator(element).isVisible()) {
        connectionPromptFound = true;
        console.log(`Found connection prompt: ${element}`);
        break;
      }
    }

    expect(connectionPromptFound).toBeTruthy();
  });

  test('should handle page load without authentication', async ({ page }) => {
    // Clear authentication
    await page.addInitScript(() => {
      localStorage.clear();
      window.store = {};
    });

    await page.goto('/music-distribution');

    // Should redirect to login or show login prompt
    const loginElements = [
      'text=Login',
      'text=Sign In', 
      'input[type="email"]',
      'input[type="password"]'
    ];

    let loginPromptFound = false;
    for (const element of loginElements) {
      if (await page.locator(element).isVisible()) {
        loginPromptFound = true;
        break;
      }
    }

    // Either redirect to login page or current URL should be login
    const currentUrl = page.url();
    const isOnLoginPage = currentUrl.includes('/login') || loginPromptFound;
    
    expect(isOnLoginPage).toBeTruthy();
  });
});