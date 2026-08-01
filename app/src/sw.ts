/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import {
    FULL_APP_NAME,
    NOTIFICATION_ACTIONS,
    NOTIFICATION_CONFIG,
    ROUTES,
} from "@/lib/constants";
import { getRoomMasterKey } from "@/lib/crypto/keystore";
import { decryptMessage } from "@/lib/crypto/messages";

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

interface NemoNotificationAction {
    action: string;
    title: string;
    icon?: string;
}

interface NemoNotificationOptions extends NotificationOptions {
    vibrate?: number[];
    data?: unknown;
    actions?: NemoNotificationAction[];
}

/**
 * Обработка входящих PUSH-уведомлений
 */
self.addEventListener("push", (event) => {
    if (!self.registration) {
        return;
    }

    event.waitUntil(
        (async () => {
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

            // Безопасное извлечение строковых полей
            const title =
                typeof data.title === "string" && data.title
                    ? data.title
                    : FULL_APP_NAME;
            let body =
                typeof data.body === "string" ? data.body : "Новое сообщение";

            // Дешифрация Blind Push
            const roomId =
                typeof data.roomId === "string" ? data.roomId : undefined;
            const content =
                typeof data.content === "string" ? data.content : undefined;
            const iv = typeof data.iv === "string" ? data.iv : undefined;

            if (roomId && content && iv) {
                try {
                    const roomKey = await getRoomMasterKey(roomId);
                    if (roomKey) {
                        const decrypted = await decryptMessage(
                            content,
                            iv,
                            roomKey,
                        );
                        if (decrypted) {
                            try {
                                const parsed = JSON.parse(decrypted);
                                body =
                                    parsed.text ||
                                    "Новое зашифрованное сообщение";
                            } catch {
                                body = decrypted; // Фолбэк для старых сообщений
                            }
                        }
                    } else {
                        console.warn(
                            `[SW] Ключ комнаты ${roomId} не найден в Keystore`,
                        );
                        body = "Новое зашифрованное сообщение";
                    }
                } catch (e) {
                    console.error(
                        "[SW] Ошибка дешифрации PUSH-уведомления:",
                        e,
                    );
                    body = "Новое сообщение (ошибка дешифрации)";
                }
            }

            const options: NemoNotificationOptions = {
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
            await self.registration.showNotification(title, options);
        })(),
    );
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
