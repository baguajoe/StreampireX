// tests/features/marketplace.spec.js
import { test, expect } from '@playwright/test';

// Fix the import statement - remove the extra characters and fix the path
import {
    MARKETPLACE_TEST_DATA,
    AuthHelper,
    MarketplaceHelper,
    StorefrontHelper,
    CheckoutHelper,
    OrderHelper,
    TestUtilities
} from '../utils/marketplace-test-utils.js';

// Import API mocks setup function
import { setupMarketplaceApiMocks } from '../utils/marketplace-test-utils.js';

// Test data and utilities
const TEST_USER = MARKETPLACE_TEST_DATA.users.buyer;
const TEST_BUYER = MARKETPLACE_TEST_DATA.users.buyer;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

test.describe('Marketplace Tests', () => {
    let authHelper;
    let marketplaceHelper;
    let storefrontHelper;
    let checkoutHelper;
    let orderHelper;
    let testUtilities;

    test.beforeEach(async ({ page }) => {
        // Initialize helper classes
        authHelper = new AuthHelper(page);
        marketplaceHelper = new MarketplaceHelper(page);
        storefrontHelper = new StorefrontHelper(page);
        checkoutHelper = new CheckoutHelper(page);
        orderHelper = new OrderHelper(page);
        testUtilities = new TestUtilities(page);

        // Setup API mocks if needed
        await setupMarketplaceApiMocks(page);
    });

    test.afterEach(async ({ page }) => {
        // Cleanup after each test
        await testUtilities.cleanup();
    });

    test('should load marketplace page successfully', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        
        // Verify marketplace page loads
        await expect(page.locator('h1')).toContainText('Marketplace');
        await expect(page.locator('.marketplace-container')).toBeVisible();
    });

    test('should display products correctly', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        
        // Wait for products to load
        await page.waitForSelector('.marketplace-product-grid', { timeout: 10000 });
        
        // Verify product grid is visible
        await expect(page.locator('.marketplace-product-grid')).toBeVisible();
        
        // Check if products are displayed
        const productCards = page.locator('.product-card');
        await expect(productCards.first()).toBeVisible();
    });

    test('should search for products', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Search for a product
        const searchInput = page.locator('[data-testid="product-search"], .search-input');
        await searchInput.fill('test product');
        await searchInput.press('Enter');
        
        // Wait for search results
        await page.waitForLoadState('networkidle');
        
        // Verify search results
        await expect(page.locator('.search-results, .product-grid')).toBeVisible();
    });

    test('should filter products by category', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Select a category filter
        const categoryFilter = page.locator('[data-testid="category-filter"], .category-select');
        await categoryFilter.selectOption('Physical');
        
        // Wait for filtered results
        await page.waitForLoadState('networkidle');
        
        // Verify filtered products are shown
        await expect(page.locator('.product-card')).toHaveCount.greaterThan(0);
    });

    test('should add product to cart (requires authentication)', async ({ page }) => {
        // First login as a buyer
        await authHelper.loginUser(TEST_BUYER.email, TEST_BUYER.password);
        
        // Navigate to marketplace
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        // Find and click add to cart button
        const addToCartButton = page.locator('[data-testid="add-to-cart"], .add-to-cart-btn').first();
        await addToCartButton.click();
        
        // Verify cart updated (look for success message or cart count)
        await expect(page.locator('.success-message, .cart-count, .cart-notification')).toBeVisible();
    });

    test('should view product details', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        // Click on first product card
        const productCard = page.locator('.product-card').first();
        await productCard.click();
        
        // Verify we're on product detail page
        await expect(page.locator('.product-detail-page, .product-details')).toBeVisible();
        await expect(page.locator('.product-title, .product-name')).toBeVisible();
        await expect(page.locator('.product-price')).toBeVisible();
    });

    test('should navigate to shopping cart', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        
        // Click cart icon
        const cartIcon = page.locator('[data-testid="cart-icon"], .cart-button, .shopping-cart');
        await cartIcon.click();
        
        // Verify cart page loads
        await expect(page.locator('.shopping-cart-page, .cart-container')).toBeVisible();
    });

    test('should complete checkout process (authenticated user)', async ({ page }) => {
        // Login first
        await authHelper.loginUser(TEST_BUYER.email, TEST_BUYER.password);
        
        // Add product to cart
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        const addToCartButton = page.locator('[data-testid="add-to-cart"], .add-to-cart-btn').first();
        await addToCartButton.click();
        
        // Go to cart
        const cartIcon = page.locator('[data-testid="cart-icon"], .cart-button');
        await cartIcon.click();
        
        // Proceed to checkout
        const checkoutButton = page.locator('[data-testid="checkout-button"], .checkout-btn');
        await checkoutButton.click();
        
        // Verify checkout page
        await expect(page.locator('.checkout-page, .checkout-container')).toBeVisible();
    });
});

// Performance tests
test.describe('Marketplace Performance Tests', () => {
    test('marketplace page should load within 5 seconds', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    test('product search should respond quickly', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        const startTime = Date.now();
        
        const searchInput = page.locator('[data-testid="product-search"], .search-input');
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle');
        
        const searchTime = Date.now() - startTime;
        expect(searchTime).toBeLessThan(2000); // 2 seconds
    });
});

// Mobile responsiveness tests
test.describe('Marketplace Mobile Tests', () => {
    test.use({ 
        viewport: { width: 375, height: 667 } // iPhone SE size
    });

    test('should be mobile responsive', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        // Check that marketplace loads on mobile
        await expect(page.locator('.marketplace-container')).toBeVisible();
        
        // Check mobile-specific elements if they exist
        const mobileMenu = page.locator('.mobile-menu, .hamburger-menu');
        if (await mobileMenu.count() > 0) {
            await expect(mobileMenu).toBeVisible();
        }
    });

    test('mobile product cards should be touchable', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        // Tap on first product card
        const productCard = page.locator('.product-card').first();
        await productCard.tap();
        
        // Should navigate to product details
        await expect(page.locator('.product-detail-page, .product-details')).toBeVisible();
    });
});

// Error handling tests
test.describe('Marketplace Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
        // Mock network failure
        await page.route('**/api/marketplace/**', route => route.abort());
        
        await page.goto(`${FRONTEND_URL}/marketplace`);
        
        // Should show error message or loading state
        await expect(page.locator('.error-message, .loading-state, .connection-error')).toBeVisible();
    });

    test('should handle empty marketplace state', async ({ page }) => {
        // Mock empty response
        await page.route('**/api/marketplace/products', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });
        
        await page.goto(`${FRONTEND_URL}/marketplace`);
        await page.waitForLoadState('networkidle');
        
        // Should show empty state message
        await expect(page.locator('.empty-state, .no-products')).toBeVisible();
    });
});