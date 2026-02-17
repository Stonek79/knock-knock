import { expect, test } from "@playwright/test";

test.describe("Theme Visuals", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/settings");
    });

    test("should switch to Emerald theme and apply correct variables", async ({
        page,
    }) => {
        // Wait for settings to load
        await expect(page.locator("text=Внешний вид")).toBeVisible();

        // Click Emerald option (assuming text "Emerald Luxury" is visible)
        await page.click("text=Emerald Luxury");

        // Check body attribute
        await expect(page.locator("body")).toHaveAttribute(
            "data-theme",
            "emerald",
        );

        // Check computed background style of body
        const bodyBackground = await page.evaluate(() => {
            return window.getComputedStyle(document.body).backgroundImage;
        });

        // Emerald dark mode should have a gradient
        expect(bodyBackground).toContain("linear-gradient");
    });

    test("should switch to Neon theme and apply correct variables", async ({
        page,
    }) => {
        await expect(page.locator("text=Внешний вид")).toBeVisible();

        // Click Neon option
        await page.click("text=Cosmic Neon");

        // Check body attribute
        await expect(page.locator("body")).toHaveAttribute(
            "data-theme",
            "neon",
        );

        // Check computed background style of body
        const bodyBackground = await page.evaluate(() => {
            return window.getComputedStyle(document.body).backgroundImage;
        });

        // Neon dark mode should have a radial gradient
        expect(bodyBackground).toContain("radial-gradient");
    });
});
