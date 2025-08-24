// tests/features/radio-streaming.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Radio Streaming & Broadcasting Features', () => {
  test('should configure stream settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Access streaming settings
    await authenticatedPage.click('button:has-text("Stream Settings")');
    
    // Configure stream quality
    await authenticatedPage.selectOption('select[name="bitrate"]', '128kbps');
    await authenticatedPage.selectOption('select[name="sampleRate"]', '44100');
    await authenticatedPage.selectOption('select[name="format"]', 'mp3');
    
    // Set stream buffer
    await authenticatedPage.fill('input[name="bufferSize"]', '5');
    
    await authenticatedPage.click('button:has-text("Save Stream Settings")');
    await expect(authenticatedPage.locator('text=Stream settings saved')).toBeVisible();
  });

  test('should handle live streaming with OBS', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Set up OBS streaming
    await authenticatedPage.click('button:has-text("Live Stream Setup")');
    
    // Display stream key and server
    await expect(authenticatedPage.locator('.stream-key')).toBeVisible();
    await expect(authenticatedPage.locator('.stream-server')).toBeVisible();
    
    // Copy stream key
    await authenticatedPage.click('.copy-stream-key');
    await expect(authenticatedPage.locator('text=Stream key copied')).toBeVisible();
    
    // Generate new stream key
    await authenticatedPage.click('button:has-text("Generate New Key")');
    await expect(authenticatedPage.locator('text=New stream key generated')).toBeVisible();
  });

  test('should manage automated playlists', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Create automated playlist
    await authenticatedPage.click('button:has-text("Auto Playlist")');
    
    await authenticatedPage.fill('input[name="playlistName"]', 'Evening Jazz Mix');
    await authenticatedPage.selectOption('select[name="genre"]', 'jazz');
    await authenticatedPage.selectOption('select[name="mood"]', 'relaxed');
    await authenticatedPage.selectOption('select[name="era"]', '1990s');
    
    // Set playlist schedule
    await authenticatedPage.fill('input[name="startTime"]', '18:00');
    await authenticatedPage.fill('input[name="endTime"]', '22:00');
    await authenticatedPage.check('input[name="repeatDaily"]');
    
    await authenticatedPage.click('button:has-text("Create Auto Playlist")');
    await expect(authenticatedPage.locator('text=Auto playlist created')).toBeVisible();
  });

  test('should handle crossfading and transitions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Configure crossfade settings
    await authenticatedPage.click('button:has-text("Audio Settings")');
    
    await authenticatedPage.check('input[name="enableCrossfade"]');
    await authenticatedPage.fill('input[name="crossfadeDuration"]', '3'); // 3 seconds
    await authenticatedPage.selectOption('select[name="fadeType"]', 'smooth');
    
    // Set jingle/transition settings
    await authenticatedPage.check('input[name="enableJingles"]');
    await authenticatedPage.selectOption('select[name="jingleFrequency"]', 'every-5-songs');
    
    await authenticatedPage.click('button:has-text("Save Audio Settings")');
    await expect(authenticatedPage.locator('text=Audio settings saved')).toBeVisible();
  });

  test('should manage DJ mode and live mixing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Enter DJ mode
    await authenticatedPage.click('button:has-text("DJ Mode")');
    
    await expect(authenticatedPage.locator('.dj-console')).toBeVisible();
    await expect(authenticatedPage.locator('.deck-a')).toBeVisible();
    await expect(authenticatedPage.locator('.deck-b')).toBeVisible();
    await expect(authenticatedPage.locator('.crossfader')).toBeVisible();
    
    // Load track to deck A
    await authenticatedPage.click('.deck-a .load-track');
    await authenticatedPage.selectOption('select[name="trackSelect"]', 'jazz-track-1');
    
    // Load track to deck B
    await authenticatedPage.click('.deck-b .load-track');
    await authenticatedPage.selectOption('select[name="trackSelect"]', 'jazz-track-2');
    
    // Start mixing
    await authenticatedPage.click('.deck-a .play-btn');
    await expect(authenticatedPage.locator('.deck-a .playing')).toBeVisible();
  });

  test('should handle listener interactions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Enable listener chat
    await authenticatedPage.click('button:has-text("Chat Settings")');
    await authenticatedPage.check('input[name="enableChat"]');
    await authenticatedPage.check('input[name="allowSongRequests"]');
    await authenticatedPage.check('input[name="moderateChat"]');
    
    await authenticatedPage.click('button:has-text("Save Chat Settings")');
    
    // View live chat
    await expect(authenticatedPage.locator('.live-chat')).toBeVisible();
    await expect(authenticatedPage.locator('.song-requests')).toBeVisible();
    
    // Respond to song request
    if (await authenticatedPage.locator('.song-request:first-child .approve-btn').isVisible()) {
      await authenticatedPage.click('.song-request:first-child .approve-btn');
      await expect(authenticatedPage.locator('text=Request approved')).toBeVisible();
    }
  });

  test('should monitor stream health and analytics', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Check stream health
    await expect(authenticatedPage.locator('.stream-status')).toBeVisible();
    await expect(authenticatedPage.locator('.connection-quality')).toBeVisible();
    await expect(authenticatedPage.locator('.cpu-usage')).toBeVisible();
    
    // View listener analytics
    await authenticatedPage.click('button:has-text("Analytics")');
    
    await expect(authenticatedPage.locator('.listener-chart')).toBeVisible();
    await expect(authenticatedPage.locator('.geographic-stats')).toBeVisible();
    await expect(authenticatedPage.locator('.listening-duration')).toBeVisible();
    
    // Check real-time metrics
    await expect(authenticatedPage.locator('.current-listeners')).toBeVisible();
    await expect(authenticatedPage.locator('.peak-listeners')).toBeVisible();
  });

  test('should handle emergency broadcasting', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Set up emergency alert
    await authenticatedPage.click('button:has-text("Emergency Alert")');
    
    await authenticatedPage.fill('textarea[name="alertMessage"]', 'This is a test emergency alert');
    await authenticatedPage.selectOption('select[name="alertType"]', 'weather');
    await authenticatedPage.check('input[name="interruptStream"]');
    
    await authenticatedPage.click('button:has-text("Broadcast Alert")');
    await expect(authenticatedPage.locator('text=Emergency alert broadcasting')).toBeVisible();
  });

  test('should manage station scheduling', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Access program scheduler
    await authenticatedPage.click('button:has-text("Program Schedule")');
    
    // Create morning show
    await authenticatedPage.click('button:has-text("Add Program")');
    await authenticatedPage.fill('input[name="programName"]', 'Morning Jazz Cafe');
    await authenticatedPage.fill('input[name="startTime"]', '06:00');
    await authenticatedPage.fill('input[name="duration"]', '180'); // 3 hours
    await authenticatedPage.selectOption('select[name="programType"]', 'live-show');
    await authenticatedPage.check('input[name="mondayToFriday"]');
    
    await authenticatedPage.click('button:has-text("Schedule Program")');
    await expect(authenticatedPage.locator('text=Program scheduled')).toBeVisible();
    
    // Create evening automation
    await authenticatedPage.click('button:has-text("Add Program")');
    await authenticatedPage.fill('input[name="programName"]', 'Evening Smooth Jazz');
    await authenticatedPage.fill('input[name="startTime"]', '19:00');
    await authenticatedPage.fill('input[name="duration"]', '240'); // 4 hours
    await authenticatedPage.selectOption('select[name="programType"]', 'automated');
    await authenticatedPage.check('input[name="daily"]');
    
    await authenticatedPage.click('button:has-text("Schedule Program")');
    await expect(authenticatedPage.locator('text=Program scheduled')).toBeVisible();
  });

  test('should handle audio processing and effects', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Configure audio processing
    await authenticatedPage.click('button:has-text("Audio Processing")');
    
    // Enable compressor
    await authenticatedPage.check('input[name="enableCompressor"]');
    await authenticatedPage.fill('input[name="compressorRatio"]', '3:1');
    await authenticatedPage.fill('input[name="compressorThreshold"]', '-12');
    
    // Enable EQ
    await authenticatedPage.check('input[name="enableEQ"]');
    await authenticatedPage.fill('input[name="lowGain"]', '2');
    await authenticatedPage.fill('input[name="midGain"]', '0');
    await authenticatedPage.fill('input[name="highGain"]', '1');
    
    // Enable limiter
    await authenticatedPage.check('input[name="enableLimiter"]');
    await authenticatedPage.fill('input[name="limiterCeiling"]', '-0.1');
    
    await authenticatedPage.click('button:has-text("Apply Processing")');
    await expect(authenticatedPage.locator('text=Audio processing applied')).toBeVisible();
  });

  test('should manage station metadata and RDS', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Configure station metadata
    await authenticatedPage.click('button:has-text("Station Info")');
    
    await authenticatedPage.fill('input[name="stationCallsign"]', 'WJZZ');
    await authenticatedPage.fill('input[name="stationSlogan"]', 'Your Smooth Jazz Experience');
    await authenticatedPage.fill('input[name="webcastTitle"]', 'WJZZ - Smooth Jazz 24/7');
    
    // Configure RDS (Radio Data System)
    await authenticatedPage.check('input[name="enableRDS"]');
    await authenticatedPage.fill('input[name="rdsPI"]', '1234');
    await authenticatedPage.fill('input[name="rdsPTY"]', '15'); // Jazz music
    
    await authenticatedPage.click('button:has-text("Update Station Info")');
    await expect(authenticatedPage.locator('text=Station info updated')).toBeVisible();
  });

  test('should handle stream recording and archiving', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Configure stream recording
    await authenticatedPage.click('button:has-text("Recording Settings")');
    
    await authenticatedPage.check('input[name="enableRecording"]');
    await authenticatedPage.selectOption('select[name="recordingQuality"]', 'high');
    await authenticatedPage.selectOption('select[name="archiveDuration"]', '30-days');
    
    // Set automatic recording schedule
    await authenticatedPage.check('input[name="recordLiveShows"]');
    await authenticatedPage.check('input[name="recordSpecialEvents"]');
    
    await authenticatedPage.click('button:has-text("Save Recording Settings")');
    await expect(authenticatedPage.locator('text=Recording settings saved')).toBeVisible();
    
    // Start manual recording
    await authenticatedPage.click('button:has-text("Start Recording")');
    await expect(authenticatedPage.locator('.recording-indicator')).toBeVisible();
    
    // Stop recording
    await authenticatedPage.click('button:has-text("Stop Recording")');
    await expect(authenticatedPage.locator('text=Recording saved')).toBeVisible();
  });

  test('should manage multi-bitrate streaming', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/radio-dashboard');
    
    // Configure multiple stream qualities
    await authenticatedPage.click('button:has-text("Stream Quality")');
    
    // Enable multiple bitrates
    await authenticatedPage.check('input[name="enable64kbps"]');
    await authenticatedPage.check('input[name="enable128kbps"]');
    await authenticatedPage.check('input[name="enable320kbps"]');
    
    // Set adaptive streaming
    await authenticatedPage.check('input[name="enableAdaptive"]');
    
    await authenticatedPage.click('button:has-text("Apply Stream Settings")');
    await expect(authenticatedPage.locator('text=Stream settings applied')).toBeVisible();
    
    // Check stream URLs
    await expect(authenticatedPage.locator('.stream-url-64')).toBeVisible();
    await expect(authenticatedPage.locator('.stream-url-128')).toBeVisible();
    await expect(authenticatedPage.locator('.stream-url-320')).toBeVisible();
  });
});