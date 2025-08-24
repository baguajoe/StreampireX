// tests/features/content-creation.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Content Creation Features', () => {
  
  test.describe('Podcast Creation and Management', () => {
    test('should create new podcast', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-create');
      
      // Fill podcast creation form
      await authenticatedPage.fill('input[name="title"]', 'Tech Innovation Podcast');
      await authenticatedPage.fill('textarea[name="description"]', 'Exploring the latest in technology and innovation with industry experts');
      await authenticatedPage.selectOption('select[name="category"]', 'Technology');
      await authenticatedPage.selectOption('select[name="language"]', 'en');
      
      // Set podcast settings
      await authenticatedPage.check('input[name="isExplicit"]');
      await authenticatedPage.selectOption('select[name="updateFrequency"]', 'weekly');
      
      // Upload cover image
      await authenticatedPage.setInputFiles('input[type="file"][name="coverImage"]', {
        name: 'podcast-cover.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-podcast-cover-data')
      });
      
      await authenticatedPage.click('button[type="submit"]');
      
      // Should redirect to podcast dashboard and show success
      await expect(authenticatedPage).toHaveURL(/.*podcast-dashboard/);
      await expect(authenticatedPage.locator('text=Tech Innovation Podcast')).toBeVisible();
      await expect(authenticatedPage.locator('text=Podcast created')).toBeVisible();
    });

    test('should upload podcast episode', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      // Create podcast first or select existing one
      if (await authenticatedPage.locator('.podcast-card').count() === 0) {
        await authenticatedPage.click('button:has-text("Create New Podcast")');
        await authenticatedPage.fill('input[name="title"]', 'Episode Test Podcast');
        await authenticatedPage.fill('textarea[name="description"]', 'For testing episode uploads');
        await authenticatedPage.selectOption('select[name="category"]', 'Education');
        await authenticatedPage.click('button[type="submit"]');
      }
      
      // Add episode to existing podcast
      await authenticatedPage.click('.podcast-card:first-child .add-episode-btn');
      
      // Fill episode details
      await authenticatedPage.fill('input[name="episodeTitle"]', 'Episode 1: Introduction to AI');
      await authenticatedPage.fill('textarea[name="episodeDescription"]', 'In this first episode, we explore the fundamentals of artificial intelligence and its impact on society');
      await authenticatedPage.selectOption('select[name="episodeType"]', 'full');
      
      // Set episode metadata
      await authenticatedPage.fill('input[name="seasonNumber"]', '1');
      await authenticatedPage.fill('input[name="episodeNumber"]', '1');
      await authenticatedPage.fill('input[name="duration"]', '45:30');
      
      // Upload audio file
      await authenticatedPage.setInputFiles('input[name="audioFile"]', {
        name: 'episode1.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake-audio-data')
      });
      
      // Set publishing options
      await authenticatedPage.check('input[name="publishImmediately"]');
      
      await authenticatedPage.click('button:has-text("Upload Episode")');
      await expect(authenticatedPage.locator('text=Episode uploaded')).toBeVisible();
    });

    test('should schedule episode for future release', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      await authenticatedPage.click('.podcast-card:first-child .add-episode-btn');
      
      await authenticatedPage.fill('input[name="episodeTitle"]', 'Episode 2: Future of AI');
      await authenticatedPage.fill('textarea[name="episodeDescription"]', 'Exploring what the future holds for artificial intelligence');
      
      // Set future release date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString().split('T')[0];
      
      await authenticatedPage.uncheck('input[name="publishImmediately"]');
      await authenticatedPage.fill('input[name="publishDate"]', dateString);
      await authenticatedPage.fill('input[name="publishTime"]', '09:00');
      
      await authenticatedPage.setInputFiles('input[name="audioFile"]', {
        name: 'episode2.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake-audio-data-2')
      });
      
      await authenticatedPage.click('button:has-text("Schedule Episode")');
      await expect(authenticatedPage.locator('text=Episode scheduled')).toBeVisible();
    });

    test('should add episode transcript', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      await authenticatedPage.click('.podcast-card:first-child .manage-episodes');
      
      // Add transcript to existing episode
      await authenticatedPage.click('.episode-item:first-child .add-transcript');
      
      // Upload transcript file
      await authenticatedPage.setInputFiles('input[name="transcriptFile"]', {
        name: 'episode-transcript.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Welcome to our podcast. Today we discuss artificial intelligence and its implications...')
      });
      
      await authenticatedPage.click('button:has-text("Upload Transcript")');
      await expect(authenticatedPage.locator('text=Transcript uploaded')).toBeVisible();
      
      // Or add manual transcript
      await authenticatedPage.click('button:has-text("Add Manual Transcript")');
      await authenticatedPage.fill('textarea[name="transcriptText"]', `
        [00:00] Welcome to our podcast
        [00:15] Today we're discussing AI
        [00:30] Let's start with the basics
      `);
      
      await authenticatedPage.click('button:has-text("Save Transcript")');
      await expect(authenticatedPage.locator('text=Transcript saved')).toBeVisible();
    });

    test('should manage podcast monetization', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      await authenticatedPage.click('.podcast-card:first-child .monetization-btn');
      
      // Enable listener support
      await authenticatedPage.check('input[name="enableDonations"]');
      await authenticatedPage.fill('input[name="donationGoal"]', '1000');
      await authenticatedPage.fill('textarea[name="supportMessage"]', 'Support our podcast to help us create more quality content!');
      
      // Set up premium content
      await authenticatedPage.check('input[name="enablePremium"]');
      await authenticatedPage.fill('input[name="premiumPrice"]', '4.99');
      await authenticatedPage.fill('textarea[name="premiumDescription"]', 'Get access to bonus episodes, early releases, and exclusive behind-the-scenes content');
      
      // Configure sponsorship
      await authenticatedPage.check('input[name="acceptSponsors"]');
      await authenticatedPage.selectOption('select[name="sponsorshipRate"]', 'standard');
      await authenticatedPage.fill('input[name="sponsorshipEmail"]', 'sponsors@podcast.com');
      
      await authenticatedPage.click('button:has-text("Save Monetization Settings")');
      await expect(authenticatedPage.locator('text=Monetization settings saved')).toBeVisible();
    });
  });

  test.describe('Music Upload and Management', () => {
    test('should upload single track', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist/upload');
      
      await authenticatedPage.fill('input[name="title"]', 'Digital Dreams');
      await authenticatedPage.fill('input[name="artist"]', 'Test Artist');
      await authenticatedPage.selectOption('select[name="genre"]', 'electronic');
      await authenticatedPage.fill('input[name="album"]', 'Future Sounds');
      await authenticatedPage.fill('input[name="year"]', '2024');
      await authenticatedPage.fill('input[name="trackNumber"]', '1');
      
      // Add collaborators
      await authenticatedPage.click('button:has-text("Add Collaborator")');
      await authenticatedPage.fill('input[name="collaboratorName"]', 'Producer Mike');
      await authenticatedPage.selectOption('select[name="collaboratorRole"]', 'producer');
      await authenticatedPage.fill('input[name="collaboratorPercentage"]', '25');
      
      // Upload audio file
      await authenticatedPage.setInputFiles('input[name="audio_file"]', {
        name: 'digital-dreams.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake-music-data')
      });
      
      // Upload cover art
      await authenticatedPage.setInputFiles('input[name="cover_art"]', {
        name: 'cover-art.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-cover-art-data')
      });
      
      // Set metadata
      await authenticatedPage.fill('input[name="bpm"]', '128');
      await authenticatedPage.selectOption('select[name="key"]', 'C-major');
      await authenticatedPage.selectOption('select[name="mood"]', 'energetic');
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Track uploaded')).toBeVisible();
    });

    test('should create album and add tracks', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/create-release');
      
      // Create album
      await authenticatedPage.fill('input[name="title"]', 'Electronic Odyssey');
      await authenticatedPage.selectOption('select[name="genre"]', 'electronic');
      await authenticatedPage.fill('input[name="releaseDate"]', '2024-12-31');
      await authenticatedPage.fill('textarea[name="description"]', 'A journey through electronic soundscapes');
      
      // Album metadata
      await authenticatedPage.fill('input[name="catalogNumber"]', 'EO2024001');
      await authenticatedPage.fill('input[name="label"]', 'Independent Release');
      await authenticatedPage.selectOption('select[name="releaseType"]', 'album');
      
      // Upload album cover
      await authenticatedPage.setInputFiles('input[name="coverArt"]', {
        name: 'album-cover.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-album-cover-data')
      });
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Album created')).toBeVisible();
      
      // Add tracks to album
      await authenticatedPage.click('button:has-text("Add Tracks")');
      
      for (let i = 1; i <= 3; i++) {
        await authenticatedPage.click('button:has-text("Add Track")');
        await authenticatedPage.fill(`input[name="trackTitle${i}"]`, `Track ${i}: Electronic Journey`);
        await authenticatedPage.fill(`input[name="trackNumber${i}"]`, i.toString());
        await authenticatedPage.fill(`input[name="duration${i}"]`, `${3 + i}:${30 + i*10}`);
        
        await authenticatedPage.setInputFiles(`input[name="audioFile${i}"]`, {
          name: `track${i}.mp3`,
          mimeType: 'audio/mpeg',
          buffer: Buffer.from(`fake-track-${i}-data`)
        });
      }
      
      await authenticatedPage.click('button:has-text("Save Album")');
      await expect(authenticatedPage.locator('text=Album saved with tracks')).toBeVisible();
    });

    test('should upload lyrics for tracks', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/upload-lyrics');
      
      // Select track
      await authenticatedPage.selectOption('select[name="track_id"]', '1');
      
      // Upload lyrics with timestamps
      await authenticatedPage.fill('textarea[name="lyrics"]', `
        [Verse 1]
        In the digital realm we dance tonight
        Synthesizers painting colors bright
        Bass drops heavy like the morning rain
        Electronic pulses through my veins
        
        [Chorus]
        Digital dreams are calling out
        In the silence, hear them shout
        Neon lights and cyber beats
        This is where our future meets
        
        [Verse 2]
        Circuit boards and glowing screens
        Living in these digital dreams
        Algorithms guide our way
        Into the dawn of a new day
      `);
      
      // Set lyrics metadata
      await authenticatedPage.selectOption('select[name="language"]', 'en');
      await authenticatedPage.check('input[name="isExplicit"]');
      await authenticatedPage.fill('input[name="lyricist"]', 'Test Artist');
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Lyrics saved')).toBeVisible();
    });

    test('should manage music distribution', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/music-distribution');
      
      await expect(authenticatedPage.locator('.platform-list')).toBeVisible();
      
      // Select distribution platforms
      await authenticatedPage.check('input[name="platforms"][value="spotify"]');
      await authenticatedPage.check('input[name="platforms"][value="apple-music"]');
      await authenticatedPage.check('input[name="platforms"][value="amazon-music"]');
      await authenticatedPage.check('input[name="platforms"][value="youtube-music"]');
      await authenticatedPage.check('input[name="platforms"][value="soundcloud"]');
      
      // Select release for distribution
      await authenticatedPage.selectOption('select[name="release"]', '1');
      
      // Set distribution date
      await authenticatedPage.fill('input[name="distributionDate"]', '2024-12-31');
      
      // Select territories
      await authenticatedPage.check('input[name="territories"][value="worldwide"]');
      
      // Confirm rights and agreements
      await authenticatedPage.check('input[name="confirmRights"]');
      await authenticatedPage.check('input[name="agreementAccepted"]');
      
      await authenticatedPage.click('button:has-text("Submit for Distribution")');
      await expect(authenticatedPage.locator('text=Submitted for distribution')).toBeVisible();
    });
  });

  test.describe('Video Content Creation', () => {
    test('should upload video content', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/upload-video');
      
      await authenticatedPage.fill('input[name="title"]', 'Music Production Tutorial');
      await authenticatedPage.fill('textarea[name="description"]', 'Learn how to produce electronic music from scratch using modern DAWs and techniques');
      await authenticatedPage.selectOption('select[name="category"]', 'Education');
      await authenticatedPage.fill('input[name="tags"]', 'music production, tutorial, electronic, DAW, education');
      
      // Upload video file
      await authenticatedPage.setInputFiles('input[name="video_file"]', {
        name: 'music-tutorial.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake-video-data')
      });
      
      // Upload custom thumbnail
      await authenticatedPage.setInputFiles('input[name="thumbnail"]', {
        name: 'video-thumbnail.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-thumbnail-data')
      });
      
      // Set video settings
      await authenticatedPage.selectOption('select[name="visibility"]', 'public');
      await authenticatedPage.check('input[name="allowComments"]');
      await authenticatedPage.check('input[name="allowDownloads"]');
      await authenticatedPage.selectOption('select[name="license"]', 'creative-commons');
      
      // Schedule release
      await authenticatedPage.check('input[name="scheduleRelease"]');
      await authenticatedPage.fill('input[name="releaseDate"]', '2024-12-25');
      await authenticatedPage.fill('input[name="releaseTime"]', '12:00');
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Video uploaded')).toBeVisible();
    });

    test('should create video playlist', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/my-channel');
      
      await authenticatedPage.click('button:has-text("Create Playlist")');
      
      await authenticatedPage.fill('input[name="playlistName"]', 'Music Production Masterclass');
      await authenticatedPage.fill('textarea[name="playlistDescription"]', 'Complete series on electronic music production techniques');
      await authenticatedPage.selectOption('select[name="playlistVisibility"]', 'public');
      
      // Add videos to playlist
      await authenticatedPage.check('input[name="videos"][value="1"]');
      await authenticatedPage.check('input[name="videos"][value="2"]');
      
      await authenticatedPage.click('button:has-text("Create Playlist")');
      await expect(authenticatedPage.locator('text=Playlist created')).toBeVisible();
    });

    test('should manage video channel settings', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/video-dashboard');
      
      await authenticatedPage.click('button:has-text("Channel Settings")');
      
      // Update channel info
      await authenticatedPage.fill('input[name="channelName"]', 'Electronic Music Academy');
      await authenticatedPage.fill('textarea[name="channelDescription"]', 'Educational content for electronic music production and DJ techniques');
      
      // Upload channel banner
      await authenticatedPage.setInputFiles('input[name="channelBanner"]', {
        name: 'channel-banner.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-banner-data')
      });
      
      // Set channel settings
      await authenticatedPage.check('input[name="enableSubscriptions"]');
      await authenticatedPage.check('input[name="enableNotifications"]');
      await authenticatedPage.selectOption('select[name="defaultVideoVisibility"]', 'public');
      
      await authenticatedPage.click('button:has-text("Save Channel Settings")');
      await expect(authenticatedPage.locator('text=Channel settings saved')).toBeVisible();
    });
  });

  test.describe('Radio Station Creation', () => {
    test('should create radio station', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/create-radio');
      
      await authenticatedPage.fill('input[name="name"]', '24/7 Electronic Vibes');
      await authenticatedPage.fill('textarea[name="description"]', 'Non-stop electronic music featuring the best tracks from around the world');
      await authenticatedPage.selectOption('select[name="genre"]', 'electronic');
      await authenticatedPage.check('input[name="isPublic"]');
      
      // Station branding
      await authenticatedPage.setInputFiles('input[name="stationLogo"]', {
        name: 'station-logo.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-station-logo')
      });
      
      await authenticatedPage.fill('input[name="websiteUrl"]', 'https://electronicvibes.radio');
      await authenticatedPage.fill('input[name="contactEmail"]', 'info@electronicvibes.radio');
      
      // Broadcasting settings
      await authenticatedPage.selectOption('select[name="bitrate"]', '128kbps');
      await authenticatedPage.selectOption('select[name="format"]', 'mp3');
      await authenticatedPage.check('input[name="enableCrossfade"]');
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Radio station created')).toBeVisible();
    });

    test('should upload station mix and manage playlist', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      // Upload station mix
      await authenticatedPage.click('button:has-text("Upload Mix")');
      
      await authenticatedPage.setInputFiles('input[name="mixFile"]', {
        name: 'electronic-mix.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake-mix-data')
      });
      
      await authenticatedPage.fill('input[name="mixTitle"]', 'Friday Night Electronic Mix');
      await authenticatedPage.fill('textarea[name="mixDescription"]', 'High-energy electronic tracks perfect for weekend vibes');
      await authenticatedPage.fill('input[name="duration"]', '120');
      
      await authenticatedPage.click('button:has-text("Upload Mix")');
      await expect(authenticatedPage.locator('text=Mix uploaded')).toBeVisible();
      
      // Manage playlist
      await authenticatedPage.click('button:has-text("Manage Playlist")');
      
      // Add tracks to rotation
      await authenticatedPage.click('button:has-text("Add Track")');
      await authenticatedPage.fill('input[name="trackTitle"]', 'Cyber Dreams');
      await authenticatedPage.fill('input[name="artist"]', 'Digital Prophet');
      await authenticatedPage.fill('input[name="duration"]', '4:15');
      await authenticatedPage.selectOption('select[name="energy"]', 'high');
      
      await authenticatedPage.click('button:has-text("Add to Rotation")');
      await expect(authenticatedPage.locator('text=Track added to rotation')).toBeVisible();
    });

    test('should configure live streaming', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      // Set up live streaming
      await authenticatedPage.click('button:has-text("Live Stream Setup")');
      
      // Configure streaming settings
      await authenticatedPage.selectOption('select[name="streamQuality"]', 'high');
      await authenticatedPage.check('input[name="enableChat"]');
      await authenticatedPage.check('input[name="allowSongRequests"]');
      
      // Get stream key for OBS
      await expect(authenticatedPage.locator('.stream-key')).toBeVisible();
      await expect(authenticatedPage.locator('.stream-server')).toBeVisible();
      
      await authenticatedPage.click('.copy-stream-key');
      await expect(authenticatedPage.locator('text=Stream key copied')).toBeVisible();
      
      // Configure auto DJ
      await authenticatedPage.check('input[name="enableAutoDJ"]');
      await authenticatedPage.selectOption('select[name="autoDJMode"]', 'playlist');
      await authenticatedPage.check('input[name="crossfadeEnabled"]');
      await authenticatedPage.fill('input[name="crossfadeDuration"]', '3');
      
      await authenticatedPage.click('button:has-text("Save Stream Settings")');
      await expect(authenticatedPage.locator('text=Stream settings saved')).toBeVisible();
    });
  });

  test.describe('Content Drafts and Scheduling', () => {
    test('should save content as draft', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-create');
      
      // Start creating content but save as draft
      await authenticatedPage.fill('input[name="title"]', 'Work in Progress Podcast');
      await authenticatedPage.fill('textarea[name="description"]', 'This podcast is still being developed');
      await authenticatedPage.selectOption('select[name="category"]', 'Technology');
      
      await authenticatedPage.click('button:has-text("Save Draft")');
      await expect(authenticatedPage.locator('text=Draft saved')).toBeVisible();
      
      // Navigate to drafts section
      await authenticatedPage.click('text=My Drafts');
      await expect(authenticatedPage.locator('text=Work in Progress Podcast')).toBeVisible();
      await expect(authenticatedPage.locator('.draft-status')).toBeVisible();
    });

    test('should schedule content for publication', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-create');
      
      await authenticatedPage.fill('input[name="title"]', 'Scheduled Tech Talk');
      await authenticatedPage.fill('textarea[name="description"]', 'This will be published automatically');
      await authenticatedPage.selectOption('select[name="category"]', 'Technology');
      
      // Set publication schedule
      await authenticatedPage.check('input[name="schedulePublication"]');
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateString = futureDate.toISOString().split('T')[0];
      
      await authenticatedPage.fill('input[name="publishDate"]', dateString);
      await authenticatedPage.fill('input[name="publishTime"]', '10:00');
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Content scheduled')).toBeVisible();
    });

    test('should edit existing content', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      // Edit existing podcast
      await authenticatedPage.click('.podcast-item:first-child .edit-btn');
      
      // Update content
      await authenticatedPage.fill('input[name="title"]', 'Updated Podcast Title');
      await authenticatedPage.fill('textarea[name="description"]', 'Updated description with more details');
      await authenticatedPage.selectOption('select[name="category"]', 'Education');
      
      // Update settings
      await authenticatedPage.check('input[name="enableComments"]');
      await authenticatedPage.selectOption('select[name="updateFrequency"]', 'bi-weekly');
      
      await authenticatedPage.click('button:has-text("Update Podcast")');
      await expect(authenticatedPage.locator('text=Podcast updated')).toBeVisible();
    });
  });

  test.describe('Content Analytics and Performance', () => {
    test('should view content analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check analytics overview
      await expect(authenticatedPage.locator('.analytics-overview')).toBeVisible();
      await expect(authenticatedPage.locator('.content-performance')).toBeVisible();
      
      // View detailed analytics
      await authenticatedPage.click('button:has-text("View Detailed Analytics")');
      
      await expect(authenticatedPage.locator('.engagement-metrics')).toBeVisible();
      await expect(authenticatedPage.locator('.audience-demographics')).toBeVisible();
      await expect(authenticatedPage.locator('.revenue-analytics')).toBeVisible();
      
      // Filter analytics by time period
      await authenticatedPage.selectOption('select[name="timePeriod"]', 'last-30-days');
      await expect(authenticatedPage.locator('.analytics-chart')).toBeVisible();
      
      // Export analytics data
      await authenticatedPage.click('button:has-text("Export Data")');
      await expect(authenticatedPage.locator('text=Analytics exported')).toBeVisible();
    });

    test('should track content engagement', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      // View episode performance
      await authenticatedPage.click('.episode-item:first-child .analytics-btn');
      
      await expect(authenticatedPage.locator('.listen-metrics')).toBeVisible();
      await expect(authenticatedPage.locator('.completion-rate')).toBeVisible();
      await expect(authenticatedPage.locator('.engagement-score')).toBeVisible();
      
      // Check geographic data
      await authenticatedPage.click('tab:has-text("Geography")');
      await expect(authenticatedPage.locator('.geographic-breakdown')).toBeVisible();
      
      // Check device and platform data
      await authenticatedPage.click('tab:has-text("Devices")');
      await expect(authenticatedPage.locator('.device-analytics')).toBeVisible();
    });
  });

  test.describe('Content Collaboration', () => {
    test('should invite collaborators', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      await authenticatedPage.click('.podcast-item:first-child .collaborators-btn');
      
      // Invite collaborator
      await authenticatedPage.click('button:has-text("Invite Collaborator")');
      
      await authenticatedPage.fill('input[name="collaboratorEmail"]', 'collaborator@test.com');
      await authenticatedPage.selectOption('select[name="role"]', 'editor');
      await authenticatedPage.fill('textarea[name="inviteMessage"]', 'Would you like to collaborate on this podcast?');
      
      await authenticatedPage.click('button:has-text("Send Invitation")');
      await expect(authenticatedPage.locator('text=Invitation sent')).toBeVisible();
    });

    test('should manage collaboration permissions', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      await authenticatedPage.click('.podcast-item:first-child .collaborators-btn');
      
      // Update collaborator permissions
      await authenticatedPage.click('.collaborator-item:first-child .edit-permissions');
      
      await authenticatedPage.check('input[name="canEdit"]');
      await authenticatedPage.check('input[name="canPublish"]');
      await authenticatedPage.uncheck('input[name="canDelete"]');
      await authenticatedPage.check('input[name="canInviteOthers"]');
      
      await authenticatedPage.click('button:has-text("Update Permissions")');
      await expect(authenticatedPage.locator('text=Permissions updated')).toBeVisible();
    });
  });

  test.describe('Content Validation and Quality Control', () => {
    test('should validate audio file formats and quality', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-create');
      
      // Try uploading invalid audio format
      await authenticatedPage.fill('input[name="title"]', 'Audio Format Test');
      await authenticatedPage.fill('textarea[name="description"]', 'Testing audio validation');
      
      await authenticatedPage.setInputFiles('input[name="audioFile"]', {
        name: 'invalid-audio.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not-audio-data')
      });
      
      await expect(authenticatedPage.locator('.error-message')).toContainText('Invalid audio format');
      
      // Upload valid audio format
      await authenticatedPage.setInputFiles('input[name="audioFile"]', {
        name: 'valid-audio.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake-audio-data')
      });
      
      await expect(authenticatedPage.locator('.upload-success')).toBeVisible();
    });

    test('should enforce content guidelines', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-create');
      
      // Try content that might violate guidelines
      await authenticatedPage.fill('input[name="title"]', 'Spam Content Test');
      await authenticatedPage.fill('textarea[name="description"]', 'spam spam spam spam spam'.repeat(100));
      
      await authenticatedPage.click('button[type="submit"]');
      
      // Should show content review notice or guidelines warning
      if (await authenticatedPage.locator('.content-review-notice').isVisible()) {
        await expect(authenticatedPage.locator('.content-review-notice')).toBeVisible();
      }
    });

    test('should check for copyright compliance', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist/upload');
      
      await authenticatedPage.fill('input[name="title"]', 'Copyright Check Test');
      await authenticatedPage.fill('input[name="artist"]', 'Test Artist');
      
      // Upload audio file
      await authenticatedPage.setInputFiles('input[name="audio_file"]', {
        name: 'original-track.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake-original-music')
      });
      
      // Confirm copyright ownership
      await authenticatedPage.check('input[name="confirmCopyright"]');
      await authenticatedPage.check('input[name="originalWork"]');
      
      await authenticatedPage.click('button[type="submit"]');
      await expect(authenticatedPage.locator('text=Track uploaded')).toBeVisible();
    });
  });

  test.describe('Content Organization and Management', () => {
    test('should organize content into collections', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Create content collection
      await authenticatedPage.click('button:has-text("Create Collection")');
      
      await authenticatedPage.fill('input[name="collectionName"]', 'Educational Series');
      await authenticatedPage.fill('textarea[name="collectionDescription"]', 'Collection of educational content for music production');
      await authenticatedPage.selectOption('select[name="collectionType"]', 'series');
      
      // Add content to collection
      await authenticatedPage.check('input[name="content"][value="podcast-1"]');
      await authenticatedPage.check('input[name="content"][value="video-1"]');
      
      await authenticatedPage.click('button:has-text("Create Collection")');
      await expect(authenticatedPage.locator('text=Collection created')).toBeVisible();
    });

    test('should manage content tags and categories', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      await authenticatedPage.click('.podcast-item:first-child .edit-btn');
      
      // Update tags
      await authenticatedPage.fill('input[name="tags"]', 'technology, AI, machine learning, future, innovation');
      
      // Update category and subcategory
      await authenticatedPage.selectOption('select[name="category"]', 'Technology');
      await authenticatedPage.selectOption('select[name="subcategory"]', 'AI & Machine Learning');
      
      // Set content difficulty level
      await authenticatedPage.selectOption('select[name="difficultyLevel"]', 'intermediate');
      
      await authenticatedPage.click('button:has-text("Save Changes")');
      await expect(authenticatedPage.locator('text=Content updated')).toBeVisible();
    });

    test('should bulk manage content', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Select multiple content items
      await authenticatedPage.check('.content-item:nth-child(1) input[type="checkbox"]');
      await authenticatedPage.check('.content-item:nth-child(2) input[type="checkbox"]');
      await authenticatedPage.check('.content-item:nth-child(3) input[type="checkbox"]');
      
      // Bulk actions
      await authenticatedPage.selectOption('select[name="bulkAction"]', 'update-category');
      await authenticatedPage.selectOption('select[name="newCategory"]', 'Education');
      
      await authenticatedPage.click('button:has-text("Apply to Selected")');
      await expect(authenticatedPage.locator('text=Bulk update completed')).toBeVisible();
    });
  });
});