import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { createHandlerBoundToURL, getCacheKeyForURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { SW_CACHE_CONSTANTS } from "@/lib/constants";

/**
 * Инициализация правил кэширования в Runtime для Service Worker.
 */
export function setupRuntimeCaching() {
    // 1. Кэширование системных аватарок (StaleWhileRevalidate)
    registerRoute(
        ({ request, url }) => {
            return (
                request.destination === "image" &&
                url.pathname.includes("/api/files/users/")
            );
        },
        new StaleWhileRevalidate({
            cacheName: SW_CACHE_CONSTANTS.AVATARS,
            plugins: [
                new CacheableResponsePlugin({
                    statuses: [0, 200],
                }),
                new ExpirationPlugin({
                    maxEntries: SW_CACHE_CONSTANTS.MAX_AVATARS_ENTRIES,
                    maxAgeSeconds:
                        SW_CACHE_CONSTANTS.MAX_AVATARS_AGE_DAYS * 24 * 60 * 60,
                }),
            ],
        }),
    );

    // 2. Кэширование сторонних шрифтов (CacheFirst)
    registerRoute(
        ({ request }) => request.destination === "font",
        new CacheFirst({
            cacheName: SW_CACHE_CONSTANTS.FONTS,
            plugins: [
                new CacheableResponsePlugin({
                    statuses: [0, 200],
                }),
                new ExpirationPlugin({
                    maxEntries: SW_CACHE_CONSTANTS.MAX_FONTS_ENTRIES,
                    maxAgeSeconds:
                        SW_CACHE_CONSTANTS.MAX_FONTS_AGE_DAYS * 24 * 60 * 60,
                }),
            ],
        }),
    );

    // 3. SPA Navigation Fallback (отдаем index.html при оффлайн-переходах)
    try {
        // Указываем URL для фоллбэка. При использовании injectManifest
        // workbox-precaching умеет отдавать закэшированный index.html
        let fallbackUrl = "/";
        if (!getCacheKeyForURL(fallbackUrl)) {
            fallbackUrl = "index.html";
        }

        if (getCacheKeyForURL(fallbackUrl)) {
            const handler = createHandlerBoundToURL(fallbackUrl);
            const navigationRoute = new NavigationRoute(handler, {
                // Исключаем пути API, чтобы не ломать оффлайн-запросы к PocketBase
                denylist: [/^\/api\//],
            });
            registerRoute(navigationRoute);
        } else {
            console.info(
                "[SW] NavigationRoute не инициализирован: index.html отсутствует в precache (обычно в dev-режиме).",
            );
        }
    } catch (e) {
        console.warn("[SW] Ошибка инициализации NavigationRoute:", e);
    }
}
