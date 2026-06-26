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
    // Пробуем парсить как JSON. Если payload пришёл как plain text (например, при ручном тестировании),
    // читаем его как строку и кладём в поле body, чтобы не крашиться.
    let data: Record<string, unknown> = {};
    try {
        data = event.data?.json() ?? {};
    } catch {
        const rawText = event.data?.text() ?? "";
        if (rawText) {
            data = { body: rawText };
        }
    }
    // Безопасное извлечение строковых полей из данных неизвестного типа
    const title =
        typeof data.title === "string" && data.title
            ? data.title
            : FULL_APP_NAME;
    const body = typeof data.body === "string" ? data.body : "Новое сообщение";

    const options: KnockNotificationOptions = {
        body,
        icon: NOTIFICATION_CONFIG.ICON,
        badge: NOTIFICATION_CONFIG.BADGE,
        vibrate: [100, 50, 100],
        data, // передаём данные целиком для использования в notificationclick
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
