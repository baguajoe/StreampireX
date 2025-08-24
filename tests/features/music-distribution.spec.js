// tests/features/music-distribution.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Music Distribution Features', () => {
  test('should access music distribution page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/music-distribution');
    
    await expect(authenticatedPage.locator('h1')).toContainText('Distribution');
    await expect(authenticatedPage.locator('.platform-list')).toBeVisible();
    await expect(authenticatedPage.locator('.distribution-platforms')).toBeVisible();
  });

  test('should display distribution platforms', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/music-distribution');
    
    // Check for major platforms
    await expect(authenticatedPage.locator('text=Spotify')).toBeVisible();
    await expect(authenticatedPage.locator('text=Apple Music')).toBeVisible();
    await expect(authenticatedPage.locator('text=Amazon Music')).toBeVisible();
    await expect(authenticatedPage.locator('text=YouTube Music')).toBeVisible();
  });

  test('should create new release', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/create-release');
    
    await authenticatedPage.fill('input[name="title"]', 'Test Album Release');
    await authenticatedPage.selectOption('select[name="genre"]', 'pop');
    await authenticatedPage.fill('input[name="releaseDate"]', '2024-12-31');
    await authenticatedPage.fill('textarea[name="description"]', 'My debut album for distribution');
    
    await authenticatedPage.setInputFiles('input[name="coverArt"]', {
      name: 'album-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-cover-data')
    });
    
    await authenticatedPage.click('button[type="submit"]');
    await expect(authenticatedPage.locator('text=Release created')).toBeVisible();
  });

  test('should upload track to release', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/create-release');
    
    // Create release first
    await authenticatedPage.fill('input[name="title"]', 'Single Release');
    await authenticatedPage.selectOption('select[name="genre"]', 'rock');
    await authenticatedPage.fill('input[name="releaseDate"]', '2024-12-25');
    
    await authenticatedPage.setInputFiles('input[name="coverArt"]', {
      name: 'single-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-cover-data')
    });
    
    await authenticatedPage.click('button[type="submit"]');
    
    // Add track to release
    await authenticatedPage.click('button:has-text("Add Track")');
    
    await authenticatedPage.fill('input[name="trackTitle"]', 'My Hit Song');
    await authenticatedPage.fill('input[name="artist"]', 'Test Artist');
    await authenticatedPage.fill('input[name="duration"]', '3:45');
    
    await authenticatedPage.setInputFiles('input[name="audioFile"]', {
      name: 'song.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio-data')
    });
    
    await authenticatedPage.click('button:has-text("Add Track")');
    await expect(authenticatedPage.locator('text=Track added')).toBeVisible();
  });

  test('should upload lyrics for track', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/upload-lyrics');
    
    await authenticatedPage.selectOption('select[name="track_id"]', '1');
    await authenticatedPage.fill('textarea[name="lyrics"]', `
      [Verse 1]
      This is a test song
      With some meaningful lyrics
      About life and dreams
      
      [Chorus]  
      We're testing the system
      Making sure it works right
      Every line and every word
      Captured in the light
      
      [Verse 2]
      Music distribution
      Reaching every platform
      Sharing our creation
      In digital form
    `);
    
    await authenticatedPage.click('button[type="submit"]');
    await expect(authenticatedPage.locator('text=Lyrics saved')).toBeVisible();
  });

  test('should manage collaborator splits', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/collaborator-splits');
    
    await expect(authenticatedPage.locator('.collaborator-form')).toBeVisible();
    
    // Add producer
    await authenticatedPage.fill('input[name="collaboratorName"]', 'John Producer');
    await authenticatedPage.selectOption('select[name="role"]', 'producer');
    await authenticatedPage.fill('input[name="percentage"]', '25');
    await authenticatedPage.click('button:has-text("Add Collaborator")');
    
    // Add songwriter
    await authenticatedPage.fill('input[name="collaboratorName"]', 'Jane Songwriter');
    await authenticatedPage.selectOption('select[name="role"]', 'songwriter');
    await authenticatedPage.fill('input[name="percentage"]', '30');
    await authenticatedPage.click('button:has-text("Add Collaborator")');
    
    // Add featured artist
    await authenticatedPage.fill('input[name="collaboratorName"]', 'Mike Featured');
    await authenticatedPage.selectOption('select[name="role"]', 'featured_artist');
    await authenticatedPage.fill('input[name="percentage"]', '15');
    await authenticatedPage.click('button:has-text("Add Collaborator")');
    
    await expect(authenticatedPage.locator('text=Collaborator added')).toBeVisible();
    
    // Verify total percentage calculation
    await expect(authenticatedPage.locator('.total-percentage')).toContainText('70%');
    await expect(authenticatedPage.locator('.remaining-percentage')).toContainText('30%');
  });

  test('should view release list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/releases');
    
    await expect(authenticatedPage.locator('.releases-grid')).toBeVisible();
    await expect(authenticatedPage.locator('.release-card')).toHaveCountGreaterThan(0);
    
    // Check release details
    await expect(authenticatedPage.locator('.release-card:first-child .release-title')).toBeVisible();
    await expect(authenticatedPage.locator('.release-card:first-child .release-date')).toBeVisible();
    await expect(authenticatedPage.locator('.release-card:first-child .release-status')).toBeVisible();
  });

  test('should track distribution status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/releases');
    
    // Click on a release to view details
    await authenticatedPage.click('.release-card:first-child');
    
    await expect(authenticatedPage.locator('.distribution-status')).toBeVisible();
    await expect(authenticatedPage.locator('.platform-status')).toBeVisible();
    
    // Check individual platform statuses
    const platforms = ['spotify', 'apple-music', 'amazon-music', 'youtube-music'];
    
    for (const platform of platforms) {
      await expect(authenticatedPage.locator(`[data-platform="${platform}"]`)).toBeVisible();
    }
  });

  test('should generate ISRC codes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/create-release');
    
    // Create release and add track
    await authenticatedPage.fill('input[name="title"]', 'ISRC Test Release');
    await authenticatedPage.selectOption('select[name="genre"]', 'electronic');
    await authenticatedPage.fill('input[name="releaseDate"]', '2024-12-20');
    
    await authenticatedPage.click('button[type="submit"]');
    await authenticatedPage.click('button:has-text("Add Track")');
    
    await authenticatedPage.fill('input[name="trackTitle"]', 'Electronic Beat');
    
    // Generate ISRC code
    await authenticatedPage.click('button:has-text("Generate ISRC")');
    
    await expect(authenticatedPage.locator('input[name="isrcCode"]')).not.toBeEmpty();
    await expect(authenticatedPage.locator('input[name="isrcCode"]')).toHaveValue(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/);
  });

  test('should set release pricing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/create-release');
    
    await authenticatedPage.fill('input[name="title"]', 'Priced Release');
    await authenticatedPage.selectOption('select[name="genre"]', 'jazz');
    await authenticatedPage.fill('input[name="releaseDate"]', '2024-12-15');
    
    // Set pricing options
    await authenticatedPage.fill('input[name="albumPrice"]', '9.99');
    await authenticatedPage.fill('input[name="trackPrice"]', '1.29');
    
    await authenticatedPage.check('input[name="allowStreaming"]');
    await authenticatedPage.check('input[name="allowDownload"]');
    
    await authenticatedPage.click('button[type="submit"]');
    await expect(authenticatedPage.locator('text=Release created')).toBeVisible();
  });

  test('should schedule release date', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/create-release');
    
    await authenticatedPage.fill('input[name="title"]', 'Scheduled Release');
    await authenticatedPage.selectOption('select[name="genre"]', 'indie');
    
    // Set future release date
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    const formattedDate = futureDate.toISOString().split('T')[0];
    
    await authenticatedPage.fill('input[name="releaseDate"]', formattedDate);
    await authenticatedPage.fill('input[name="releaseTime"]', '00:00');
    
    await authenticatedPage.check('input[name="scheduleRelease"]');
    
    await authenticatedPage.click('button[type="submit"]');
    
    await expect(authenticatedPage.locator('text=Release scheduled')).toBeVisible();
    await expect(authenticatedPage.locator('.release-status')).toContainText('Scheduled');
  });

  test('should handle distribution errors', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/releases');
    
    // Look for releases with errors
    const errorStatus = authenticatedPage.locator('.release-status.error');
    
    if (await errorStatus.isVisible()) {
      await errorStatus.click();
      
      await expect(authenticatedPage.locator('.error-details')).toBeVisible();
      await expect(authenticatedPage.locator('.retry-btn')).toBeVisible();
      
      // Test retry functionality
      await authenticatedPage.click('.retry-btn');
      await expect(authenticatedPage.locator('text=Retry initiated')).toBeVisible();
    }
  });

  test('should export distribution analytics', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/artist-dashboard');
    
    await expect(authenticatedPage.locator('.distribution-analytics')).toBeVisible();
    
    // Check analytics data
    await expect(authenticatedPage.locator('.total-streams')).toBeVisible();
    await expect(authenticatedPage.locator('.platform-breakdown')).toBeVisible();
    await expect(authenticatedPage.locator('.revenue-summary')).toBeVisible();
    
    // Export data
    await authenticatedPage.click('button:has-text("Export Analytics")');
    
    // Verify download was triggered (in real test, you'd check for actual download)
    await expect(authenticatedPage.locator('text=Export started')).toBeVisible();
  });
});