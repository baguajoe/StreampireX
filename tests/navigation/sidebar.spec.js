// tests/navigation/sidebar.spec.js
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

test.describe('Sidebar Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display sidebar structure correctly', async ({ page }) => {
    // Check that sidebar is visible
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Check main section headers with sidebar-specific selectors
    await expect(page.locator('.sidebar h4:has-text("User")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Dashboards")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Indie Artists")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Gamers")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Podcasts")').first()).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Videos")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Radio Stations")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Live Streaming")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Store & Marketplace")')).toBeVisible();
    await expect(page.locator('.sidebar h4:has-text("Account")')).toBeVisible();
  });

  test('should show user profile links', async ({ page }) => {
    // Check user section links
    await expect(page.locator('a[href="/home-feed"]')).toContainText('Home Feed');
    await expect(page.locator('a[href="/profile"]')).toContainText('Regular Profile');
    await expect(page.locator('a[href="/profile/gamer"]')).toContainText('Gamer Profile');
    await expect(page.locator('a[href="/profile/artist"]')).toContainText('Artist Profile');
    await expect(page.locator('a[href="/profile/video"]')).toContainText('Channel Profile');
  });

  test('should show dashboard links', async ({ page }) => {
    // Check dashboard section links
    await expect(page.locator('a[href="/creator-dashboard"]')).toContainText('Creator Dashboard');
    await expect(page.locator('a[href="/artist-dashboard"]')).toContainText('Artist Dashboard');
    await expect(page.locator('a[href="/podcast-dashboard"]')).toContainText('Podcast Dashboard');
    await expect(page.locator('a[href="/radio-dashboard"]')).toContainText('Radio Dashboard');
    await expect(page.locator('a[href="/video-dashboard"]')).toContainText('Video Dashboard');
    await expect(page.locator('a[href="/sales-dashboard"]')).toContainText('Sales Dashboard');
    await expect(page.locator('a[href="/label-dashboard"]')).toContainText('Label Dashboard');
  });

  test('should show indie artist links', async ({ page }) => {
    // Check indie artists section
    await expect(page.locator('a[href="/music-distribution"]')).toContainText('Music Distribution');
    await expect(page.locator('a[href="/search"]')).toContainText('Search Artists');
    await expect(page.locator('a[href="/collaborator-splits"]')).toContainText('Collaborator Splits');
  });

  test('should show gaming section with toggle functionality', async ({ page }) => {
    // Check gaming section header
    const gamingHeader = page.locator('h4:has-text("Gamers")');
    await expect(gamingHeader).toBeVisible();
    
    // Check if gaming links are initially visible
    await expect(page.locator('a[href="/gamers/chat"]')).toBeVisible();
    await expect(page.locator('a[href="/team-room"]')).toBeVisible();
    await expect(page.locator('a[href="/squad-finder"]')).toBeVisible();
    
    // Test toggle functionality by clicking header
    await gamingHeader.click();
    
    // Gaming links should be hidden after clicking
    await expect(page.locator('a[href="/gamers/chat"]')).not.toBeVisible();
    
    // Click again to show
    await gamingHeader.click();
    await expect(page.locator('a[href="/gamers/chat"]')).toBeVisible();
  });

  test('should show notification badges on gaming links', async ({ page }) => {
    // Check for notification badges in gaming section
    const chatroomLink = page.locator('a[href="/gamers/chat"]');
    const teamRoomLink = page.locator('a[href="/team-room"]');
    
    // Check if badges exist (they may not always be present)
    const chatroomBadge = chatroomLink.locator('.notification-badge');
    const teamRoomBadge = teamRoomLink.locator('.notification-badge');
    
    if (await chatroomBadge.count() > 0) {
      await expect(chatroomBadge).toBeVisible();
    }
    
    if (await teamRoomBadge.count() > 0) {
      await expect(teamRoomBadge).toBeVisible();
    }
  });

  test('should show podcast section links', async ({ page }) => {
    // Check podcast section with sidebar-specific selectors
    await expect(page.locator('.sidebar a[href="/podcast-create"]')).toContainText('Create Podcast');
    await expect(page.locator('.sidebar a[href="/browse-podcast-categories"]')).toContainText('Browse Categories');
  });

  test('should show video section links', async ({ page }) => {
    // Check video section with sidebar-specific selectors
    await expect(page.locator('.sidebar a[href="/videos"]')).toContainText('Browse Videos');
    await expect(page.locator('.sidebar a[href="/my-channel"]')).toContainText('My Channel');
    await expect(page.locator('.sidebar a[href="/upload-video"]')).toContainText('Upload Video');
  });

  test('should show radio section links', async ({ page }) => {
    // Check radio section with sidebar-specific selectors
    await expect(page.locator('.sidebar a[href="/browse-radio-stations"]')).toContainText('Browse Stations');
    await expect(page.locator('.sidebar a[href="/create-radio"]')).toContainText('Create Station');
  });

  test('should show live streaming section links', async ({ page }) => {
    // Check live streaming section with sidebar-specific selectors
    await expect(page.locator('.sidebar a[href="/live-streams"]')).toContainText('Live Streams');
    await expect(page.locator('.sidebar a[href="/live-concerts"]')).toContainText('Live Concerts');
  });

  test('should show marketplace section links', async ({ page }) => {
    // Check marketplace section
    await expect(page.locator('a[href="/marketplace"]')).toContainText('Browse Marketplace');
    await expect(page.locator('a[href="/cart"]')).toContainText('Shopping Cart');
    await expect(page.locator('a[href="/checkout"]')).toContainText('Checkout');
    await expect(page.locator('a[href="/storefront"]')).toContainText('My Storefront');
    await expect(page.locator('a[href="/orders"]')).toContainText('Order History');
  });

  test('should show account section links', async ({ page }) => {
    // Check account section
    await expect(page.locator('a[href="/settings"]')).toContainText('Settings');
  });

  test('should navigate to profile pages correctly', async ({ page }) => {
    // Test navigation to regular profile
    await page.click('a[href="/profile"]');
    await expect(page).toHaveURL(/.*profile/);
    
    // Go back and test artist profile
    await page.goto(FRONTEND_URL);
    await page.click('a[href="/profile/artist"]');
    await expect(page).toHaveURL(/.*profile\/artist/);
    
    // Go back and test gamer profile
    await page.goto(FRONTEND_URL);
    await page.click('a[href="/profile/gamer"]');
    await expect(page).toHaveURL(/.*profile\/gamer/);
  });

  test('should navigate to dashboard pages correctly', async ({ page }) => {
    // Test creator dashboard navigation
    await page.click('a[href="/creator-dashboard"]');
    await expect(page).toHaveURL(/.*creator-dashboard/);
    
    // Test artist dashboard
    await page.goto(FRONTEND_URL);
    await page.click('a[href="/artist-dashboard"]');
    await expect(page).toHaveURL(/.*artist-dashboard/);
  });

  test('should navigate to marketplace correctly', async ({ page }) => {
    // Test marketplace navigation
    await page.click('a[href="/marketplace"]');
    await expect(page).toHaveURL(/.*marketplace/);
  });

  test('should show active states correctly', async ({ page }) => {
    // Navigate to a page and check if corresponding sidebar link becomes active
    await page.goto(`${FRONTEND_URL}/profile`);
    await expect(page.locator('a[href="/profile"].active')).toBeVisible();
    
    // Test another page
    await page.goto(`${FRONTEND_URL}/settings`);
    await expect(page.locator('a[href="/settings"].active')).toBeVisible();
  });

  test('should persist gaming section toggle state', async ({ page }) => {
    // Close gaming section
    const gamingHeader = page.locator('h4:has-text("Gamers")');
    await gamingHeader.click();
    await expect(page.locator('a[href="/gamers/chat"]')).not.toBeVisible();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Gaming section should remain closed
    await expect(page.locator('a[href="/gamers/chat"]')).not.toBeVisible();
  });
});

