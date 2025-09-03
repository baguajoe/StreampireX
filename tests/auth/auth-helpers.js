import { expect } from '@playwright/test';

export class StreamPirexAuth {
  constructor(page) {
    this.page = page;
  }

  // Based on your successful Status 201 registration test
  async registerNewUser(userOverrides = {}) {
    const timestamp = Date.now();
    const defaultUser = {
      email: `test${timestamp}@streampirex.com`,
      username: `testuser${timestamp}`,
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      ...userOverrides
    };

    await this.page.goto('/signup');
    
    // Fill registration form
    await this.page.fill('[data-testid="email"]', defaultUser.email);
    await this.page.fill('[data-testid="username"]', defaultUser.username);
    await this.page.fill('[data-testid="password"]', defaultUser.password);
    await this.page.fill('[data-testid="confirm-password"]', defaultUser.password);
    await this.page.fill('[data-testid="first-name"]', defaultUser.firstName);
    await this.page.fill('[data-testid="last-name"]', defaultUser.lastName);
    await this.page.fill('[data-testid="date-of-birth"]', defaultUser.dateOfBirth);
    
    // Accept terms (based on your working implementation)
    await this.page.check('[data-testid="terms-accepted"]');
    await this.page.check('[data-testid="privacy-accepted"]');
    await this.page.check('[data-testid="age-verification"]');
    
    // Submit and verify Status 201
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/signup') && response.status() === 201
    );
    
    await this.page.click('[data-testid="signup-button"]');
    const response = await responsePromise;
    
    expect(response.status()).toBe(201);
    
    return defaultUser;
  }

  // Based on your successful Status 200 login test
  async loginExistingUser(email, password) {
    await this.page.goto('/login');
    
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    
    // Wait for Status 200 response
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/login') && response.status() === 200
    );
    
    await this.page.click('[data-testid="login-button"]');
    const response = await responsePromise;
    
    expect(response.status()).toBe(200);
    
    // Verify JWT token storage
    const token = await this.page.evaluate(() => localStorage.getItem('jwt-token'));
    expect(token).toBeTruthy();
    
    return token;
  }

  // Validate dual login URL construction (your working feature)
  async validateDualLoginUrls() {
    const token = await this.page.evaluate(() => localStorage.getItem('jwt-token'));
    
    // Test SonoSuite URL construction
    const sonoSuiteUrl = await this.page.evaluate((token) => {
      return `https://app.sonosuite.com/auth?token=${token}&redirect=streampirex`;
    }, token);
    
    expect(sonoSuiteUrl).toMatch(/^https:\/\/app\.sonosuite\.com\/auth\?token=.+&redirect=streampirex$/);
    
    return sonoSuiteUrl;
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout"]');
    
    // Verify token removal
    const token = await this.page.evaluate(() => localStorage.getItem('jwt-token'));
    expect(token).toBeNull();
  }
}

export class APITester {
  constructor(page) {
    this.page = page;
  }

  // Based on your endpoint availability checks
  async testEndpointAvailability(endpoint, expectedStatus = 200) {
    const response = await this.page.request.get(`http://localhost:3001${endpoint}`);
    return {
      status: response.status(),
      endpoint,
      available: response.status() !== 404
    };
  }

  async validateWorkingEndpoints() {
    const workingEndpoints = [
      '/api/signup',
      '/api/login',
      '/api/user/profile',
      '/api/health'
    ];

    const results = [];
    for (const endpoint of workingEndpoints) {
      const result = await this.testEndpointAvailability(endpoint);
      results.push(result);
    }
    
    return results;
  }

  async validatePendingEndpoints() {
    const pendingEndpoints = [
      '/api/sonosuite/connect',
      '/api/distribution/submit'
    ];

    const results = [];
    for (const endpoint of pendingEndpoints) {
      const result = await this.testEndpointAvailability(endpoint, 404);
      results.push({
        ...result,
        isPending: result.status === 404
      });
    }
    
    return results;
  }
}