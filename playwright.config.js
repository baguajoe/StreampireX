const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
 testDir: './tests',
 fullyParallel: false,
 forbidOnly: !!process.env.CI,
 retries: process.env.CI ? 2 : 0,
 workers: 1,
 reporter: 'list',
 
 use: {
   baseURL: 'http://localhost:3001/api',
   extraHTTPHeaders: {
     'Accept': 'application/json',
     'Content-Type': 'application/json',
   },
 },

 projects: [
   {
     name: 'api-tests',
     testMatch: '**/api/**/*.spec.js',
   },
   {
     name: 'feature-tests',
     testMatch: '**/features/**/*.spec.js',
     use: {
       baseURL: 'https://studious-space-goggles-r4rp7v96jgr62x5j-3000.app.github.dev',
     },
   },
 ],

 timeout: 30000,
 expect: {
   timeout: 10000,
 },
});