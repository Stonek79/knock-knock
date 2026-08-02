/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import {
    FULL_APP_NAME,
    NOTIFICATION_ACTIONS,
    NOTIFICATION_CONFIG,
    PUSH_MESSAGE_TYPE,
    ROUTES,
    SW_ACTION_TITLES,
    SW_FALLBACK_MESSAGES,
} from "@/lib/constants";
import { getRoomMasterKey } from "@/lib/crypto/keystore";
import { decryptMessage } from "@/lib/crypto/messages";
import { setupRuntimeCaching } from "@/lib/pwa/runtime-caching";

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

// Настройка runtime-кэширования (Stage 2: Runtime Caching & Offline Fallback)
setupRuntimeCaching();

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
                typeof data.body === "string"
                    ? data.body
                    : SW_FALLBACK_MESSAGES.NEW_MESSAGE;

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
                                    SW_FALLBACK_MESSAGES.NEW_ENCRYPTED_MESSAGE;
                            } catch {
                                body = decrypted; // Фолбэк для старых сообщений
                            }
                        }
                    } else {
                        console.warn(
                            `[SW] Ключ комнаты ${roomId} не найден в Keystore`,
                        );
                        body = SW_FALLBACK_MESSAGES.NEW_ENCRYPTED_MESSAGE;
                    }
                } catch (e) {
                    console.error(
                        "[SW] Ошибка дешифрации PUSH-уведомления:",
                        e,
                    );
                    body = SW_FALLBACK_MESSAGES.DECRYPTION_ERROR;
                }
            }

            const options: NemoNotificationOptions = {
                body,
                icon: NOTIFICATION_CONFIG.ICON,
                badge: NOTIFICATION_CONFIG.BADGE,
                vibrate: [100, 50, 100],
                data, // передаём данные целиком для использования в notificationclick
                actions: [
                    {
                        action: NOTIFICATION_ACTIONS.OPEN,
                        title: SW_ACTION_TITLES.OPEN,
                    },
                    {
                        action: NOTIFICATION_ACTIONS.CLOSE,
                        title: SW_ACTION_TITLES.CLOSE,
                    },
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
                const isWindowClient = (
                    client: Client,
                ): client is WindowClient => "focus" in client;

                // 1. Пытаемся найти уже открытое окно приложения
                for (const client of clientList) {
                    const isSameOrigin = client.url.includes(location.origin);
                    if (isSameOrigin && isWindowClient(client)) {
                        // Фокусируемся
                        const focusedClient = await client.focus();
                        // Отправляем сообщение для программного перехода без перезагрузки страницы
                        focusedClient.postMessage({
                            type: PUSH_MESSAGE_TYPE.NAVIGATE,
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
