// tests/utils/marketplace-test-utils.js
import { expect } from '@playwright/test';

/**
 * Test data for marketplace testing
 */
export const MARKETPLACE_TEST_DATA = {
  users: {
    buyer: {
      email: "buyer@test.com",
      username: "testbuyer", 
      password: "TestPassword123!",
      role: "Explorer"
    },
    seller: {
      email: "seller@test.com",
      username: "testseller",
      password: "TestPassword123!",
      role: "Artist",
      artist_name: "Test Artist"
    }
  },
  products: {
    physical: {
      name: "Test Physical Product",
      description: "A test physical product for marketplace testing",
      price: 25.99,
      category: "Physical",
      shipping_required: true,
      inventory_count: 100
    },
    digital: {
      name: "Test Digital Product",
      description: "A test digital product for marketplace testing", 
      price: 9.99,
      category: "Digital",
      shipping_required: false
    },
    merch: {
      name: "Artist T-Shirt",
      description: "Official artist merchandise t-shirt",
      price: 19.99,
      category: "Merchandise",
      shipping_required: true,
      inventory_count: 50
    }
  }
};

/**
 * Authentication Helper Class
 */
export class AuthHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
  }

  async loginUser(email, password) {
    await this.page.goto(`${this.baseUrl}/login`);
    
    await this.page.locator('[data-testid="email"], input[type="email"]').fill(email);
    await this.page.locator('[data-testid="password"], input[type="password"]').fill(password);
    await this.page.locator('[data-testid="login-button"], button[type="submit"]').click();
    
    // Wait for redirect to dashboard or home
    await this.page.waitForURL('**/dashboard/**', { timeout: 10000 });
  }

  async signupUser(userData) {
    await this.page.goto(`${this.baseUrl}/signup`);
    
    await this.page.locator('[data-testid="email"]').fill(userData.email);
    await this.page.locator('[data-testid="username"]').fill(userData.username);
    await this.page.locator('[data-testid="password"]').fill(userData.password);
    await this.page.locator('[data-testid="confirm-password"]').fill(userData.password);
    
    if (userData.role) {
      await this.page.locator('[data-testid="role"]').selectOption(userData.role);
    }
    
    if (userData.artist_name) {
      await this.page.locator('[data-testid="artist-name"]').fill(userData.artist_name);
    }

    // Accept terms and conditions
    await this.page.locator('[data-testid="terms-checkbox"]').check();
    await this.page.locator('[data-testid="privacy-checkbox"]').check();
    await this.page.locator('[data-testid="age-checkbox"]').check();
    
    await this.page.locator('[data-testid="signup-button"]').click();
    
    // Wait for redirect
    await this.page.waitForURL('**/dashboard/**', { timeout: 10000 });
  }

  async logout() {
    await this.page.locator('[data-testid="user-menu"], .user-dropdown').click();
    await this.page.locator('[data-testid="logout-button"], .logout-btn').click();
    await this.page.waitForURL('**/login');
  }
}

/**
 * Marketplace Helper Class
 */
export class MarketplaceHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
  }

  async navigateToMarketplace() {
    await this.page.goto(`${this.baseUrl}/marketplace`);
    await this.page.waitForLoadState('networkidle');
  }

  async searchProducts(searchTerm) {
    const searchInput = this.page.locator('[data-testid="product-search"], .search-input');
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCategory(category) {
    const categoryFilter = this.page.locator('[data-testid="category-filter"], .category-select');
    await categoryFilter.selectOption(category);
    await this.page.waitForLoadState('networkidle');
  }

  async addProductToCart(productName) {
    const productCard = this.page.locator(`[data-testid="product-${productName}"], .product-card`).first();
    const addToCartButton = productCard.locator('[data-testid="add-to-cart"], .add-to-cart-btn');
    await addToCartButton.click();
    
    // Wait for cart update confirmation
    await this.page.waitForSelector('.success-message, .cart-notification', { timeout: 5000 });
  }

  async viewProductDetails(productName) {
    const productCard = this.page.locator(`[data-testid="product-${productName}"], .product-card`).first();
    await productCard.click();
    await this.page.waitForSelector('.product-detail-page, .product-details');
  }

  async getProductCount() {
    const products = this.page.locator('.product-card');
    return await products.count();
  }
}

/**
 * Storefront Helper Class
 */
