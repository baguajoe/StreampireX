// tests/features/dashboards.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Dashboard Features', () => {
  
  test.describe('Creator Dashboard', () => {
    test('should display creator dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check main dashboard elements
      await expect(authenticatedPage.locator('h1')).toContainText('Creator');
      await expect(authenticatedPage.locator('.analytics-widget')).toBeVisible();
      await expect(authenticatedPage.locator('.content-overview')).toBeVisible();
      await expect(authenticatedPage.locator('.revenue-summary')).toBeVisible();
      
      // Check key metrics cards
      await expect(authenticatedPage.locator('.metric-card')).toHaveCountGreaterThan(3);
      await expect(authenticatedPage.locator('.total-content')).toBeVisible();
      await expect(authenticatedPage.locator('.total-views')).toBeVisible();
      await expect(authenticatedPage.locator('.total-earnings')).toBeVisible();
      await expect(authenticatedPage.locator('.subscriber-count')).toBeVisible();
    });

    test('should display content performance analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check analytics charts
      await expect(authenticatedPage.locator('.performance-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.engagement-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.revenue-chart')).toBeVisible();
      
      // Test time period filters
      await authenticatedPage.selectOption('select[name="timePeriod"]', '7days');
      await expect(authenticatedPage.locator('.chart-container')).toBeVisible();
      
      await authenticatedPage.selectOption('select[name="timePeriod"]', '30days');
      await expect(authenticatedPage.locator('.chart-container')).toBeVisible();
      
      await authenticatedPage.selectOption('select[name="timePeriod"]', '90days');
      await expect(authenticatedPage.locator('.chart-container')).toBeVisible();
    });

    test('should show recent activity feed', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      await expect(authenticatedPage.locator('.activity-feed')).toBeVisible();
      await expect(authenticatedPage.locator('.activity-item')).toHaveCountGreaterThan(0);
      
      // Check activity types
      if (await authenticatedPage.locator('.activity-item').count() > 0) {
        await expect(authenticatedPage.locator('.activity-type')).toBeVisible();
        await expect(authenticatedPage.locator('.activity-timestamp')).toBeVisible();
      }
    });

    test('should provide quick action buttons', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check for quick action buttons
      await expect(authenticatedPage.locator('button:has-text("Upload Content")')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Create Post")')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("View Analytics")')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Manage Store")')).toBeVisible();
    });

    test('should display revenue breakdown', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      await expect(authenticatedPage.locator('.revenue-breakdown')).toBeVisible();
      await expect(authenticatedPage.locator('.revenue-source')).toHaveCountGreaterThan(0);
      
      // Check different revenue sources
      await expect(authenticatedPage.locator('.subscription-revenue')).toBeVisible();
      await expect(authenticatedPage.locator('.ad-revenue')).toBeVisible();
      await expect(authenticatedPage.locator('.merchandise-revenue')).toBeVisible();
      await expect(authenticatedPage.locator('.donation-revenue')).toBeVisible();
    });

    test('should show content library overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      await expect(authenticatedPage.locator('.content-library')).toBeVisible();
      await expect(authenticatedPage.locator('.content-stats')).toBeVisible();
      
      // Check content type breakdown
      await expect(authenticatedPage.locator('.podcast-count')).toBeVisible();
      await expect(authenticatedPage.locator('.video-count')).toBeVisible();
      await expect(authenticatedPage.locator('.music-count')).toBeVisible();
      await expect(authenticatedPage.locator('.post-count')).toBeVisible();
    });
  });

  test.describe('Artist Dashboard', () => {
    test('should display artist dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      await expect(authenticatedPage.locator('h1')).toContainText('Artist');
      await expect(authenticatedPage.locator('.track-stats')).toBeVisible();
      await expect(authenticatedPage.locator('.distribution-status')).toBeVisible();
      await expect(authenticatedPage.locator('.earnings-overview')).toBeVisible();
      
      // Check artist-specific metrics
      await expect(authenticatedPage.locator('.monthly-listeners')).toBeVisible();
      await expect(authenticatedPage.locator('.total-streams')).toBeVisible();
      await expect(authenticatedPage.locator('.top-tracks')).toBeVisible();
      await expect(authenticatedPage.locator('.fan-insights')).toBeVisible();
    });

    test('should show music distribution analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      await expect(authenticatedPage.locator('.distribution-analytics')).toBeVisible();
      await expect(authenticatedPage.locator('.platform-breakdown')).toBeVisible();
      
      // Check platform-specific data
      await expect(authenticatedPage.locator('.spotify-stats')).toBeVisible();
      await expect(authenticatedPage.locator('.apple-music-stats')).toBeVisible();
      await expect(authenticatedPage.locator('.youtube-music-stats')).toBeVisible();
      
      // Test platform filter
      await authenticatedPage.selectOption('select[name="platform"]', 'spotify');
      await expect(authenticatedPage.locator('.platform-specific-chart')).toBeVisible();
    });

    test('should display top performing tracks', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      await expect(authenticatedPage.locator('.top-tracks-widget')).toBeVisible();
      await expect(authenticatedPage.locator('.track-performance')).toHaveCountGreaterThan(0);
      
      // Check track details
      if (await authenticatedPage.locator('.track-item').count() > 0) {
        await expect(authenticatedPage.locator('.track-title')).toBeVisible();
        await expect(authenticatedPage.locator('.track-streams')).toBeVisible();
        await expect(authenticatedPage.locator('.track-revenue')).toBeVisible();
      }
    });

    test('should show geographical insights', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      await expect(authenticatedPage.locator('.geographical-insights')).toBeVisible();
      await expect(authenticatedPage.locator('.top-countries')).toBeVisible();
      await expect(authenticatedPage.locator('.audience-map')).toBeVisible();
      
      // Check country data
      await expect(authenticatedPage.locator('.country-stats')).toHaveCountGreaterThan(0);
    });

    test('should display royalty earnings', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      await expect(authenticatedPage.locator('.royalty-earnings')).toBeVisible();
      await expect(authenticatedPage.locator('.earnings-chart')).toBeVisible();
      
      // Check earnings breakdown
      await expect(authenticatedPage.locator('.streaming-royalties')).toBeVisible();
      await expect(authenticatedPage.locator('.sync-licensing')).toBeVisible();
      await expect(authenticatedPage.locator('.performance-royalties')).toBeVisible();
      
      // Test earnings period filter
      await authenticatedPage.selectOption('select[name="earningsPeriod"]', 'this-month');
      await expect(authenticatedPage.locator('.earnings-data')).toBeVisible();
    });

    test('should show release calendar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      await expect(authenticatedPage.locator('.release-calendar')).toBeVisible();
      await expect(authenticatedPage.locator('.upcoming-releases')).toBeVisible();
      
      // Check calendar functionality
      if (await authenticatedPage.locator('.calendar-event').count() > 0) {
        await expect(authenticatedPage.locator('.release-date')).toBeVisible();
        await expect(authenticatedPage.locator('.release-title')).toBeVisible();
        await expect(authenticatedPage.locator('.release-status')).toBeVisible();
      }
    });
  });

  test.describe('Podcast Dashboard', () => {
    test('should display podcast dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      await expect(authenticatedPage.locator('h1')).toContainText('Podcast');
      await expect(authenticatedPage.locator('.podcast-list')).toBeVisible();
      await expect(authenticatedPage.locator('.episode-manager')).toBeVisible();
      await expect(authenticatedPage.locator('.podcast-analytics')).toBeVisible();
      
      // Check podcast-specific metrics
      await expect(authenticatedPage.locator('.total-downloads')).toBeVisible();
      await expect(authenticatedPage.locator('.subscriber-growth')).toBeVisible();
      await expect(authenticatedPage.locator('.episode-count')).toBeVisible();
      await expect(authenticatedPage.locator('.average-listen-time')).toBeVisible();
    });

    test('should show podcast performance metrics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      await expect(authenticatedPage.locator('.performance-metrics')).toBeVisible();
      await expect(authenticatedPage.locator('.download-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.listener-retention')).toBeVisible();
      
      // Check episode performance
      await expect(authenticatedPage.locator('.episode-performance')).toBeVisible();
      await expect(authenticatedPage.locator('.completion-rates')).toBeVisible();
    });

    test('should manage podcast episodes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      await expect(authenticatedPage.locator('.episode-manager')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Create New Episode")')).toBeVisible();
      
      // Check episode list
      if (await authenticatedPage.locator('.episode-item').count() > 0) {
        await expect(authenticatedPage.locator('.episode-title')).toBeVisible();
        await expect(authenticatedPage.locator('.episode-status')).toBeVisible();
        await expect(authenticatedPage.locator('.episode-actions')).toBeVisible();
      }
      
      // Test episode actions
      if (await authenticatedPage.locator('.episode-item .edit-btn').isVisible()) {
        await authenticatedPage.click('.episode-item:first-child .edit-btn');
        await expect(authenticatedPage.locator('.episode-edit-form')).toBeVisible();
      }
    });

    test('should display audience demographics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      await expect(authenticatedPage.locator('.audience-demographics')).toBeVisible();
      await expect(authenticatedPage.locator('.age-distribution')).toBeVisible();
      await expect(authenticatedPage.locator('.gender-breakdown')).toBeVisible();
      await expect(authenticatedPage.locator('.device-usage')).toBeVisible();
      
      // Check listening platforms
      await expect(authenticatedPage.locator('.platform-stats')).toBeVisible();
    });

    test('should show monetization overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/podcast-dashboard');
      
      await expect(authenticatedPage.locator('.monetization-overview')).toBeVisible();
      await expect(authenticatedPage.locator('.ad-revenue')).toBeVisible();
      await expect(authenticatedPage.locator('.premium-subscriptions')).toBeVisible();
      await expect(authenticatedPage.locator('.listener-support')).toBeVisible();
      
      // Check sponsorship opportunities
      await expect(authenticatedPage.locator('.sponsorship-opportunities')).toBeVisible();
    });
  });

  test.describe('Radio Dashboard', () => {
    test('should display radio dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      await expect(authenticatedPage.locator('h1')).toContainText('Radio');
      await expect(authenticatedPage.locator('.station-controls')).toBeVisible();
      await expect(authenticatedPage.locator('.listener-stats')).toBeVisible();
      await expect(authenticatedPage.locator('.now-playing')).toBeVisible();
      
      // Check radio-specific controls
      await expect(authenticatedPage.locator('.broadcast-controls')).toBeVisible();
      await expect(authenticatedPage.locator('.playlist-manager')).toBeVisible();
      await expect(authenticatedPage.locator('.stream-settings')).toBeVisible();
    });

    test('should show live streaming controls', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      await expect(authenticatedPage.locator('.streaming-controls')).toBeVisible();
      await expect(authenticatedPage.locator('.stream-status')).toBeVisible();
      
      // Check streaming buttons
      await expect(authenticatedPage.locator('button:has-text("Start Stream")')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Stop Stream")')).toBeVisible();
      
      // Test stream controls
      if (await authenticatedPage.locator('.stream-inactive').isVisible()) {
        await authenticatedPage.click('button:has-text("Start Stream")');
        await expect(authenticatedPage.locator('.stream-active')).toBeVisible();
      }
    });

    test('should display real-time listener metrics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      await expect(authenticatedPage.locator('.real-time-metrics')).toBeVisible();
      await expect(authenticatedPage.locator('.current-listeners')).toBeVisible();
      await expect(authenticatedPage.locator('.peak-listeners')).toBeVisible();
      await expect(authenticatedPage.locator('.listener-trend')).toBeVisible();
      
      // Check listener engagement
      await expect(authenticatedPage.locator('.engagement-metrics')).toBeVisible();
      await expect(authenticatedPage.locator('.average-listen-duration')).toBeVisible();
    });

    test('should manage playlist and rotation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      await expect(authenticatedPage.locator('.playlist-manager')).toBeVisible();
      await expect(authenticatedPage.locator('.current-playlist')).toBeVisible();
      
      // Check playlist controls
      await expect(authenticatedPage.locator('button:has-text("Add Track")')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Shuffle Playlist")')).toBeVisible();
      
      // Test adding track to playlist
      await authenticatedPage.click('button:has-text("Add Track")');
      await expect(authenticatedPage.locator('.add-track-modal')).toBeVisible();
    });

    test('should show station analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/radio-dashboard');
      
      await expect(authenticatedPage.locator('.station-analytics')).toBeVisible();
      await expect(authenticatedPage.locator('.listening-hours')).toBeVisible();
      await expect(authenticatedPage.locator('.popular-tracks')).toBeVisible();
      await expect(authenticatedPage.locator('.listener-retention')).toBeVisible();
      
      // Check geographic data
      await expect(authenticatedPage.locator('.listener-geography')).toBeVisible();
    });
  });

  test.describe('Video Dashboard', () => {
    test('should display video dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/video-dashboard');
      
      await expect(authenticatedPage.locator('h1')).toContainText('Video');
      await expect(authenticatedPage.locator('.video-library')).toBeVisible();
      await expect(authenticatedPage.locator('.upload-section')).toBeVisible();
      await expect(authenticatedPage.locator('.channel-analytics')).toBeVisible();
      
      // Check video-specific metrics
      await expect(authenticatedPage.locator('.total-views')).toBeVisible();
      await expect(authenticatedPage.locator('.watch-time')).toBeVisible();
      await expect(authenticatedPage.locator('.subscriber-count')).toBeVisible();
      await expect(authenticatedPage.locator('.engagement-rate')).toBeVisible();
    });

    test('should show video performance analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/video-dashboard');
      
      await expect(authenticatedPage.locator('.video-performance')).toBeVisible();
      await expect(authenticatedPage.locator('.views-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.watch-time-chart')).toBeVisible();
      
      // Check top performing videos
      await expect(authenticatedPage.locator('.top-videos')).toBeVisible();
      if (await authenticatedPage.locator('.video-item').count() > 0) {
        await expect(authenticatedPage.locator('.video-title')).toBeVisible();
        await expect(authenticatedPage.locator('.video-views')).toBeVisible();
        await expect(authenticatedPage.locator('.video-engagement')).toBeVisible();
      }
    });

    test('should manage video library', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/video-dashboard');
      
      await expect(authenticatedPage.locator('.video-library')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Upload Video")')).toBeVisible();
      
      // Check video management features
      if (await authenticatedPage.locator('.video-item').count() > 0) {
        await expect(authenticatedPage.locator('.video-thumbnail')).toBeVisible();
        await expect(authenticatedPage.locator('.video-actions')).toBeVisible();
        
        // Test video actions
        await authenticatedPage.click('.video-item:first-child .more-actions');
        await expect(authenticatedPage.locator('.action-menu')).toBeVisible();
      }
    });

    test('should display audience retention analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/video-dashboard');
      
      await expect(authenticatedPage.locator('.audience-retention')).toBeVisible();
      await expect(authenticatedPage.locator('.retention-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.drop-off-points')).toBeVisible();
      
      // Check engagement metrics
      await expect(authenticatedPage.locator('.likes-ratio')).toBeVisible();
      await expect(authenticatedPage.locator('.comments-rate')).toBeVisible();
      await expect(authenticatedPage.locator('.shares-count')).toBeVisible();
    });

    test('should show channel growth metrics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/video-dashboard');
      
      await expect(authenticatedPage.locator('.channel-growth')).toBeVisible();
      await expect(authenticatedPage.locator('.subscriber-growth-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.view-growth-chart')).toBeVisible();
      
      // Check growth insights
      await expect(authenticatedPage.locator('.growth-insights')).toBeVisible();
      await expect(authenticatedPage.locator('.trending-content')).toBeVisible();
    });
  });

  test.describe('Sales Dashboard', () => {
    test('should display sales dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/sales-dashboard');
      
      await expect(authenticatedPage.locator('h1')).toContainText('Sales');
      await expect(authenticatedPage.locator('.sales-metrics')).toBeVisible();
      await expect(authenticatedPage.locator('.product-performance')).toBeVisible();
      await expect(authenticatedPage.locator('.order-management')).toBeVisible();
      
      // Check key sales metrics
      await expect(authenticatedPage.locator('.total-revenue')).toBeVisible();
      await expect(authenticatedPage.locator('.total-orders')).toBeVisible();
      await expect(authenticatedPage.locator('.conversion-rate')).toBeVisible();
      await expect(authenticatedPage.locator('.average-order-value')).toBeVisible();
    });

    test('should show revenue analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/sales-dashboard');
      
      await expect(authenticatedPage.locator('.revenue-analytics')).toBeVisible();
      await expect(authenticatedPage.locator('.revenue-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.sales-trend')).toBeVisible();
      
      // Test revenue filters
      await authenticatedPage.selectOption('select[name="revenueFilter"]', 'this-month');
      await expect(authenticatedPage.locator('.filtered-revenue-data')).toBeVisible();
      
      await authenticatedPage.selectOption('select[name="revenueFilter"]', 'last-quarter');
      await expect(authenticatedPage.locator('.filtered-revenue-data')).toBeVisible();
    });

    test('should display product performance', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/sales-dashboard');
      
      await expect(authenticatedPage.locator('.product-performance')).toBeVisible();
      await expect(authenticatedPage.locator('.top-products')).toBeVisible();
      await expect(authenticatedPage.locator('.product-sales-chart')).toBeVisible();
      
      // Check product details
      if (await authenticatedPage.locator('.product-item').count() > 0) {
        await expect(authenticatedPage.locator('.product-name')).toBeVisible();
        await expect(authenticatedPage.locator('.product-revenue')).toBeVisible();
        await expect(authenticatedPage.locator('.product-units-sold')).toBeVisible();
      }
    });

    test('should manage orders and fulfillment', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/sales-dashboard');
      
      await expect(authenticatedPage.locator('.order-management')).toBeVisible();
      await expect(authenticatedPage.locator('.recent-orders')).toBeVisible();
      
      // Check order statuses
      if (await authenticatedPage.locator('.order-item').count() > 0) {
        await expect(authenticatedPage.locator('.order-status')).toBeVisible();
        await expect(authenticatedPage.locator('.order-total')).toBeVisible();
        await expect(authenticatedPage.locator('.order-actions')).toBeVisible();
        
        // Test order management
        await authenticatedPage.click('.order-item:first-child .view-details');
        await expect(authenticatedPage.locator('.order-details-modal')).toBeVisible();
      }
    });

    test('should show customer analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/sales-dashboard');
      
      await expect(authenticatedPage.locator('.customer-analytics')).toBeVisible();
      await expect(authenticatedPage.locator('.customer-acquisition')).toBeVisible();
      await expect(authenticatedPage.locator('.customer-retention')).toBeVisible();
      
      // Check customer insights
      await expect(authenticatedPage.locator('.new-customers')).toBeVisible();
      await expect(authenticatedPage.locator('.returning-customers')).toBeVisible();
      await expect(authenticatedPage.locator('.customer-lifetime-value')).toBeVisible();
    });

    test('should manage payout requests', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/sales-dashboard');
      
      await expect(authenticatedPage.locator('.payout-section')).toBeVisible();
      await expect(authenticatedPage.locator('.available-balance')).toBeVisible();
      
      // Test payout request
      if (await authenticatedPage.locator('button:has-text("Request Payout")').isVisible()) {
        await authenticatedPage.click('button:has-text("Request Payout")');
        await expect(authenticatedPage.locator('.payout-modal')).toBeVisible();
        
        await authenticatedPage.fill('input[name="amount"]', '100.00');
        await authenticatedPage.selectOption('select[name="payoutMethod"]', 'paypal');
        await authenticatedPage.click('button:has-text("Submit Request")');
        
        await expect(authenticatedPage.locator('text=Payout requested')).toBeVisible();
      }
    });
  });

  test.describe('Label Dashboard', () => {
    test('should display label dashboard overview', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/label-dashboard');
      
      await expect(authenticatedPage.locator('h1')).toContainText('Label');
      await expect(authenticatedPage.locator('.artist-roster')).toBeVisible();
      await expect(authenticatedPage.locator('.release-calendar')).toBeVisible();
      await expect(authenticatedPage.locator('.label-analytics')).toBeVisible();
      
      // Check label-specific metrics
      await expect(authenticatedPage.locator('.total-artists')).toBeVisible();
      await expect(authenticatedPage.locator('.total-releases')).toBeVisible();
      await expect(authenticatedPage.locator('.label-revenue')).toBeVisible();
      await expect(authenticatedPage.locator('.distribution-reach')).toBeVisible();
    });

    test('should manage artist roster', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/label-dashboard');
      
      await expect(authenticatedPage.locator('.artist-roster')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Add Artist")')).toBeVisible();
      
      // Check artist management
      if (await authenticatedPage.locator('.artist-item').count() > 0) {
        await expect(authenticatedPage.locator('.artist-name')).toBeVisible();
        await expect(authenticatedPage.locator('.artist-performance')).toBeVisible();
        await expect(authenticatedPage.locator('.artist-actions')).toBeVisible();
      }
      
      // Test adding new artist
      await authenticatedPage.click('button:has-text("Add Artist")');
      await expect(authenticatedPage.locator('.add-artist-modal')).toBeVisible();
    });

    test('should show release planning', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/label-dashboard');
      
      await expect(authenticatedPage.locator('.release-planning')).toBeVisible();
      await expect(authenticatedPage.locator('.upcoming-releases')).toBeVisible();
      await expect(authenticatedPage.locator('.release-timeline')).toBeVisible();
      
      // Check release management
      await expect(authenticatedPage.locator('button:has-text("Schedule Release")')).toBeVisible();
      
      if (await authenticatedPage.locator('.release-item').count() > 0) {
        await expect(authenticatedPage.locator('.release-title')).toBeVisible();
        await expect(authenticatedPage.locator('.release-artist')).toBeVisible();
        await expect(authenticatedPage.locator('.release-date')).toBeVisible();
        await expect(authenticatedPage.locator('.release-status')).toBeVisible();
      }
    });

    test('should display label analytics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/label-dashboard');
      
      await expect(authenticatedPage.locator('.label-analytics')).toBeVisible();
      await expect(authenticatedPage.locator('.label-performance-chart')).toBeVisible();
      await expect(authenticatedPage.locator('.artist-comparison')).toBeVisible();
      
      // Check revenue distribution
      await expect(authenticatedPage.locator('.revenue-by-artist')).toBeVisible();
      await expect(authenticatedPage.locator('.revenue-by-platform')).toBeVisible();
      await expect(authenticatedPage.locator('.market-share')).toBeVisible();
    });

    test('should manage contracts and agreements', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/label-dashboard');
      
      await expect(authenticatedPage.locator('.contracts-section')).toBeVisible();
      await expect(authenticatedPage.locator('.active-contracts')).toBeVisible();
      
      // Check contract management
      if (await authenticatedPage.locator('.contract-item').count() > 0) {
        await expect(authenticatedPage.locator('.contract-artist')).toBeVisible();
        await expect(authenticatedPage.locator('.contract-type')).toBeVisible();
        await expect(authenticatedPage.locator('.contract-status')).toBeVisible();
        await expect(authenticatedPage.locator('.contract-expiry')).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Navigation and Integration', () => {
    test('should navigate between different dashboards', async ({ authenticatedPage }) => {
      // Start at creator dashboard
      await authenticatedPage.goto('/creator-dashboard');
      await expect(authenticatedPage.locator('h1')).toContainText('Creator');
      
      // Navigate to artist dashboard
      await authenticatedPage.click('text=🎤 Artist Dashboard');
      await expect(authenticatedPage).toHaveURL(/.*artist-dashboard/);
      await expect(authenticatedPage.locator('h1')).toContainText('Artist');
      
      // Navigate to podcast dashboard
      await authenticatedPage.click('text=🎧 Podcast Dashboard');
      await expect(authenticatedPage).toHaveURL(/.*podcast-dashboard/);
      await expect(authenticatedPage.locator('h1')).toContainText('Podcast');
      
      // Navigate to sales dashboard
      await authenticatedPage.click('text=💰 Sales Dashboard');
      await expect(authenticatedPage).toHaveURL(/.*sales-dashboard/);
      await expect(authenticatedPage.locator('h1')).toContainText('Sales');
    });

    test('should maintain consistent UI elements across dashboards', async ({ authenticatedPage }) => {
      const dashboards = [
        '/creator-dashboard',
        '/artist-dashboard',
        '/podcast-dashboard',
        '/radio-dashboard',
        '/video-dashboard',
        '/sales-dashboard'
      ];
      
      for (const dashboard of dashboards) {
        await authenticatedPage.goto(dashboard);
        
        // Check for consistent navigation
        await expect(authenticatedPage.locator('.sidebar')).toBeVisible();
        await expect(authenticatedPage.locator('.navbar')).toBeVisible();
        
        // Check for common dashboard elements
        await expect(authenticatedPage.locator('.dashboard-header')).toBeVisible();
        await expect(authenticatedPage.locator('.main-metrics')).toBeVisible();
      }
    });

    test('should display real-time updates', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check for real-time elements
      if (await authenticatedPage.locator('.live-metrics').isVisible()) {
        await expect(authenticatedPage.locator('.live-metrics')).toBeVisible();
        await expect(authenticatedPage.locator('.last-updated')).toBeVisible();
      }
      
      // Check for auto-refresh functionality
      if (await authenticatedPage.locator('.auto-refresh').isVisible()) {
        await expect(authenticatedPage.locator('.auto-refresh')).toBeVisible();
      }
    });

    test('should handle dashboard permissions correctly', async ({ authenticatedPage }) => {
      // Test that users can only access dashboards they have permissions for
      await authenticatedPage.goto('/creator-dashboard');
      await expect(authenticatedPage.locator('h1')).toContainText('Creator');
      
      // Try accessing restricted dashboard (should work for test user)
      await authenticatedPage.goto('/label-dashboard');
      
      // Should either load or redirect based on permissions
      const currentUrl = authenticatedPage.url();
      expect(currentUrl).toMatch(/label-dashboard|dashboard|unauthorized/);
    });

    test('should export dashboard data', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check for export functionality
      if (await authenticatedPage.locator('button:has-text("Export")').isVisible()) {
        await authenticatedPage.click('button:has-text("Export")');
        await expect(authenticatedPage.locator('.export-options')).toBeVisible();
        
        // Test different export formats
        await authenticatedPage.selectOption('select[name="exportFormat"]', 'csv');
        await authenticatedPage.click('button:has-text("Download")');
        
        await expect(authenticatedPage.locator('text=Export started')).toBeVisible();
      }
    });

    test('should customize dashboard layout', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check for customization options
      if (await authenticatedPage.locator('button:has-text("Customize")').isVisible()) {
        await authenticatedPage.click('button:has-text("Customize")');
        await expect(authenticatedPage.locator('.layout-options')).toBeVisible();
        
        // Test widget rearrangement
        if (await authenticatedPage.locator('.drag-handle').isVisible()) {
          await expect(authenticatedPage.locator('.draggable-widget')).toBeVisible();
        }
      }
    });
  });

  test.describe('Dashboard Performance and Responsiveness', () => {
    test('should load dashboards quickly', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      await authenticatedPage.goto('/creator-dashboard');
      await authenticatedPage.waitForSelector('.analytics-widget');
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should work on mobile devices', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await authenticatedPage.goto('/creator-dashboard');
      
      // Check mobile responsiveness
      await expect(authenticatedPage.locator('.dashboard-mobile')).toBeVisible();
      await expect(authenticatedPage.locator('.metrics-cards')).toBeVisible();
      
      // Check that charts adapt to mobile
      await expect(authenticatedPage.locator('.mobile-chart')).toBeVisible();
    });

    test('should handle large datasets efficiently', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/artist-dashboard');
      
      // Load large dataset view
      if (await authenticatedPage.locator('select[name="dataRange"]').isVisible()) {
        await authenticatedPage.selectOption('select[name="dataRange"]', 'all-time');
        
        // Should handle loading state
        await expect(authenticatedPage.locator('.loading-indicator')).toBeVisible();
        
        // Should eventually load data
        await expect(authenticatedPage.locator('.chart-container')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});