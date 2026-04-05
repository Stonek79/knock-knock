/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// workbox-build требует наличия этой переменной для работы injectManifest
const manifest = self.__WB_MANIFEST;
if (manifest) {
    console.log("[ServiceWorker] Precache manifest loaded", manifest.length);
}

interface KnockNotificationOptions extends NotificationOptions {
    vibrate?: number[];
}

// Обработка входящего Push-уведомления
self.addEventListener("push", (event) => {
    if (!event.data) {
        return;
    }

    try {
        const payload = event.data.json();
        console.log("[ServiceWorker] Получен push:", payload);

        // Мы договаривались на Payloadless push, поэтому получаем только roomId
        if (payload.type === "NEW_MESSAGE") {
            const roomId = payload.roomId;

            // ВАЖНО: Пока мы ставим надежную стандартную заглушку E2E.
            // Прикручивать расшифровку базы в фоне (с переносом ключей IndexedDB и вызовом Pocketbase FETCH)
            // мы будем во 2 Фазе, чтобы сделать первую стабильную работоспособную версию уведомлений!

            const options: KnockNotificationOptions = {
                body: "🔒 У вас новое сообщение",
                icon: "/pwa-192x192.png",
                badge: "/pwa-192x192.png",
                data: { url: `/chat/${roomId}` },
                vibrate: [200, 100, 200],
            };

            const notificationPromise = self.registration.showNotification(
                "Knock-Knock",
                options,
            );

            event.waitUntil(notificationPromise);
        }
    } catch (e) {
        console.error("[ServiceWorker] Ошибка обработки пуша:", e);
    }
});

// Логика перехода приложения в чат при клике на всплывшее push-уведомление
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // Определяем URL, переданный в уведомлении
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                // Если вкладка мессенджера уже открыта — фокусируемся на ней
                let matchingClient = null;
                for (const client of windowClients) {
                    if (
                        client.url.includes(urlToOpen) ||
                        client.url.includes(location.origin)
                    ) {
                        matchingClient = client;
                        break;
                    }
                }

                if (matchingClient) {
                    matchingClient.navigate(urlToOpen);
                    return matchingClient.focus();
                } else {
                    // Иначе — открываем свернутое PWA/новую вкладку
                    return self.clients.openWindow(urlToOpen);
                }
            }),
    );
});
