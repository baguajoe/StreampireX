// tests/features/radio.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Radio Station Features', () => {
  test('should browse radio stations', async ({ page }) => {
    await page.goto('/browse-radio-stations');
    
    // Should display genre filters
    await expect(page.locator('.genre-filters')).toBeVisible();
    await expect(page.locator('.station-grid')).toBeVisible();
    
    // Check for seed stations from project knowledge
    await expect(page.locator('text=StreampireX LoFi')).toBeVisible();
    await expect(page.locator('text=StreampireX News')).toBeVisible();
    await expect(page.locator('text=StreampireX Electronic')).toBeVisible();
  });

  test('should filter stations by genre', async ({ page }) => {
    await page.goto('/browse-radio-stations');
    
    // Filter by genre
    await page.click('text=Jazz');
    await expect(page.locator('.station-card')).toHaveCountGreaterThan(0);
    
    // Filter by Lo-Fi
    await page.click('text=Lo-Fi');
    await expect(page.locator('text=StreampireX LoFi')).toBeVisible();
  });

  test('should play radio station', async ({ page }) => {
    await page.goto('/browse-radio-stations');
    
    // Click on first station
    await page.click('.station-card:first-child .play-btn');
    
    // Should start playing
    await expect(page.locator('.radio-player')).toBeVisible();
    await expect(page.locator('.now-playing')).toBeVisible();
    await expect(page.locator('.play-btn')).toHaveClass(/playing/);
  });

  test('should access radio station dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    await expect(authenticatedPage.locator('h1')).toContainText('Radio');
    await expect(authenticatedPage.locator('.station-controls')).toBeVisible();
    await expect(authenticatedPage.locator('.listener-stats')).toBeVisible();
  });

  test('should create new radio station', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/create-radio');
    
    await authenticatedPage.fill('input[name="name"]', 'Test Jazz Station');
    await authenticatedPage.fill('textarea[name="description"]', 'Smooth jazz 24/7');
    await authenticatedPage.selectOption('select[name="genre"]', 'jazz');
    await authenticatedPage.check('input[name="isPublic"]');
    
    // Upload station logo
    await authenticatedPage.setInputFiles('input[name="stationLogo"]', {
      name: 'jazz-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-logo-data')
    });
    
    await authenticatedPage.click('button[type="submit"]');
    await expect(authenticatedPage.locator('text=Radio station created')).toBeVisible();
  });

  test('should upload station mix', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Upload station mix
    await authenticatedPage.click('button:has-text("Upload Mix")');
    
    await authenticatedPage.setInputFiles('input[name="stationMix"]', {
      name: 'jazz-mix.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio-data')
    });
    
    await authenticatedPage.fill('input[name="mixTitle"]', 'Evening Jazz Session');
    await authenticatedPage.click('button[type="submit"]');
    
    await expect(authenticatedPage.locator('text=Mix uploaded')).toBeVisible();
  });

  test('should manage radio playlist', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Manage playlist
    await authenticatedPage.click('button:has-text("Manage Playlist")');
    await expect(authenticatedPage.locator('.playlist-manager')).toBeVisible();
    
    // Add track to playlist
    await authenticatedPage.click('button:has-text("Add Track")');
    await authenticatedPage.fill('input[name="trackTitle"]', 'Blue Note Blues');
    await authenticatedPage.fill('input[name="artist"]', 'Jazz Masters');
    await authenticatedPage.fill('input[name="duration"]', '4:30');
    
    await authenticatedPage.click('button:has-text("Add to Playlist")');
    await expect(authenticatedPage.locator('text=Track added')).toBeVisible();
  });

  test('should start and stop broadcasting', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Start broadcasting
    await authenticatedPage.click('button:has-text("Start Broadcasting")');
    await expect(authenticatedPage.locator('.broadcasting-indicator')).toBeVisible();
    await expect(authenticatedPage.locator('text=Live')).toBeVisible();
    
    // Stop broadcasting
    await authenticatedPage.click('button:has-text("Stop Broadcasting")');
    await expect(authenticatedPage.locator('text=Offline')).toBeVisible();
  });

  test('should display listener statistics', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Check for listener stats
    await expect(authenticatedPage.locator('.listener-count')).toBeVisible();
    await expect(authenticatedPage.locator('.station-analytics')).toBeVisible();
    await expect(authenticatedPage.locator('.peak-listeners')).toBeVisible();
  });

  test('should configure station settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Access station settings
    await authenticatedPage.click('button:has-text("Station Settings")');
    
    // Update station info
    await authenticatedPage.fill('input[name="stationName"]', 'Updated Jazz Station');
    await authenticatedPage.fill('textarea[name="description"]', 'Updated description');
    await authenticatedPage.selectOption('select[name="genre"]', 'smooth-jazz');
    
    // Configure streaming settings
    await authenticatedPage.selectOption('select[name="quality"]', 'high');
    await authenticatedPage.check('input[name="allowChatSubmissions"]');
    
    await authenticatedPage.click('button:has-text("Save Settings")');
    await expect(authenticatedPage.locator('text=Settings updated')).toBeVisible();
  });

  test('should handle song submissions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // View song submissions
    await authenticatedPage.click('button:has-text("Song Submissions")');
    await expect(authenticatedPage.locator('.submissions-list')).toBeVisible();
    
    // Approve a submission
    if (await authenticatedPage.locator('.submission-item:first-child .approve-btn').isVisible()) {
      await authenticatedPage.click('.submission-item:first-child .approve-btn');
      await expect(authenticatedPage.locator('text=Submission approved')).toBeVisible();
    }
  });

  test('should schedule programming', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Access programming schedule
    await authenticatedPage.click('button:has-text("Schedule")');
    
    // Add scheduled program
    await authenticatedPage.click('button:has-text("Add Program")');
    await authenticatedPage.fill('input[name="programName"]', 'Jazz Hour');
    await authenticatedPage.fill('input[name="startTime"]', '20:00');
    await authenticatedPage.fill('input[name="duration"]', '60');
    await authenticatedPage.selectOption('select[name="repeatType"]', 'daily');
    
    await authenticatedPage.click('button:has-text("Schedule Program")');
    await expect(authenticatedPage.locator('text=Program scheduled')).toBeVisible();
  });

  test('should display now playing information', async ({ page }) => {
    await page.goto('/browse-radio-stations');
    
    // Play a station
    await page.click('.station-card:first-child .play-btn');
    
    // Check now playing info
    await expect(page.locator('.now-playing .track-title')).toBeVisible();
    await expect(page.locator('.now-playing .artist-name')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
  });

  test('should handle audio quality selection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/browse-radio-stations');
    
    // Play a station
    await authenticatedPage.click('.station-card:first-child .play-btn');
    
    // Change audio quality
    await authenticatedPage.click('.quality-selector');
    await authenticatedPage.click('text=High Quality');
    
    await expect(authenticatedPage.locator('.quality-indicator')).toContainText('High');
  });

  test('should support station favorites', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/browse-radio-stations');
    
    // Add station to favorites
    await authenticatedPage.click('.station-card:first-child .favorite-btn');
    await expect(authenticatedPage.locator('text=Added to favorites')).toBeVisible();
    
    // Check favorites page
    await authenticatedPage.goto('/favorites');
    await expect(authenticatedPage.locator('.favorite-stations')).toBeVisible();
  });
});