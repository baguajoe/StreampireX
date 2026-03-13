import { test, expect } from '@playwright/test';

test('verify radio station navigation', async ({ page }) => {
    // 1. Go to the Browse page
    await page.goto('http://localhost:3000/radio-stations');

    // 2. Find all radio station cards
    const cards = page.locator('.radio-card');
    const count = await cards.count();
    console.log(`Found ${count} stations to check.`);

    for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const href = await card.getAttribute('href');
        
        console.log(`Checking link: ${href}`);

        // Click the card
        await card.click();

        // 3. Verify the URL matches the Route defined in layout.js
        // If layout.js expects /radio-station/:id, this will fail if href is /radio/station/:id
        expect(page.url()).toContain(href);

        // Go back to check the next one
        await page.goBack();
        await page.waitForSelector('.radio-card');
    }
});