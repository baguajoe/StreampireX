// tests/features/podcasts.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Podcast Features', () => {
  test('should browse podcast categories', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    
    // Should display category grid
    await expect(page.locator('.category-grid')).toBeVisible();
    await expect(page.locator('.category-card')).toHaveCountGreaterThan(0);
    
    // Check for specific categories based on your project knowledge
    await expect(page.locator('.category-card:has-text("True Crime")')).toBeVisible();
    await expect(page.locator('.category-card:has-text("Technology")')).toBeVisible();
    await expect(page.locator('.category-card:has-text("Education")')).toBeVisible();
    await expect(page.locator('.category-card:has-text("Comedy")')).toBeVisible();
  });

  test('should navigate to category page', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    
    // Click on a category
    await page.click('.category-card:first-child');
    await expect(page).toHaveURL(/.*podcast-category\/.*/);
    await expect(page.locator('.podcast-list')).toBeVisible();
    await expect(page.locator('.category-header')).toBeVisible();
  });

  test('should view podcast details', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    await page.click('.category-card:first-child');
    
    // Click on a podcast
    await page.click('.podcast-item:first-child');
    await expect(page).toHaveURL(/.*podcast\/\d+/);
    
    // Check podcast detail elements
    await expect(page.locator('.podcast-header')).toBeVisible();
    await expect(page.locator('.podcast-title')).toBeVisible();
    await expect(page.locator('.podcast-description')).toBeVisible();
    await expect(page.locator('.episode-list')).toBeVisible();
    await expect(page.locator('.subscribe-btn')).toBeVisible();
  });

  test('should play podcast episode', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    await page.click('.category-card:first-child');
    await page.click('.podcast-item:first-child');
    
    // Click play on first episode
    await page.click('.episode-item:first-child .play-btn');
    
    // Should start audio player
    await expect(page.locator('.audio-player')).toBeVisible();
    await expect(page.locator('.play-pause-btn')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.volume-control')).toBeVisible();
    await expect(page.locator('.episode-info')).toBeVisible();
  });

  test('should control audio playback', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    await page.click('.category-card:first-child');
    await page.click('.podcast-item:first-child');
    await page.click('.episode-item:first-child .play-btn');
    
    // Test play/pause
    await expect(page.locator('.play-pause-btn')).toHaveClass(/playing/);
    await page.click('.play-pause-btn');
    await expect(page.locator('.play-pause-btn')).toHaveClass(/paused/);
    
    // Test volume control
    await page.click('.volume-control');
    await page.locator('.volume-slider').dragTo(page.locator('.volume-slider'), {
      targetPosition: { x: 50, y: 0 }
    });
    
    // Test seek functionality
    await page.click('.progress-bar');
    await expect(page.locator('.current-time')).not.toContainText('0:00');
  });

  test('should create new podcast', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-create');
    
    // Fill podcast creation form
    await authenticatedPage.fill('input[name="title"]', 'My Test Podcast');
    await authenticatedPage.fill('textarea[name="description"]', 'A great test podcast about technology and innovation');
    await authenticatedPage.selectOption('select[name="category"]', 'Technology');
    await authenticatedPage.selectOption('select[name="language"]', 'en');
    
    // Upload cover image
    await authenticatedPage.setInputFiles('input[type="file"][name="coverImage"]', {
      name: 'podcast-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });
    
    await authenticatedPage.click('button[type="submit"]');
    
    // Should redirect to podcast dashboard
    await expect(authenticatedPage).toHaveURL(/.*podcast-dashboard/);
    await expect(authenticatedPage.locator('text=My Test Podcast')).toBeVisible();
  });

  test('should upload podcast episode', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    
    // Select existing podcast or create one first
    await authenticatedPage.click('.podcast-card:first-child .add-episode-btn');
    
    // Fill episode details
    await authenticatedPage.fill('input[name="episodeTitle"]', 'Episode 1: Getting Started');
    await authenticatedPage.fill('textarea[name="episodeDescription"]', 'In this first episode, we discuss the basics of our topic');
    await authenticatedPage.selectOption('select[name="episodeType"]', 'full');
    
    // Upload audio file
    await authenticatedPage.setInputFiles('input[name="audioFile"]', {
      name: 'episode1.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio-data')
    });
    
    // Set episode settings
    await authenticatedPage.check('input[name="isExplicit"]');
    await authenticatedPage.fill('input[name="seasonNumber"]', '1');
    await authenticatedPage.fill('input[name="episodeNumber"]', '1');
    
    await authenticatedPage.click('button:has-text("Upload Episode")');
    await expect(authenticatedPage.locator('text=Episode uploaded')).toBeVisible();
  });

  test('should manage podcast dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    
    // Check dashboard elements
    await expect(authenticatedPage.locator('.podcasts-overview')).toBeVisible();
    await expect(authenticatedPage.locator('.analytics-summary')).toBeVisible();
    await expect(authenticatedPage.locator('.recent-episodes')).toBeVisible();
    await expect(authenticatedPage.locator('.podcast-stats')).toBeVisible();
    
    // Test podcast management actions
    await expect(authenticatedPage.locator('button:has-text("Create New Podcast")')).toBeVisible();
    await expect(authenticatedPage.locator('.podcast-grid')).toBeVisible();
  });

  test('should edit existing podcast', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    
    // Edit first podcast
    await authenticatedPage.click('.podcast-card:first-child .edit-btn');
    
    // Update podcast details
    await authenticatedPage.fill('input[name="title"]', 'Updated Podcast Title');
    await authenticatedPage.fill('textarea[name="description"]', 'Updated podcast description with more details');
    await authenticatedPage.selectOption('select[name="category"]', 'Education');
    
    // Update settings
    await authenticatedPage.check('input[name="isExplicit"]');
    await authenticatedPage.selectOption('select[name="updateFrequency"]', 'weekly');
    
    await authenticatedPage.click('button:has-text("Update Podcast")');
    await expect(authenticatedPage.locator('text=Podcast updated')).toBeVisible();
  });

  test('should manage episode scheduling', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    await authenticatedPage.click('.podcast-card:first-child .manage-btn');
    
    // Schedule episode release
    await authenticatedPage.click('button:has-text("Schedule Episode")');
    
    await authenticatedPage.fill('input[name="episodeTitle"]', 'Scheduled Episode');
    await authenticatedPage.fill('textarea[name="episodeDescription"]', 'This episode will be released later');
    
    // Set future release date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = futureDate.toISOString().split('T')[0];
    
    await authenticatedPage.fill('input[name="publishDate"]', dateString);
    await authenticatedPage.fill('input[name="publishTime"]', '09:00');
    
    await authenticatedPage.setInputFiles('input[name="audioFile"]', {
      name: 'scheduled-episode.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio-data')
    });
    
    await authenticatedPage.click('button:has-text("Schedule for Release")');
    await expect(authenticatedPage.locator('text=Episode scheduled')).toBeVisible();
  });

  test('should view podcast analytics', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    
    // Access analytics
    await authenticatedPage.click('.podcast-card:first-child .analytics-btn');
    
    // Check analytics elements
    await expect(authenticatedPage.locator('.downloads-chart')).toBeVisible();
    await expect(authenticatedPage.locator('.listener-demographics')).toBeVisible();
    await expect(authenticatedPage.locator('.episode-performance')).toBeVisible();
    await expect(authenticatedPage.locator('.geographic-data')).toBeVisible();
    
    // Test time period filters
    await authenticatedPage.selectOption('select[name="timePeriod"]', 'last-30-days');
    await expect(authenticatedPage.locator('.analytics-data')).toBeVisible();
    
    // Test export functionality
    await authenticatedPage.click('button:has-text("Export Analytics")');
    await expect(authenticatedPage.locator('text=Analytics exported')).toBeVisible();
  });

  test('should manage podcast RSS feed', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    
    // Access RSS settings
    await authenticatedPage.click('.podcast-card:first-child .rss-settings');
    
    // Check RSS URL
    await expect(authenticatedPage.locator('.rss-url')).toBeVisible();
    await expect(authenticatedPage.locator('.rss-url')).toContainText('rss');
    
    // Copy RSS URL
    await authenticatedPage.click('.copy-rss-btn');
    await expect(authenticatedPage.locator('text=RSS URL copied')).toBeVisible();
    
    // Test RSS validation
    await authenticatedPage.click('button:has-text("Validate RSS")');
    await expect(authenticatedPage.locator('text=RSS feed valid')).toBeVisible();
  });

  test('should handle podcast monetization', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    
    // Access monetization settings
    await authenticatedPage.click('.podcast-card:first-child .monetization-btn');
    
    // Enable listener support
    await authenticatedPage.check('input[name="enableDonations"]');
    await authenticatedPage.fill('input[name="donationGoal"]', '500');
    await authenticatedPage.fill('textarea[name="supportMessage"]', 'Support our podcast to help us create more content!');
    
    // Set up premium content
    await authenticatedPage.check('input[name="enablePremium"]');
    await authenticatedPage.fill('input[name="premiumPrice"]', '4.99');
    await authenticatedPage.fill('textarea[name="premiumDescription"]', 'Get access to bonus episodes and early releases');
    
    // Configure sponsorship
    await authenticatedPage.check('input[name="acceptSponsors"]');
    await authenticatedPage.selectOption('select[name="sponsorshipRate"]', 'standard');
    
    await authenticatedPage.click('button:has-text("Save Monetization Settings")');
    await expect(authenticatedPage.locator('text=Monetization settings saved')).toBeVisible();
  });

  test('should manage episode transcripts', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/podcast-dashboard');
    await authenticatedPage.click('.podcast-card:first-child .manage-episodes');
    
    // Add transcript to episode
    await authenticatedPage.click('.episode-item:first-child .add-transcript');
    
    // Upload transcript file
    await authenticatedPage.setInputFiles('input[name="transcriptFile"]', {
      name: 'episode-transcript.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a test transcript of the episode content...')
    });
    
    // Or add manual transcript
    await authenticatedPage.click('button:has-text("Manual Entry")');
    await authenticatedPage.fill('textarea[name="transcriptText"]', 'Welcome to our podcast. Today we discuss...');
    
    await authenticatedPage.click('button:has-text("Save Transcript")');
    await expect(authenticatedPage.locator('text=Transcript saved')).toBeVisible();
  });

  test('should handle podcast sharing and social media', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    await page.click('.category-card:first-child');
    await page.click('.podcast-item:first-child');
    
    // Test sharing functionality
    await page.click('.share-podcast-btn');
    await expect(page.locator('.share-modal')).toBeVisible();
    
    // Check social media sharing options
    await expect(page.locator('.share-twitter')).toBeVisible();
    await expect(page.locator('.share-facebook')).toBeVisible();
    await expect(page.locator('.share-linkedin')).toBeVisible();
    
    // Test direct link copying
    await page.click('.copy-link-btn');
    await expect(page.locator('text=Link copied')).toBeVisible();
    
    // Test embed code
    await page.click('.embed-code-btn');
    await expect(page.locator('.embed-code')).toBeVisible();
    await page.click('.copy-embed-btn');
    await expect(page.locator('text=Embed code copied')).toBeVisible();
  });

  test('should support podcast search and filtering', async ({ page }) => {
    await page.goto('/browse-podcast-categories');
    
    // Test search functionality
    await page.fill('.podcast-search input', 'technology');
    await page.click('.search-btn');
    
    await expect(page.locator('.search-results')).toBeVisible();
    await expect(page.locator('.podcast-item')).toHaveCountGreaterThan(0);
    
    // Test category filtering
    await page.selectOption('select[name="categoryFilter"]', 'Technology');
    await expect(page.locator('.filtered-results')).toBeVisible();
    
    // Test sorting options
    await page.selectOption('select[name="sortBy"]', 'most-popular');
    await expect(page.locator('.sorted-results')).toBeVisible();
    
    // Test language filtering
    await page.selectOption('select[name="languageFilter"]', 'en');
    await expect(page.locator('.language-filtered')).toBeVisible();
  });

  test('should handle podcast subscriptions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/browse-podcast-categories');
    await authenticatedPage.click('.category-card:first-child');
    await authenticatedPage.click('.podcast-item:first-child');
    
    // Subscribe to podcast
    await authenticatedPage.click('.subscribe-btn');
    await expect(authenticatedPage.locator('.subscribe-btn')).toContainText('Subscribed');
    
    // Check subscription in user dashboard
    await authenticatedPage.goto('/profile');
    await authenticatedPage.click('.subscriptions-tab');
    await expect(authenticatedPage.locator('.subscribed-podcasts')).toBeVisible();
    
    // Unsubscribe
    await authenticatedPage.goto('/browse-podcast-categories');
    await authenticatedPage.click('.category-card:first-child');
    await authenticatedPage.click('.podcast-item:first-child');
    await authenticatedPage.click('.subscribe-btn');
    await expect(authenticatedPage.locator('.subscribe-btn')).toContainText('Subscribe');
  });

  test('should handle podcast comments and reviews', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/browse-podcast-categories');
    await authenticatedPage.click('.category-card:first-child');
    await authenticatedPage.click('.podcast-item:first-child');
    
    // Add a review
    await authenticatedPage.click('.add-review-btn');
    await authenticatedPage.selectOption('select[name="rating"]', '5');
    await authenticatedPage.fill('textarea[name="reviewText"]', 'Great podcast! Really enjoyed the content and production quality.');
    
    await authenticatedPage.click('button:has-text("Submit Review")');
    await expect(authenticatedPage.locator('text=Review submitted')).toBeVisible();
    
    // Add comment to episode
    await authenticatedPage.click('.episode-item:first-child .comment-btn');
    await authenticatedPage.fill('textarea[name="comment"]', 'Really interesting episode, learned a lot!');
    
    await authenticatedPage.click('button:has-text("Post Comment")');
    await expect(authenticatedPage.locator('text=Comment posted')).toBeVisible();
  });

  test('should support podcast playlists', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile');
    
    // Create podcast playlist
    await authenticatedPage.click('.create-playlist-btn');
    await authenticatedPage.fill('input[name="playlistName"]', 'My Tech Podcasts');
    await authenticatedPage.fill('textarea[name="playlistDescription"]', 'Collection of my favorite technology podcasts');
    
    await authenticatedPage.click('button:has-text("Create Playlist")');
    await expect(authenticatedPage.locator('text=Playlist created')).toBeVisible();
    
    // Add podcast to playlist
    await authenticatedPage.goto('/browse-podcast-categories');
    await authenticatedPage.click('.category-card:first-child');
    await authenticatedPage.click('.podcast-item:first-child .add-to-playlist');
    
    await authenticatedPage.selectOption('select[name="playlist"]', 'My Tech Podcasts');
    await authenticatedPage.click('button:has-text("Add to Playlist")');
    
    await expect(authenticatedPage.locator('text=Added to playlist')).toBeVisible();
  });
});