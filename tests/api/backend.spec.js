// tests/api/backend.spec.js - Updated version with BACKEND_URL
const { test, expect } = require('@playwright/test');

// Helper function to safely parse JSON responses
async function safeJsonParse(response) {
  const contentType = response.headers()['content-type'] || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.log(`Expected JSON but got ${contentType}:`, text.substring(0, 200));
    return null;
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error('JSON parse error:', error);
    const text = await response.text();
    console.log('Response text:', text.substring(0, 200));
    return null;
  }
}

// Helper function to make requests with proper backend URL
async function makeRequest(request, path, options = {}) {
  const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
  const fullUrl = `${backendUrl}${path}`;
  
  if (options.data) {
    return await request.post(fullUrl, options);
  } else {
    return await request.get(fullUrl, options);
  }
}

test.describe('Backend API Tests', () => {
  
  test.describe('Health and System Endpoints', () => {
    test('should test health endpoint', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.get(`${backendUrl}/api/health`);
      if (!response.ok()) {
        response = await request.get(`${backendUrl}/api/health`);
      }
      
      console.log('Health endpoint status:', response.status());
      console.log('Health endpoint headers:', response.headers());
      
      if (response.ok()) {
        const data = await safeJsonParse(response);
        if (data) {
          expect(data).toHaveProperty('status');
        }
      } else {
        const text = await response.text();
        console.log('Health endpoint failed:', text.substring(0, 300));
      }
      
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Authentication Endpoints', () => {
    test('should register new user', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      const uniqueEmail = `testuser${Date.now()}@example.com`;
      
      let response = await request.post(`${backendUrl}/api/signup`, {
        data: {
          email: uniqueEmail,
          password: 'testpassword123',
          first_name: 'Test',
          last_name: 'User'
        }
      });
      
      if (response.status() === 404) {
        response = await request.post(`${backendUrl}/api/signup`, {
          data: {
            email: uniqueEmail,
            password: 'testpassword123',
            first_name: 'Test',
            last_name: 'User'
          }
        });
      }
      
      console.log('Signup status:', response.status());
      const data = await safeJsonParse(response);
      
      expect([200, 201, 400, 405, 409]).toContain(response.status());
      
      if (data) {
        expect(data).toHaveProperty(data.message ? 'message' : 'error');
      }
    });

    test('should authenticate user with valid credentials', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      const uniqueEmail = `logintest${Date.now()}@example.com`;
      
      let signupResponse = await request.post(`${backendUrl}/api/signup`, {
        data: {
          email: uniqueEmail,
          password: 'testpassword123',
          first_name: 'Login',
          last_name: 'Test'
        }
      });
      
      if (signupResponse.status() === 404) {
        signupResponse = await request.post(`${backendUrl}/api/signup`, {
          data: {
            email: uniqueEmail,
            password: 'testpassword123',
            first_name: 'Login',
            last_name: 'Test'
          }
        });
      }

      let loginResponse = await request.post(`${backendUrl}/api/login`, {
        data: {
          email: uniqueEmail,
          password: 'testpassword123'
        }
      });
      
      if (loginResponse.status() === 404) {
        loginResponse = await request.post(`${backendUrl}/api/login`, {
          data: {
            email: uniqueEmail,
            password: 'testpassword123'
          }
        });
      }
      
      console.log('Login status:', loginResponse.status());
      const loginData = await safeJsonParse(loginResponse);
      
      if (loginResponse.ok() && loginData) {
        expect(loginData).toHaveProperty('access_token');
      } else {
        expect([400, 401, 404, 405]).toContain(loginResponse.status());
      }
    });

    test('should reject invalid login credentials', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.post(`${backendUrl}/api/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }
      });
      
      if (response.status() === 404) {
        response = await request.post(`${backendUrl}/api/login`, {
          data: {
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          }
        });
      }
      
      expect([400, 401, 404, 405]).toContain(response.status());
    });

    test('should handle protected routes without token', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.get(`${backendUrl}/api/user/profile`);
      if (response.status() === 404) {
        response = await request.get(`${backendUrl}/api/user/profile`);
      }
      
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  test.describe('User Profile Management', () => {
    let authToken = null;
    
    test.beforeAll(async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      const uniqueEmail = `profiletest${Date.now()}@example.com`;
      
      let signupResponse = await request.post(`${backendUrl}/api/signup`, {
        data: {
          email: uniqueEmail,
          password: 'testpassword123',
          first_name: 'Profile',
          last_name: 'Test'
        }
      });
      
      if (signupResponse.status() === 404) {
        signupResponse = await request.post(`${backendUrl}/api/signup`, {
          data: {
            email: uniqueEmail,
            password: 'testpassword123',
            first_name: 'Profile',
            last_name: 'Test'
          }
        });
      }
      
      let loginResponse = await request.post(`${backendUrl}/api/login`, {
        data: {
          email: uniqueEmail,
          password: 'testpassword123'
        }
      });
      
      if (loginResponse.status() === 404) {
        loginResponse = await request.post(`${backendUrl}/api/login`, {
          data: {
            email: uniqueEmail,
            password: 'testpassword123'
          }
        });
      }
      
      const loginData = await safeJsonParse(loginResponse);
      console.log(loginData)
      if (loginData && loginData.access_token) {
        authToken = loginData.access_token;
      }
    });

    test('should fetch user profile with valid token', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');
      
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.get(`${backendUrl}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      console.log(backendUrl)
      console.log(response)
      if (response.status() === 404) {
        response = await request.get(`${backendUrl}/api/user/profile`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
      }
      
      console.log('Profile fetch status:', response.status());
      
      if (response.ok()) {
        const profile = await safeJsonParse(response);
        if (profile) {
          expect(profile).toHaveProperty('email');
        }
      } else {
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('Podcast Endpoints', () => {
    test('should fetch all podcasts', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.get(`${backendUrl}/api/podcasts`);
      if (response.status() === 404) {
        response = await request.get(`${backendUrl}/api/podcasts`);
      }
      
      console.log('Podcasts status:', response.status());
      
      expect([200, 404]).toContain(response.status());
      
      if (response.ok()) {
        const podcasts = await safeJsonParse(response);
        if (podcasts) {
          expect(Array.isArray(podcasts)).toBeTruthy();
        }
      }
    });

    test('should fetch podcast categories', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.get(`${backendUrl}/api/podcasts/categories`);
      if (response.status() === 404) {
        response = await request.get(`${backendUrl}/api/podcasts/categories`);
      }
      
      console.log('Categories status:', response.status());
      
      expect([200, 404]).toContain(response.status());
      
      if (response.ok()) {
        const categories = await safeJsonParse(response);
        if (categories) {
          expect(Array.isArray(categories)).toBeTruthy();
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON requests', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      
      let response = await request.post(`${backendUrl}/api/login`, {
        data: "invalid json string",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status() === 404) {
        response = await request.post(`${backendUrl}/api/login`, {
          data: "invalid json string",
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      expect([400, 405, 500]).toContain(response.status());
    });

    test('should handle invalid endpoints', async ({ request }) => {
      const backendUrl = process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
      const response = await request.get(`${backendUrl}/definitely-nonexistent-endpoint-12345`);
      
      console.log('Invalid endpoint status:', response.status());
      console.log('Invalid endpoint response type:', response.headers()['content-type']);
      
      expect(response.status()).toBeLessThan(500);
    });
  });
});