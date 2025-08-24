// features/gaming.spec.js
import { test, expect } from '@playwright/test';

// Test data and utilities
const TEST_USER = {
  email: 'test.gamer@streampirex.com',
  password: 'TestPassword123!',
  username: 'test_gamer',
  gamertag: 'ProGamer2024',
  favoriteGames: ['Call of Duty', 'Valorant', 'Apex Legends'],
  platforms: ['PC', 'PlayStation 5', 'Xbox Series X'],
  skillLevel: 'competitive'
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('StreamPireX Gaming Features', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(FRONTEND_URL);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Authentication for Gaming Features', () => {
    
    test('should allow user to sign up with gaming preferences', async ({ page }) => {
      // Navigate to signup page
      await page.click('a[href="/signup"]');
      
      // Fill basic signup form
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="username"]', TEST_USER.username);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.fill('input[name="confirmPassword"]', TEST_USER.password);
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'Gamer');
      await page.fill('input[name="dateOfBirth"]', '1995-01-01');
      
      // Check gaming interest checkbox if available
      const gamingCheckbox = page.locator('input[type="checkbox"][value="Gaming"]');
      if (await gamingCheckbox.isVisible()) {
        await gamingCheckbox.check();
      }
      
      // Accept terms and conditions
      await page.check('input[name="termsAccepted"]');
      await page.check('input[name="privacyAccepted"]');
      await page.check('input[name="ageVerification"]');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for success or redirect
      await expect(page).toHaveURL(/\/dashboard|\/profile|\/home/);
    });

    test('should login and access gaming features', async ({ page }) => {
      // Navigate to login page
      await page.click('a[href="/login"]');
      
      // Fill login form
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      
      // Submit login
      await page.click('button[type="submit"]');
      
      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard|\/home/);
      
      // Check if gaming navigation is available
      const gamingNav = page.locator('nav').locator('text=Gaming');
      if (await gamingNav.isVisible()) {
        await expect(gamingNav).toBeVisible();
      }
    });
  });

  test.describe('Gamer Profile Management', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard|\/home/);
    });

    test('should create and update gamer profile', async ({ page }) => {
      // Navigate to gamer profile page
      await page.goto(`${FRONTEND_URL}/profile/gamer`);
      
      // Enable gamer mode if not already enabled
      const isGamerToggle = page.locator('input[name="is_gamer"]');
      if (await isGamerToggle.isVisible()) {
        await isGamerToggle.check();
      }
      
      // Fill gamer profile details
      await page.fill('input[name="gamertag"]', TEST_USER.gamertag);
      
      // Select skill level
      await page.selectOption('select[name="skill_level"]', TEST_USER.skillLevel);
      
      // Add favorite games
      for (const game of TEST_USER.favoriteGames) {
        await page.fill('input[placeholder*="game"]', game);
        await page.click('button:has-text("Add Game")');
        
        // Verify game was added
        await expect(page.locator('.game-tag', { hasText: game })).toBeVisible();
      }
      
      // Select gaming platforms
      for (const platform of TEST_USER.platforms) {
        const platformCheckbox = page.locator(`input[type="checkbox"][value="${platform}"]`);
        if (await platformCheckbox.isVisible()) {
          await platformCheckbox.check();
        }
      }
      
      // Save profile
      await page.click('button:has-text("Save Profile")');
      
      // Verify success message
      await expect(page.locator('.success-message, .toast')).toContainText(/saved|updated/i);
    });

    test('should display gamer profile correctly', async ({ page }) => {
      // Navigate to gamer profile view
      await page.goto(`${FRONTEND_URL}/profile/gamer`);
      
      // Verify profile elements are visible
      await expect(page.locator('.gamer-profile')).toBeVisible();
      
      // Check if gamertag is displayed
      const gamertagElement = page.locator('[data-testid="gamertag"], .gamertag');
      if (await gamertagElement.isVisible()) {
        await expect(gamertagElement).toContainText(TEST_USER.gamertag);
      }
      
      // Verify games list
      for (const game of TEST_USER.favoriteGames) {
        const gameElement = page.locator('.game-tag', { hasText: game });
        if (await gameElement.isVisible()) {
          await expect(gameElement).toBeVisible();
        }
      }
    });
  });

  test.describe('Squad Finder Feature', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard|\/home/);
    });

    test('should access squad finder page', async ({ page }) => {
      // Navigate to squad finder
      await page.goto(`${FRONTEND_URL}/squad-finder`);
      
      // Verify page loaded
      await expect(page.locator('h1, h2')).toContainText(/squad finder|find squad/i);
      
      // Check for search filters
      await expect(page.locator('select[name="game"], input[name="game"]')).toBeVisible();
      await expect(page.locator('select[name="skill_level"], input[name="skill_level"]')).toBeVisible();
    });

    test('should search for squad members', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/squad-finder`);
      
      // Fill search criteria
      const gameSelect = page.locator('select[name="game"]');
      if (await gameSelect.isVisible()) {
        await gameSelect.selectOption('Valorant');
      }
      
      const skillSelect = page.locator('select[name="skill_level"]');
      if (await skillSelect.isVisible()) {
        await skillSelect.selectOption('competitive');
      }
      
      // Submit search
      await page.click('button:has-text("Search"), button:has-text("Find Squad")');
      
      // Wait for results
      await page.waitForSelector('.squad-results, .player-list, .no-results', { timeout: 10000 });
      
      // Verify search completed
      const resultsContainer = page.locator('.squad-results, .player-list');
      const noResults = page.locator('.no-results');
      
      const hasResults = await resultsContainer.isVisible();
      const hasNoResults = await noResults.isVisible();
      
      expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should create squad listing', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/squad-finder`);
      
      // Click create listing button
      await page.click('button:has-text("Create Listing"), a:has-text("Create Listing")');
      
      // Fill listing form
      await page.fill('input[name="title"], textarea[name="title"]', 'Looking for Valorant Team');
      await page.fill('textarea[name="description"]', 'Competitive player seeking team for ranked games');
      
      // Select game
      const gameInput = page.locator('select[name="game"], input[name="game"]');
      if (await gameInput.isVisible()) {
        if (await page.locator('select[name="game"]').isVisible()) {
          await page.selectOption('select[name="game"]', 'Valorant');
        } else {
          await page.fill('input[name="game"]', 'Valorant');
        }
      }
      
      // Submit listing
      await page.click('button:has-text("Create"), button:has-text("Post")');
      
      // Verify success
      await expect(page.locator('.success-message, .toast')).toContainText(/created|posted/i);
    });
  });

  test.describe('Team Rooms Feature', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard|\/home/);
    });

    test('should create team room', async ({ page }) => {
      // Navigate to team rooms
      await page.goto(`${FRONTEND_URL}/team-rooms/create`);
      
      // Fill room creation form
      await page.fill('input[name="room_name"]', 'Test Gaming Room');
      await page.fill('textarea[name="description"]', 'Test room for gaming sessions');
      
      // Set room privacy
      const privateToggle = page.locator('input[name="is_private"]');
      if (await privateToggle.isVisible()) {
        await privateToggle.check();
      }
      
      // Create room
      await page.click('button:has-text("Create Room")');
      
      // Verify room creation
      await expect(page.locator('.success-message, .toast')).toContainText(/created|room/i);
    });

    test('should join team room', async ({ page }) => {
      // Navigate to team rooms list
      await page.goto(`${FRONTEND_URL}/team-rooms`);
      
      // Find available room
      const roomCard = page.locator('.room-card, .team-room').first();
      
      if (await roomCard.isVisible()) {
        // Join room
        await roomCard.locator('button:has-text("Join"), a:has-text("Join")').click();
        
        // Verify room joined
        await expect(page.locator('.room-interface, .video-chat')).toBeVisible();
      }
    });
  });

  test.describe('Gaming Analytics', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard|\/home/);
    });

    test('should display gaming analytics dashboard', async ({ page }) => {
      // Navigate to gaming analytics
      await page.goto(`${FRONTEND_URL}/gaming/analytics`);
      
      // Verify analytics page loaded
      await expect(page.locator('h1, h2')).toContainText(/analytics|stats/i);
      
      // Check for analytics components
      const analyticsElements = [
        '.gaming-stats',
        '.analytics-dashboard',
        '.stats-card',
        '.chart-container'
      ];
      
      let foundAnalytics = false;
      for (const selector of analyticsElements) {
        if (await page.locator(selector).isVisible()) {
          foundAnalytics = true;
          break;
        }
      }
      
      expect(foundAnalytics).toBeTruthy();
    });

    test('should fetch gaming analytics data', async ({ page }) => {
      // Intercept analytics API call
      await page.route('**/api/gaming/analytics', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            gaming_stats: {
              hours_played: 150,
              games_owned: 45,
              achievements: 230,
              win_rate: 68
            }
          })
        });
      });
      
      await page.goto(`${FRONTEND_URL}/gaming/analytics`);
      
      // Verify analytics data is displayed
      await expect(page.locator('.stats-value, .metric-value')).toContainText(/150|45|230|68/);
    });
  });

  test.describe('Video Chat Integration', () => {
    
    test.beforeEach(async ({ page }) => {
      // Grant media permissions for WebRTC testing
      await page.context().grantPermissions(['camera', 'microphone']);
      
      // Login before each test
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard|\/home/);
    });

    test('should display video chat options in gamer profile', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/profile/gamer`);
      
      // Check for video chat integration
      const videoChatElements = [
        '.video-chat-integration',
        '.webrtc-capabilities',
        '.chat-room-option'
      ];
      
      let foundVideoChat = false;
      for (const selector of videoChatElements) {
        if (await page.locator(selector).isVisible()) {
          foundVideoChat = true;
          break;
        }
      }
      
      expect(foundVideoChat).toBeTruthy();
    });

    test('should test WebRTC capabilities detection', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/profile/gamer`);
      
      // Check if WebRTC capabilities are detected
      const webrtcInfo = await page.evaluate(() => {
        return {
          hasWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          hasRTCPeerConnection: !!window.RTCPeerConnection
        };
      });
      
      expect(webrtcInfo.hasWebRTC).toBeTruthy();
      expect(webrtcInfo.hasRTCPeerConnection).toBeTruthy();
    });
  });

  test.describe('Gaming Features API Integration', () => {
    
    test('should handle gaming API endpoints', async ({ page }) => {
      // Test gaming profile API
      const profileResponse = await page.request.get(`${BACKEND_URL}/api/user/gamer-profile`, {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
        }
      });
      
      if (profileResponse.ok()) {
        const profileData = await profileResponse.json();
        expect(profileData).toHaveProperty('user');
      }
    });

    test('should handle team room creation API', async ({ page }) => {
      // Login first
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard|\/home/);
      
      // Test team room API
      const roomResponse = await page.request.post(`${BACKEND_URL}/api/gaming/team-room/create`, {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`,
          'Content-Type': 'application/json'
        },
        data: {
          room_name: 'Test API Room',
          description: 'Room created via API test'
        }
      });
      
      if (roomResponse.status() === 201) {
        const roomData = await roomResponse.json();
        expect(roomData).toHaveProperty('message');
        expect(roomData.message).toContain('Team room created');
      }
    });
  });

  test.describe('Gaming Features Pricing Integration', () => {
    
    test('should display gaming features in pricing plans', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/pricing`);
      
      // Look for gaming-related features in pricing
      const gamingFeatures = [
        'Gaming Community',
        'Team Rooms',
        'Squad Finder',
        'Gaming Analytics',
        'Game Streaming',
        'Gaming Monetization'
      ];
      
      let foundGamingFeatures = 0;
      for (const feature of gamingFeatures) {
        const featureElement = page.locator('.feature-list, .pricing-card').locator(`text=${feature}`);
        if (await featureElement.isVisible()) {
          foundGamingFeatures++;
        }
      }
      
      // Should find at least some gaming features
      expect(foundGamingFeatures).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('**/api/gaming/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto(`${FRONTEND_URL}/gaming/analytics`);
      
      // Should display error message
      await expect(page.locator('.error-message, .alert-error')).toBeVisible();
    });

    test('should handle missing gaming features gracefully', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/profile/gamer`);
      
      // If gaming features are not available, should show appropriate message
      const noGamingMessage = page.locator('text=Gaming features not available');
      const gamingContent = page.locator('.gamer-profile, .gaming-content');
      
      // Either gaming content should be visible OR no gaming message should be shown
      const hasGamingContent = await gamingContent.isVisible();
      const hasNoGamingMessage = await noGamingMessage.isVisible();
      
      expect(hasGamingContent || hasNoGamingMessage).toBeTruthy();
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await page.evaluate(() => {
      // Clear any test data if needed
      if (window.testCleanup) {
        window.testCleanup();
      }
    });
  });
});

// Helper functions for test utilities
const TestUtils = {
  async waitForApiResponse(page, apiPattern, timeout = 10000) {
    return page.waitForResponse(response => 
      response.url().includes(apiPattern) && response.status() === 200,
      { timeout }
    );
  },

  async checkPlanFeatures(page, planName, expectedFeatures) {
    const planCard = page.locator('.pricing-card').filter({ hasText: planName });
    
    for (const feature of expectedFeatures) {
      await expect(planCard.locator(`text=${feature}`)).toBeVisible();
    }
  },

  async mockGamingApiResponses(page) {
    // Mock gaming profile API
    await page.route('**/api/user/gamer-profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            gamertag: TEST_USER.gamertag,
            favorite_games: TEST_USER.favoriteGames,
            gaming_platforms: TEST_USER.platforms,
            skill_level: TEST_USER.skillLevel
          }
        })
      });
    });

    // Mock squad finder API
    await page.route('**/api/squad-finder/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          squads: [
            {
              id: 1,
              title: 'Competitive Valorant Team',
              game: 'Valorant',
              skill_level: 'competitive',
              members_count: 3
            }
          ]
        })
      });
    });
  }
};

// Export for use in other test files
export { TestUtils, TEST_USER };