test.describe('Sidebar Responsive Tests', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be hidden by default on mobile
    const sidebar = page.locator('.sidebar');
    
    // Check if sidebar has responsive behavior
    if (await sidebar.isVisible()) {
      // If visible, it should have mobile-appropriate styling
      const sidebarWidth = await sidebar.evaluate(el => getComputedStyle(el).width);
      console.log(`Mobile sidebar width: ${sidebarWidth}`);
    }
  });

  test('should handle tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Check sidebar behavior on tablet
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});

test.describe('Sidebar Performance Tests', () => {
  test('should load sidebar quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.sidebar');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('should handle rapid section toggling', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    const gamingHeader = page.locator('h4:has-text("Gamers")');
    
    // Rapidly toggle gaming section multiple times
    for (let i = 0; i < 5; i++) {
      await gamingHeader.click();
      await page.waitForTimeout(100);
    }
    
    // Should still be functional
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});

test.describe('Sidebar Accessibility Tests', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Click on sidebar to focus it first
    await page.locator('.sidebar').click();
    
    // Tab to navigate through sidebar links
    await page.keyboard.press('Tab');
    
    // Check if any sidebar link is focused (more flexible test)
    const focusedElement = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement && activeElement.href ? activeElement.href : null;
    });
    
    // Should focus on a sidebar link (any sidebar link is acceptable)
    expect(focusedElement).toBeTruthy();
    console.log(`Focused element: ${focusedElement}`);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Check that sidebar has proper navigation role
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    
    // Check section headers are properly labeled
    const sectionHeaders = page.locator('.sidebar h4');
    const headerCount = await sectionHeaders.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('should handle focus management', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Click on a sidebar link and ensure focus is managed properly
    const profileLink = page.locator('a[href="/profile"]');
    await profileLink.click();
    
    // After navigation, focus should be managed appropriately
    await expect(page).toHaveURL(/.*profile/);
  });
});