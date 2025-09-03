// tests/global-setup.js - Updated version
import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting StreamPirex test environment...');
  
  // Create test browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for backend to be ready with timeout
    console.log('🔄 Waiting for backend server...');
    
    let backendReady = false;
    const maxRetries = 30; // 30 seconds
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto('http://localhost:3001', { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        backendReady = true;
        console.log('✅ Backend server is ready');
        break;
      } catch (error) {
        console.log(`⏳ Backend not ready, waiting... (${i + 1}/${maxRetries})`);
        await page.waitForTimeout(1000);
      }
    }

    if (!backendReady) {
      console.log('⚠️ Backend server not ready, tests may fail');
    }

    // Wait for frontend to be ready
    console.log('🔄 Waiting for frontend server...');
    
    let frontendReady = false;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto('http://localhost:3000', { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        frontendReady = true;
        console.log('✅ Frontend server is ready');
        break;
      } catch (error) {
        console.log(`⏳ Frontend not ready, waiting... (${i + 1}/${maxRetries})`);
        await page.waitForTimeout(1000);
      }
    }

    if (!frontendReady) {
      console.log('⚠️ Frontend server not ready, tests may fail');
    }

    // Create test users if backend is available
    if (backendReady) {
      await createTestUsers(page);
    }
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function createTestUsers(page) {
  console.log('👥 Creating test users...');
  
  const testUsers = [
    {
      email: 'streampirex.test@example.com',
      password: 'TestPass123!',
      username: 'streampirex_tester',
      role: 'creator'
    },
    {
      email: 'sonosuite.test@example.com', 
      password: 'TestPass123!',
      username: 'sonosuite_tester',
      role: 'creator'
    },
    {
      email: 'dual.login.test@example.com',
      password: 'TestPass123!', 
      username: 'dual_login_tester',
      role: 'creator'
    }
  ];

  for (const user of testUsers) {
    try {
      const response = await page.request.post('http://localhost:3001/register', {
        data: user,
        timeout: 10000
      });
      
      if (response.ok()) {
        console.log(`✅ Created test user: ${user.email}`);
      } else if (response.status() === 400) {
        console.log(`ℹ️ Test user already exists: ${user.email}`);
      } else {
        console.log(`⚠️ Failed to create user ${user.email}: ${response.status()}`);
      }
    } catch (error) {
      console.log(`⚠️ Failed to create user ${user.email}:`, error.message);
    }
  }
}

export default globalSetup;