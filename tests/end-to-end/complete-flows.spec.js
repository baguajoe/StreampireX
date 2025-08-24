// tests/end-to-end/complete-flows.spec.js
import { test, expect } from '@playwright/test';

test.describe('Complete User Flows - End to End', () => {
  
  test('complete artist onboarding and content upload flow', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');
    await expect(page.locator('.hero h1')).toContainText('StreampireX');
    
    // 2. Sign up as artist
    await page.click('.signup-btn');
    
    // Step 1: Basic Info
    await page.fill('input[name="firstName"]', 'Artist');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'artist@test.com');
    await page.fill('input[name="username"]', 'artisttest');
    await page.fill('input[name="password"]', 'ArtistPass123!');
    await page.fill('input[name="confirmPassword"]', 'ArtistPass123!');
    await page.click('.btn-primary:has-text("Next")');
    
    // Step 2: Professional Info
    await page.selectOption('select[name="accountType"]', 'artist');
    await page.fill('input[name="artistName"]', 'Test Artist');
    await page.selectOption('select[name="primaryGenre"]', 'rock');
    await page.fill('textarea[name="bio"]', 'Passionate rock musician creating original music');
    await page.click('.btn-primary:has-text("Next")');
    
    // Step 3: Files & Location
    await page.selectOption('select[name="country"]', 'United States');
    await page.fill('input[name="city"]', 'Los Angeles');
    await page.click('.btn-primary:has-text("Next")');
    
    // Step 4: Legal
    await page.check('input[name="termsAccepted"]');
    await page.check('input[name="privacyAccepted"]');
    await page.check('input[name="ageVerification"]');
    await page.click('.btn-primary:has-text("Create Account")');
    
    await expect(page.locator('text=Account created successfully')).toBeVisible();
    
    // 3. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'artist@test.com');
    await page.fill('input[name="password"]', 'ArtistPass123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to home feed
    await page.waitForURL('**/home-feed', { timeout: 10000 });
    
    // 4. Navigate to artist dashboard
    await page.click('text=🎤 Artist Dashboard');
    await expect(page).toHaveURL(/.*artist-dashboard/);
    
    // 5. Upload first track
    await page.click('text=Upload Music');
    
    await page.fill('input[name="title"]', 'My First Song');
    await page.fill('input[name="artist"]', 'Test Artist');
    await page.selectOption('select[name="genre"]', 'rock');
    await page.fill('input[name="album"]', 'Debut Album');
    
    await page.setInputFiles('input[name="audio_file"]', {
      name: 'song.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-music-data')
    });
    
    await page.setInputFiles('input[name="cover_art"]', {
      name: 'cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Track uploaded')).toBeVisible();
    
    // 6. Create podcast
    await page.click('text=🎙️ Create Podcast');
    await page.fill('input[name="title"]', 'Artist Journey Podcast');
    await page.fill('textarea[name="description"]', 'Sharing my journey as an independent artist');
    await page.selectOption('select[name="category"]', 'Music');
    
    await page.setInputFiles('input[name="coverImage"]', {
      name: 'podcast-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-podcast-cover')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Podcast created')).toBeVisible();
    
    // 7. Set up music distribution
    await page.click('text=🌍 Music Distribution');
    await expect(page.locator('.platform-list')).toBeVisible();
    
    // 8. Create a release
    await page.click('button:has-text("Create Release")');
    await page.fill('input[name="title"]', 'Debut Album');
    await page.selectOption('select[name="genre"]', 'rock');
    await page.fill('input[name="releaseDate"]', '2024-12-31');
    
    await page.setInputFiles('input[name="coverArt"]', {
      name: 'album-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-album-cover')
    });
    
    // Select platforms for distribution
    await page.check('input[name="platforms"][value="spotify"]');
    await page.check('input[name="platforms"][value="apple-music"]');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Release created')).toBeVisible();
    
    // 9. Check analytics
    await page.click('text=🎤 Artist Dashboard');
    await expect(page.locator('.track-stats')).toBeVisible();
    await expect(page.locator('.earnings-overview')).toBeVisible();
  });

  test('gamer community engagement flow', async ({ page }) => {
    // 1. Sign up as gamer
    await page.goto('/register');
    
    // Basic info
    await page.fill('input[name="firstName"]', 'Pro');
    await page.fill('input[name="lastName"]', 'Gamer');
    await page.fill('input[name="email"]', 'gamer@test.com');
    await page.fill('input[name="username"]', 'progamer2024');
    await page.fill('input[name="password"]', 'GamerPass123!');
    await page.fill('input[name="confirmPassword"]', 'GamerPass123!');
    await page.click('.btn-primary:has-text("Next")');
    
    // Professional info - select gamer
    await page.selectOption('select[name="accountType"]', 'gamer');
    await page.fill('input[name="gamerTag"]', 'ProGamer2024');
    await page.selectOption('select[name="favoriteGame"]', 'Valorant');
    await page.selectOption('select[name="skillLevel"]', 'Advanced');
    await page.click('.btn-primary:has-text("Next")');
    
    // Location
    await page.selectOption('select[name="country"]', 'United States');
    await page.click('.btn-primary:has-text("Next")');
    
    // Legal
    await page.check('input[name="termsAccepted"]');
    await page.check('input[name="privacyAccepted"]');
    await page.check('input[name="ageVerification"]');
    await page.click('.btn-primary:has-text("Create Account")');
    
    // 2. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'gamer@test.com');
    await page.fill('input[name="password"]', 'GamerPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/home-feed', { timeout: 10000 });
    
    // 3. Set up gamer profile
    await page.click('text=🎮 Gamer Profile');
    await page.click('button:has-text("Edit Profile")');
    
    await page.fill('textarea[name="bio"]', 'Competitive Valorant player looking for teammates');
    await page.selectOption('select[name="preferredRole"]', 'duelist');
    await page.fill('input[name="rank"]', 'Diamond');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile updated')).toBeVisible();
    
    // 4. Join chatroom
    await page.click('text=💬 Gamer Chatrooms');
    await expect(page.locator('.chatroom-layout')).toBeVisible();
    
    // Join Valorant room
    await page.click('.room-btn:has-text("Valorant")');
    await expect(page.locator('.room-btn.active')).toBeVisible();
    
    // Send a message
    await page.fill('.chat-input input', 'Looking for teammates for ranked!');
    await page.click('.send-btn');
    await expect(page.locator('.chat-messages')).toContainText('Looking for teammates');
    
    // 5. Find squad
    await page.click('text=🔍 Find Squads');
    await expect(page.locator('h1')).toContainText('Squad');
    
    // Filter by game
    await page.selectOption('select[name="game"]', 'Valorant');
    await page.selectOption('select[name="skillLevel"]', 'Diamond');
    await page.click('button:has-text("Apply Filters")');
    
    // Join a squad if available
    if (await page.locator('.squad-card .join-btn').first().isVisible()) {
      await page.click('.squad-card .join-btn').first();
      await expect(page.locator('text=Squad request sent')).toBeVisible();
    }
    
    // 6. Create team room
    await page.click('text=🧑‍🤝‍🧑 Team Room');
    await page.click('button:has-text("Create Room")');
    
    await page.fill('input[name="roomName"]', 'Valorant Competitive Team');
    await page.selectOption('select[name="game"]', 'Valorant');
    await page.selectOption('select[name="gameMode"]', 'Competitive');
    await page.fill('input[name="maxMembers"]', '5');
    await page.fill('textarea[name="description"]', 'Looking for skilled Valorant players for competitive matches');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Team room created')).toBeVisible();
    
    // 7. Invite players
    await page.click('button:has-text("Invite Player")');
    await page.fill('input[name="username"]', 'testplayer');
    await page.click('button:has-text("Send Invite")');
    await expect(page.locator('text=Invitation sent')).toBeVisible();
    
    // 8. Check gaming achievements
    await page.click('text=🎮 Gamer Profile');
    await expect(page.locator('.achievements')).toBeVisible();
    await expect(page.locator('.gaming-stats')).toBeVisible();
  });

  test('content creator monetization flow', async ({ page }) => {
    // 1. Login as content creator
    await page.goto('/register');
    
    // Quick signup for creator
    await page.fill('input[name="firstName"]', 'Content');
    await page.fill('input[name="lastName"]', 'Creator');
    await page.fill('input[name="email"]', 'creator@test.com');
    await page.fill('input[name="username"]', 'contentcreator');
    await page.fill('input[name="password"]', 'CreatorPass123!');
    await page.fill('input[name="confirmPassword"]', 'CreatorPass123!');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="accountType"]', 'creator');
    await page.fill('input[name="creatorName"]', 'Creative Content Studio');
    await page.selectOption('select[name="contentType"]', 'educational');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="country"]', 'United States');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.check('input[name="termsAccepted"]');
    await page.check('input[name="privacyAccepted"]');
    await page.check('input[name="ageVerification"]');
    await page.click('.btn-primary:has-text("Create Account")');
    
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@test.com');
    await page.fill('input[name="password"]', 'CreatorPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/home-feed', { timeout: 10000 });
    
    // 2. Set up creator dashboard
    await page.click('text=🚀 Creator Dashboard');
    await expect(page.locator('.analytics-widget')).toBeVisible();
    
    // 3. Create multiple content types
    
    // Create podcast
    await page.click('text=🎙️ Create Podcast');
    await page.fill('input[name="title"]', 'Creator Tips Podcast');
    await page.fill('textarea[name="description"]', 'Tips and strategies for aspiring content creators');
    await page.selectOption('select[name="category"]', 'Education');
    
    await page.setInputFiles('input[name="coverImage"]', {
      name: 'podcast-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-podcast-cover')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Podcast created')).toBeVisible();
    
    // Upload first episode
    await page.click('button:has-text("Add Episode")');
    await page.fill('input[name="episodeTitle"]', 'Episode 1: Getting Started');
    await page.fill('textarea[name="episodeDescription"]', 'How to start your content creation journey');
    
    await page.setInputFiles('input[name="audioFile"]', {
      name: 'episode1.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio-data')
    });
    
    await page.click('button:has-text("Upload Episode")');
    await expect(page.locator('text=Episode uploaded')).toBeVisible();
    
    // Upload video
    await page.click('text=📤 Upload Video');
    await page.fill('input[name="title"]', 'How to Start Creating Content');
    await page.fill('textarea[name="description"]', 'Complete beginner guide to content creation');
    await page.selectOption('select[name="category"]', 'Education');
    await page.fill('input[name="tags"]', 'content creation, beginner, tutorial');
    
    await page.setInputFiles('input[name="video_file"]', {
      name: 'tutorial.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-video-data')
    });
    
    await page.setInputFiles('input[name="thumbnail"]', {
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-thumbnail')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Video uploaded')).toBeVisible();
    
    // 4. Set up storefront for monetization
    await page.click('text=💰 Sales Dashboard');
    
    // Create storefront
    await page.click('button:has-text("Set Up Storefront")');
    await page.fill('input[name="storeName"]', 'Creator Resources Hub');
    await page.fill('textarea[name="storeDescription"]', 'Digital templates, guides, and resources for content creators');
    await page.selectOption('select[name="storeCategory"]', 'Digital Products');
    
    await page.setInputFiles('input[name="storeLogo"]', {
      name: 'store-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-logo-data')
    });
    
    await page.click('button:has-text("Create Storefront")');
    await expect(page.locator('text=Storefront created')).toBeVisible();
    
    // 5. Add digital products
    await page.click('button:has-text("Add Product")');
    
    await page.fill('input[name="productName"]', 'Content Creator Starter Pack');
    await page.fill('input[name="price"]', '19.99');
    await page.fill('textarea[name="description"]', 'Complete starter pack with templates, checklists, and guides for new creators');
    await page.selectOption('select[name="category"]', 'Digital Products');
    await page.check('input[name="isDigital"]');
    
    await page.setInputFiles('input[name="productImage"]', {
      name: 'product-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-product-image')
    });
    
    await page.setInputFiles('input[name="productFile"]', {
      name: 'starter-pack.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('fake-zip-data')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Product added')).toBeVisible();
    
    // Add second product
    await page.click('button:has-text("Add Product")');
    await page.fill('input[name="productName"]', 'Advanced Creator Toolkit');
    await page.fill('input[name="price"]', '49.99');
    await page.fill('textarea[name="description"]', 'Advanced tools and strategies for experienced creators');
    await page.selectOption('select[name="category"]', 'Digital Products');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Product added')).toBeVisible();
    
    // 6. Set up monetization for content
    await page.click('text=🎧 Podcast Dashboard');
    await page.click('.podcast-card:first-child .monetization-btn');
    
    // Enable donations
    await page.check('input[name="enableDonations"]');
    await page.fill('input[name="donationGoal"]', '500');
    await page.fill('textarea[name="supportMessage"]', 'Support our podcast to help us create more valuable content!');
    
    // Enable premium content
    await page.check('input[name="enablePremium"]');
    await page.fill('input[name="premiumPrice"]', '4.99');
    await page.fill('textarea[name="premiumDescription"]', 'Get access to bonus episodes, early releases, and exclusive content');
    
    await page.click('button:has-text("Save Monetization Settings")');
    await expect(page.locator('text=Monetization settings saved')).toBeVisible();
    
    // 7. Check analytics and revenue
    await page.click('text=🚀 Creator Dashboard');
    await expect(page.locator('.revenue-summary')).toBeVisible();
    await expect(page.locator('.content-performance')).toBeVisible();
    await expect(page.locator('.audience-growth')).toBeVisible();
    
    // View detailed analytics
    await page.click('button:has-text("View Detailed Analytics")');
    await expect(page.locator('.analytics-dashboard')).toBeVisible();
    await expect(page.locator('.revenue-chart')).toBeVisible();
    await expect(page.locator('.engagement-metrics')).toBeVisible();
  });

  test('podcast listener discovery and engagement flow', async ({ page }) => {
    // 1. Visit homepage as guest
    await page.goto('/');
    await expect(page.locator('.hero h1')).toContainText('StreampireX');
    
    // 2. Browse podcasts without account
    await page.click('text=Podcasts');
    await expect(page.locator('.category-grid')).toBeVisible();
    
    // 3. Explore different categories
    await page.click('.category-card:has-text("Technology")');
    await expect(page.locator('.podcast-list')).toBeVisible();
    
    // 4. View podcast details
    await page.click('.podcast-item:first-child');
    await expect(page.locator('.podcast-details')).toBeVisible();
    await expect(page.locator('.episode-list')).toBeVisible();
    
    // 5. Try to play episode (should work for guests)
    await page.click('.episode-item:first-child .play-btn');
    await expect(page.locator('.audio-player')).toBeVisible();
    
    // 6. Try to save favorites (should prompt for signup)
    await page.click('button:has-text("Save to Favorites")');
    await expect(page).toHaveURL(/.*login/);
    
    // 7. Create account to access more features
    await page.click('text=Sign up here');
    
    // Quick signup as listener
    await page.fill('input[name="firstName"]', 'Podcast');
    await page.fill('input[name="lastName"]', 'Listener');
    await page.fill('input[name="email"]', 'listener@test.com');
    await page.fill('input[name="username"]', 'podcastfan');
    await page.fill('input[name="password"]', 'ListenerPass123!');
    await page.fill('input[name="confirmPassword"]', 'ListenerPass123!');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="accountType"]', 'listener');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="country"]', 'United States');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.check('input[name="termsAccepted"]');
    await page.check('input[name="privacyAccepted"]');
    await page.check('input[name="ageVerification"]');
    await page.click('.btn-primary:has-text("Create Account")');
    
    // 8. Login and explore with account
    await page.goto('/login');
    await page.fill('input[name="email"]', 'listener@test.com');
    await page.fill('input[name="password"]', 'ListenerPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/home-feed', { timeout: 10000 });
    
    // 9. Return to podcast and save favorites
    await page.click('text=Podcasts');
    await page.click('.category-card:has-text("Technology")');
    await page.click('.podcast-item:first-child');
    
    // Subscribe to podcast
    await page.click('.subscribe-btn');
    await expect(page.locator('.subscribe-btn')).toContainText('Subscribed');
    
    // Save to favorites
    await page.click('button:has-text("Save to Favorites")');
    await expect(page.locator('text=Added to favorites')).toBeVisible();
    
    // 10. Create custom playlist
    await page.goto('/profile');
    await page.click('button:has-text("Create Playlist")');
    await page.fill('input[name="playlistName"]', 'My Tech Podcasts');
    await page.fill('textarea[name="playlistDescription"]', 'Collection of my favorite technology podcasts');
    
    await page.click('button:has-text("Create Playlist")');
    await expect(page.locator('text=Playlist created')).toBeVisible();
    
    // 11. Add podcasts to playlist
    await page.goto('/browse-podcast-categories');
    await page.click('.category-card:has-text("Technology")');
    await page.click('.podcast-item:first-child .add-to-playlist');
    await page.selectOption('select[name="playlist"]', 'My Tech Podcasts');
    await page.click('button:has-text("Add to Playlist")');
    await expect(page.locator('text=Added to playlist')).toBeVisible();
    
    // 12. Leave review and comment
    await page.click('.podcast-item:first-child');
    await page.click('.add-review-btn');
    await page.selectOption('select[name="rating"]', '5');
    await page.fill('textarea[name="reviewText"]', 'Excellent podcast! Great content and production quality.');
    await page.click('button:has-text("Submit Review")');
    await expect(page.locator('text=Review submitted')).toBeVisible();
    
    // Comment on episode
    await page.click('.episode-item:first-child .comment-btn');
    await page.fill('textarea[name="comment"]', 'Really informative episode, learned so much!');
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator('text=Comment posted')).toBeVisible();
    
    // 13. Check personalized recommendations
    await page.goto('/home-feed');
    await expect(page.locator('.recommended-podcasts')).toBeVisible();
    await expect(page.locator('.continue-listening')).toBeVisible();
    
    // 14. Check favorites and playlists
    await page.goto('/favorites');
    await expect(page.locator('.favorites-grid')).toBeVisible();
    await expect(page.locator('.favorite-item')).toHaveCountGreaterThan(0);
    
    // View playlist
    await page.click('text=My Tech Podcasts');
    await expect(page.locator('.playlist-content')).toBeVisible();
  });

  test('radio station creation and management flow', async ({ page }) => {
    // 1. Signup as radio creator
    await page.goto('/register');
    
    await page.fill('input[name="firstName"]', 'Radio');
    await page.fill('input[name="lastName"]', 'DJ');
    await page.fill('input[name="email"]', 'radiodj@test.com');
    await page.fill('input[name="username"]', 'radiodj');
    await page.fill('input[name="password"]', 'RadioPass123!');
    await page.fill('input[name="confirmPassword"]', 'RadioPass123!');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="accountType"]', 'radio-host');
    await page.fill('input[name="djName"]', 'DJ Cool Waves');
    await page.selectOption('select[name="radioGenre"]', 'jazz');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="country"]', 'United States');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.check('input[name="termsAccepted"]');
    await page.check('input[name="privacyAccepted"]');
    await page.check('input[name="ageVerification"]');
    await page.click('.btn-primary:has-text("Create Account")');
    
    // 2. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'radiodj@test.com');
    await page.fill('input[name="password"]', 'RadioPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/home-feed', { timeout: 10000 });
    
    // 3. Create radio station
    await page.click('text=📻 Radio Dashboard');
    await page.click('button:has-text("Create Station")');
    
    await page.fill('input[name="name"]', '24/7 Jazz Lounge');
    await page.fill('textarea[name="description"]', 'Smooth jazz music around the clock with live DJ sets');
    await page.selectOption('select[name="genre"]', 'jazz');
    await page.check('input[name="isPublic"]');
    
    await page.setInputFiles('input[name="stationLogo"]', {
      name: 'jazz-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-logo-data')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Radio station created')).toBeVisible();
    
    // 4. Upload station mix for automated playback
    await page.click('button:has-text("Upload Mix")');
    
    await page.setInputFiles('input[name="audioFile"]', {
      name: 'jazz-mix.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake-audio-data')
    });
    
    await page.fill('input[name="mixTitle"]', 'Evening Jazz Session');
    await page.fill('textarea[name="mixDescription"]', 'Smooth jazz mix for evening relaxation');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Mix uploaded')).toBeVisible();
    
    // 5. Create and manage playlist
    await page.click('button:has-text("Manage Playlist")');
    await expect(page.locator('.playlist-manager')).toBeVisible();
    
    // Add tracks to playlist
    await page.click('button:has-text("Add Track")');
    await page.fill('input[name="trackTitle"]', 'Blue Note Blues');
    await page.fill('input[name="artist"]', 'Jazz Masters');
    await page.fill('input[name="duration"]', '4:30');
    await page.selectOption('select[name="mood"]', 'relaxed');
    
    await page.click('button:has-text("Add to Playlist")');
    await expect(page.locator('text=Track added')).toBeVisible();
    
    // Add more tracks
    await page.click('button:has-text("Add Track")');
    await page.fill('input[name="trackTitle"]', 'Midnight Saxophone');
    await page.fill('input[name="artist"]', 'Smooth Jazz Collective');
    await page.fill('input[name="duration"]', '5:15');
    await page.click('button:has-text("Add to Playlist")');
    
    // 6. Configure streaming settings
    await page.click('button:has-text("Stream Settings")');
    
    await page.selectOption('select[name="bitrate"]', '128kbps');
    await page.selectOption('select[name="format"]', 'mp3');
    await page.check('input[name="enableCrossfade"]');
    await page.fill('input[name="crossfadeDuration"]', '3');
    
    await page.click('button:has-text("Save Settings")');
    await expect(page.locator('text=Settings saved')).toBeVisible();
    
    // 7. Set up live streaming
    await page.click('button:has-text("Live Stream Setup")');
    
    // Get stream key for OBS
    await expect(page.locator('.stream-key')).toBeVisible();
    await page.click('.copy-stream-key');
    await expect(page.locator('text=Stream key copied')).toBeVisible();
    
    // 8. Start broadcasting
    await page.click('button:has-text("Start Broadcasting")');
    await expect(page.locator('.broadcasting-indicator')).toBeVisible();
    await expect(page.locator('text=Live')).toBeVisible();
    
    // 9. Monitor listener statistics
    await expect(page.locator('.listener-count')).toBeVisible();
    await expect(page.locator('.station-analytics')).toBeVisible();
    
    // 10. Enable listener interactions
    await page.click('button:has-text("Chat Settings")');
    await page.check('input[name="enableChat"]');
    await page.check('input[name="allowSongRequests"]');
    await page.click('button:has-text("Save Chat Settings")');
    
    // 11. Schedule programming
    await page.click('button:has-text("Program Schedule")');
    
    // Create morning show
    await page.click('button:has-text("Add Program")');
    await page.fill('input[name="programName"]', 'Morning Jazz Cafe');
    await page.fill('input[name="startTime"]', '06:00');
    await page.fill('input[name="duration"]', '180'); // 3 hours
    await page.selectOption('select[name="programType"]', 'live-show');
    await page.check('input[name="mondayToFriday"]');
    
    await page.click('button:has-text("Schedule Program")');
    await expect(page.locator('text=Program scheduled')).toBeVisible();
    
    // 12. Test from listener perspective
    await page.goto('/browse-radio-stations');
    
    // Find our station
    await page.click('text=Lo-Fi'); // Filter by genre first
    await page.click('text=24/7 Jazz Lounge');
    
    // Play station
    await page.click('.play-btn');
    await expect(page.locator('.radio-player')).toBeVisible();
    await expect(page.locator('.now-playing')).toBeVisible();
    
    // Check station info
    await expect(page.locator('.station-info')).toContainText('24/7 Jazz Lounge');
    await expect(page.locator('.listener-count')).toBeVisible();
  });

  test('complete marketplace seller journey', async ({ page }) => {
    // 1. Signup as seller
    await page.goto('/register');
    
    await page.fill('input[name="firstName"]', 'Digital');
    await page.fill('input[name="lastName"]', 'Seller');
    await page.fill('input[name="email"]', 'seller@test.com');
    await page.fill('input[name="username"]', 'digitalseller');
    await page.fill('input[name="password"]', 'SellerPass123!');
    await page.fill('input[name="confirmPassword"]', 'SellerPass123!');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="accountType"]', 'seller');
    await page.fill('input[name="businessName"]', 'Digital Assets Store');
    await page.selectOption('select[name="businessType"]', 'digital-products');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.selectOption('select[name="country"]', 'United States');
    await page.click('.btn-primary:has-text("Next")');
    
    await page.check('input[name="termsAccepted"]');
    await page.check('input[name="privacyAccepted"]');
    await page.check('input[name="ageVerification"]');
    await page.click('.btn-primary:has-text("Create Account")');
    
    // 2. Login and set up storefront
    await page.goto('/login');
    await page.fill('input[name="email"]', 'seller@test.com');
    await page.fill('input[name="password"]', 'SellerPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/home-feed', { timeout: 10000 });
    
    // 3. Create storefront
    await page.click('text=💰 Sales Dashboard');
    await page.click('button:has-text("Set Up Storefront")');
    
    await page.fill('input[name="storeName"]', 'Premium Digital Assets');
    await page.fill('textarea[name="storeDescription"]', 'High-quality digital templates, graphics, and audio resources');
    await page.selectOption('select[name="storeCategory"]', 'Digital Products');
    await page.fill('input[name="storeWebsite"]', 'https://premiumdigitalassets.com');
    
    await page.setInputFiles('input[name="storeLogo"]', {
      name: 'store-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-logo')
    });
    
    await page.click('button:has-text("Create Storefront")');
    await expect(page.locator('text=Storefront created')).toBeVisible();
    
    // 4. Add multiple products
    
    // Product 1: Digital Template Pack
    await page.click('button:has-text("Add Product")');
    await page.fill('input[name="productName"]', 'Social Media Template Pack');
    await page.fill('input[name="price"]', '24.99');
    await page.fill('textarea[name="description"]', 'Complete pack of 50+ social media templates for Instagram, Facebook, and Twitter');
    await page.selectOption('select[name="category"]', 'Templates');
    await page.check('input[name="isDigital"]');
    
    // Add product tags
    await page.fill('input[name="tags"]', 'social media, templates, instagram, facebook, design');
    
    await page.setInputFiles('input[name="productImage"]', {
      name: 'template-pack.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-product-image')
    });
    
    await page.setInputFiles('input[name="productFile"]', {
      name: 'social-templates.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('fake-template-pack')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Product added')).toBeVisible();
    
    // Product 2: Audio Pack
    await page.click('button:has-text("Add Product")');
    await page.fill('input[name="productName"]', 'Lo-Fi Hip Hop Beat Pack');
    await page.fill('input[name="price"]', '39.99');
    await page.fill('textarea[name="description"]', '20 original lo-fi hip hop beats perfect for content creation and relaxation');
    await page.selectOption('select[name="category"]', 'Audio');
    await page.check('input[name="isDigital"]');
    
    await page.setInputFiles('input[name="productImage"]', {
      name: 'beats-cover.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-beats-cover')
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Product added')).toBeVisible();
    
    // Product 3: Physical merchandise
    await page.click('button:has-text("Add Product")');
    await page.fill('input[name="productName"]', 'StreampireX Branded T-Shirt');
    await page.fill('input[name="price"]', '19.99');
    await page.fill('textarea[name="description"]', 'High-quality cotton t-shirt with StreampireX logo');
    await page.selectOption('select[name="category"]', 'Merchandise');
    await page.uncheck('input[name="isDigital"]'); // Physical product
    await page.fill('input[name="stock"]', '100');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Product added')).toBeVisible();
    
    // 5. Configure payment and shipping
    await page.click('button:has-text("Store Settings")');
    
    // Payment settings
    await page.fill('input[name="paypalEmail"]', 'seller@test.com');
    await page.check('input[name="acceptCrypto"]');
    
    // Shipping settings for physical products
    await page.fill('input[name="shippingCost"]', '5.99');
    await page.check('input[name="freeShippingOver"]');
    await page.fill('input[name="freeShippingThreshold"]', '50.00');
    
    await page.click('button:has-text("Save Settings")');
    await expect(page.locator('text=Settings saved')).toBeVisible();
    
    // 6. Monitor sales and analytics
    await expect(page.locator('.sales-metrics')).toBeVisible();
    await expect(page.locator('.product-performance')).toBeVisible();
    
    // Check individual product analytics
    await page.click('.product-item:first-child .analytics-btn');
    await expect(page.locator('.product-analytics')).toBeVisible();
    await expect(page.locator('.views-chart')).toBeVisible();
    await expect(page.locator('.conversion-rate')).toBeVisible();
    
    // 7. Test buyer experience
    // Open new tab as buyer
    const buyerPage = await page.context().newPage();
    await buyerPage.goto('/marketplace');
    
    // Browse and find our products
    await buyerPage.fill('.search-bar input', 'Social Media Template');
    await buyerPage.click('.search-btn');
    
    await buyerPage.click('.product-card:has-text("Social Media Template Pack")');
    await expect(buyerPage.locator('.product-details')).toBeVisible();
    await expect(buyerPage.locator('.price')).toContainText('24.99');
    
    // Add to cart
    await buyerPage.click('.add-to-cart-btn');
    await expect(buyerPage.locator('text=Added to cart')).toBeVisible();
    
    // View cart
    await buyerPage.goto('/cart');
    await expect(buyerPage.locator('.cart-items')).toBeVisible();
    await expect(buyerPage.locator('text=Social Media Template Pack')).toBeVisible();
    
    // Close buyer page
    await buyerPage.close();
    
    // 8. Handle orders and customer service
    await page.goto('/sales-dashboard');
    
    // Check for new orders
    await page.click('button:has-text("View Orders")');
    await expect(page.locator('.order-management')).toBeVisible();
    
    // Process an order if available
    if (await page.locator('.order-item:first-child .process-btn').isVisible()) {
      await page.click('.order-item:first-child .process-btn');
      await page.selectOption('select[name="orderStatus"]', 'processing');
      await page.click('button:has-text("Update Order")');
      await expect(page.locator('text=Order updated')).toBeVisible();
    }
    
    // 9. Check earnings and payouts
    await page.click('text=💰 Sales Dashboard');
    await expect(page.locator('.earnings-summary')).toBeVisible();
    await expect(page.locator('.recent-sales')).toBeVisible();
    
    // Request payout
    await page.click('button:has-text("Request Payout")');
    await page.fill('input[name="amount"]', '100.00');
    await page.selectOption('select[name="payoutMethod"]', 'paypal');
    await page.click('button:has-text("Submit Request")');
    await expect(page.locator('text=Payout requested')).toBeVisible();
  });
});