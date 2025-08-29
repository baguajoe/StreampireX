// tests/global-setup.js
async function globalSetup() {
  console.log('🧪 Starting global setup...');
  
  // Wait for both servers to be ready
  const maxWaitTime = 120000; // 2 minutes
  const checkInterval = 2000; // 2 seconds
  let waitTime = 0;
  
  // Check if React dev server is ready
  while (waitTime < maxWaitTime) {
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ React dev server is ready');
        break;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitTime += checkInterval;
    
    if (waitTime >= maxWaitTime) {
      throw new Error('❌ React dev server failed to start within timeout');
    }
  }
  
  // Reset wait time for Flask server
  waitTime = 0;
  
  // Check if Flask API server is ready
  while (waitTime < maxWaitTime) {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        console.log('✅ Flask API server is ready');
        break;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitTime += checkInterval;
    
    if (waitTime >= maxWaitTime) {
      console.log('⚠️ Flask API server not responding - tests may fail');
      break; // Don't fail completely, some tests might still work
    }
  }
  
  console.log('🚀 Global setup complete');
}

module.exports = globalSetup;