export class StorefrontHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
  }

  async navigateToStorefront(storeId) {
    await this.page.goto(`${this.baseUrl}/storefront/${storeId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async viewStoreProducts() {
    await this.page.waitForSelector('.store-products, .storefront-products');
    return await this.page.locator('.product-card').count();
  }
}

/**
 * Checkout Helper Class  
 */
export class CheckoutHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
  }

  async navigateToCart() {
    const cartIcon = this.page.locator('[data-testid="cart-icon"], .cart-button');
    await cartIcon.click();
    await this.page.waitForSelector('.shopping-cart, .cart-container');
  }

  async proceedToCheckout() {
    const checkoutButton = this.page.locator('[data-testid="checkout-button"], .checkout-btn');
    await checkoutButton.click();
    await this.page.waitForSelector('.checkout-page, .checkout-container');
  }

  async fillShippingDetails(shippingData) {
    await this.page.locator('[data-testid="shipping-address"]').fill(shippingData.address);
    await this.page.locator('[data-testid="shipping-city"]').fill(shippingData.city);
    await this.page.locator('[data-testid="shipping-state"]').fill(shippingData.state);
    await this.page.locator('[data-testid="shipping-zip"]').fill(shippingData.zip);
  }

  async selectPaymentMethod(method) {
    await this.page.locator(`[data-testid="payment-${method}"]`).click();
  }

  async completeOrder() {
    const placeOrderButton = this.page.locator('[data-testid="place-order"], .place-order-btn');
    await placeOrderButton.click();
    await this.page.waitForSelector('.order-confirmation, .checkout-success');
  }
}

/**
 * Order Helper Class
 */
export class OrderHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
  }

  async navigateToOrderHistory() {
    await this.page.goto(`${this.baseUrl}/orders`);
    await this.page.waitForLoadState('networkidle');
  }

  async viewOrderDetails(orderId) {
    const orderLink = this.page.locator(`[data-testid="order-${orderId}"], .order-item`).first();
    await orderLink.click();
    await this.page.waitForSelector('.order-details, .order-detail-page');
  }

  async getOrderStatus(orderId) {
    const statusElement = this.page.locator(`[data-testid="order-${orderId}-status"], .order-status`);
    return await statusElement.textContent();
  }
}

/**
 * Test Utilities Class
 */
export class TestUtilities {
  constructor(page) {
    this.page = page;
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
  }

  async cleanup() {
    // Clear localStorage and sessionStorage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async waitForApiResponse(endpoint) {
    await this.page.waitForResponse(response => 
      response.url().includes(endpoint) && response.status() === 200
    );
  }

  async mockApiResponse(endpoint, responseData) {
    await this.page.route(`**/${endpoint}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }
}

/**
 * Setup API mocks for marketplace tests
 */
export async function setupMarketplaceApiMocks(page) {
  // Mock products API
  await page.route('**/api/marketplace/products', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        MARKETPLACE_TEST_DATA.products.physical,
        MARKETPLACE_TEST_DATA.products.digital,
        MARKETPLACE_TEST_DATA.products.merch
      ])
    });
  });

  // Mock cart API
  await page.route('**/api/marketplace/cart/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Item added to cart', cart_count: 1 })
    });
  });

  // Mock user authentication check
  await page.route('**/api/user/profile', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MARKETPLACE_TEST_DATA.users.buyer)
    });
  });
}

/**
 * Common assertions for marketplace tests
 */
export const MarketplaceAssertions = {
  async verifyProductCard(page, productData) {
    const productCard = page.locator(`[data-testid="product-${productData.name}"], .product-card`).first();
    await expect(productCard).toBeVisible();
    await expect(productCard.locator('.product-name, .product-title')).toContainText(productData.name);
    await expect(productCard.locator('.product-price')).toContainText(productData.price.toString());
  },

  async verifyCartCount(page, expectedCount) {
    const cartBadge = page.locator('[data-testid="cart-count"], .cart-badge');
    await expect(cartBadge).toContainText(expectedCount.toString());
  },

  async verifyCheckoutSuccess(page) {
    await expect(page.locator('.checkout-success, .order-confirmation')).toBeVisible();
    await expect(page.locator('.order-number, .confirmation-message')).toBeVisible();
  },

  async verifyProductSearch(page, searchTerm, expectedMinResults) {
    const searchResults = page.locator('.search-results .product-card, .product-grid .product-card');
    await expect(searchResults).toHaveCount.greaterThanOrEqual(expectedMinResults);
  },

  async verifyEmptyState(page) {
    await expect(page.locator('.empty-state, .no-products, .no-results')).toBeVisible();
  }
};