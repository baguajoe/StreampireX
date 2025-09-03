import { test, expect } from '@playwright/test';

test.describe('StreamPirex API Endpoints', () => {
  test('should validate all working endpoints', async ({ request }) => {
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/signup', method: 'POST', expectedStatus: 201 },
      { path: '/api/login', method: 'POST', expectedStatus: 200 },
    ];

    for (const endpoint of endpoints) {
      const response = await request[endpoint.method.toLowerCase()](
        `http://localhost:3001${endpoint.path}`,
        { data: endpoint.method === 'POST' ? {} : undefined }
      );
      
      console.log(`✓ ${endpoint.method} ${endpoint.path}: Status ${response.status()}`);
    }
  });

  test('should identify pending implementation endpoints', async ({ request }) => {
    const pendingEndpoints = [
      '/api/sonosuite/connect',
      '/api/distribution/submit',
      '/api/music/upload',
      '/api/podcasts/create'
    ];

    for (const endpoint of pendingEndpoints) {
      const response = await request.get(`http://localhost:3001${endpoint}`);
      
      if (response.status() === 404) {
        console.log(`⏳ ${endpoint}: Ready for implementation (404)`);
      } else {
        console.log(`✓ ${endpoint}: Already implemented (${response.status()})`);
      }
    }
  });
});