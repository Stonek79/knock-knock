import { expect, test } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // Adjust this based on actual app title, using 'Vite' or app name for now.
    await expect(page).toHaveTitle(/Vite|App|Messenger/);
});

test('redirects to login', async ({ page }) => {
    await page.goto('/');
    // If not logged in, should redirect to login
    await expect(page.url()).toContain('/login');
});
