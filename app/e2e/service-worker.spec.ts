import { expect, test } from "@playwright/test";

test("регистрирует Service Worker для offline/background sync", async ({
    page,
}) => {
    await page.goto("/");

    const registration = await page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) {
            return null;
        }

        const ready = await navigator.serviceWorker.ready;
        return {
            scope: ready.scope,
            scriptURL: ready.active?.scriptURL ?? null,
        };
    });

    expect(registration).not.toBeNull();
    expect(registration?.scope).toMatch(/\/$/);
    expect(registration?.scriptURL).toContain("sw.js");
});

test("поддерживает регистрацию sync-outbox", async ({ page }, testInfo) => {
    await page.goto("/");

    const supported = await page.evaluate(async () => {
        const ready = await navigator.serviceWorker.ready;
        const sync = (
            ready as ServiceWorkerRegistration & {
                sync?: { register: (tag: string) => Promise<void> };
            }
        ).sync;

        if (!sync) {
            return {
                supported: false,
                reason: "Background Sync API отсутствует",
            };
        }

        try {
            await sync.register("sync-outbox");
            return { supported: true, reason: "" };
        } catch (error) {
            return {
                supported: false,
                reason: error instanceof Error ? error.message : String(error),
            };
        }
    });

    testInfo.skip(
        !supported.supported,
        supported.reason || "Background Sync недоступен в браузере",
    );
});
