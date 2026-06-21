/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import {
    FULL_APP_NAME,
    NOTIFICATION_ACTIONS,
    NOTIFICATION_CONFIG,
    ROUTES,
} from "@/lib/constants";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};
clientsClaim();

// workbox-build требует наличия этой переменной для работы injectManifest
const manifest = self.__WB_MANIFEST;
if (manifest) {
    console.log("[ServiceWorker] Precache manifest loaded", manifest.length);
}

precacheAndRoute(manifest);

interface KnockNotificationAction {
    action: string;
    title: string;
    icon?: string;
}

interface KnockNotificationOptions extends NotificationOptions {
    vibrate?: number[];
    actions?: KnockNotificationAction[];
}

/**
 * Обработка входящих PUSH-уведомлений
 */
self.addEventListener("push", (event) => {
    if (!self.registration) {
        return;
    }
    const data = event.data?.json() ?? {};
    const title = data.title || FULL_APP_NAME;
    const options: KnockNotificationOptions = {
        body: data.body || "Новое сообщение",
        icon: NOTIFICATION_CONFIG.ICON,
        badge: NOTIFICATION_CONFIG.BADGE,
        vibrate: [100, 50, 100],
        data: data || {}, // передаем данные целиком
        actions: [
            { action: NOTIFICATION_ACTIONS.OPEN, title: "Открыть" },
            { action: NOTIFICATION_ACTIONS.CLOSE, title: "Закрыть" },
        ],
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Обработка клика по уведомлению
 */
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    // Если нажата кнопка "Закрыть" - просто выходим
    if (event.action === NOTIFICATION_ACTIONS.CLOSE) {
        return;
    }

    // Получаем roomId из data
    const roomId = event.notification.data?.roomId;
    const urlToOpen = roomId ? `/chat/${roomId}` : ROUTES.HOME;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(async (clientList) => {
                // 1. Пытаемся найти уже открытое окно приложения
                for (const client of clientList) {
                    const isSameOrigin = client.url.includes(location.origin);
                    if (isSameOrigin && "focus" in client) {
                        // Фокусируемся
                        const focusedClient = await (
                            client as WindowClient
                        ).focus();
                        // Отправляем сообщение для программного перехода без перезагрузки страницы
                        focusedClient.postMessage({
                            type: "NAVIGATE",
                            url: urlToOpen,
                        });
                        return focusedClient;
                    }
                }
                // 2. Если окна нет - открываем новое
                if (self.clients.openWindow) {
                    return self.clients.openWindow(urlToOpen);
                }
                return null;
            }),
    );
});
