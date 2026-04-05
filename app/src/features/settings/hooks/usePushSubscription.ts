import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { pushService } from "@/lib/services/push";
import { urlBase64ToUint8Array } from "@/lib/utils/format";

export function usePushSubscription() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    const toast = useToast();

    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription =
                    await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (e) {
                console.error("Ошибка проверки подписки:", e);
                setIsSupported(false);
            }
        };

        if ("serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    const subscribe = async () => {
        setIsLoading(true);

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                toast({
                    title: "Внимание",
                    description: "Вы отклонили запрос браузера на уведомления",
                    variant: "info",
                });
                return;
            }

            const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
                toast({
                    title: "Ошибка конфигурации",
                    description:
                        "VITE_VAPID_PUBLIC_KEY отсутствует. Проверьте .env",
                    variant: "error",
                });
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
            });

            const saveRes = await pushService.saveSubscription(subscription);

            if (saveRes.isErr()) {
                toast({
                    title: "Ошибка сервера",
                    description: saveRes.error.message,
                    variant: "error",
                });
                await subscription.unsubscribe();
                return;
            }

            setIsSubscribed(true);
            toast({
                title: "Готово",
                description: "Уведомления успешно включены!",
                variant: "success",
            });
        } catch (e: unknown) {
            toast({
                title: "Ошибка подписки",
                description:
                    e instanceof Error
                        ? e.message
                        : "Неизвестная ошибка подписки",
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribe = async () => {
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                const endpoint = subscription.endpoint;
                const delRes = await pushService.deleteSubscription(endpoint);

                if (delRes.isErr()) {
                    toast({
                        title: "Ошибка отписки на сервере",
                        description: delRes.error.message,
                        variant: "error",
                    });
                }

                await subscription.unsubscribe();
                setIsSubscribed(false);
                toast({
                    title: "Уведомления отключены",
                    variant: "info",
                });
            }
        } catch (e: unknown) {
            toast({
                title: "Ошибка отписки",
                description:
                    e instanceof Error
                        ? e.message
                        : "Неизвестная ошибка отписки",
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isSupported,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    };
}
