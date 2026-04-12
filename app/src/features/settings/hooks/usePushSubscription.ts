import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import {
    COMPONENT_INTENT,
    NOTIFICATION_CONFIG,
    NOTIFICATION_PERMISSIONS,
} from "@/lib/constants";
import { pushService } from "@/lib/services/push";
import { urlBase64ToUint8Array } from "@/lib/utils/format";

export function usePushSubscription() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    const { t } = useTranslation();
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
            if (permission !== NOTIFICATION_PERMISSIONS.GRANTED) {
                toast({
                    title: t("settings.notifications.notifications"),
                    description: t("settings.notifications.requestDenied"),
                    variant: COMPONENT_INTENT.INFO,
                });
                return;
            }

            const publicVapidKey = import.meta.env[
                NOTIFICATION_CONFIG.VAPID_KEY_ENV
            ];
            if (!publicVapidKey) {
                toast({
                    title: t("settings.notifications.notifications"),
                    description: t("settings.notifications.configError"),
                    variant: COMPONENT_INTENT.ERROR,
                });
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: NOTIFICATION_CONFIG.USER_VISIBLE_ONLY,
                applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
            });

            const saveRes = await pushService.saveSubscription(subscription);

            if (saveRes.isErr()) {
                toast({
                    title: t("settings.notifications.errorSubscription"),
                    description: saveRes.error.message,
                    variant: COMPONENT_INTENT.ERROR,
                });
                await subscription.unsubscribe();
                return;
            }

            setIsSubscribed(true);
            toast({
                title: t("settings.notifications.notifications"),
                description: t("settings.notifications.subscribedSuccess"),
                variant: COMPONENT_INTENT.SUCCESS,
            });
        } catch (e: unknown) {
            toast({
                title: t("settings.notifications.errorSubscription"),
                description: e instanceof Error ? e.message : String(e),
                variant: COMPONENT_INTENT.ERROR,
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
                        title: t("settings.notifications.errorUnsubscription"),
                        description: delRes.error.message,
                        variant: COMPONENT_INTENT.ERROR,
                    });
                }

                await subscription.unsubscribe();
                setIsSubscribed(false);
                toast({
                    title: t("settings.notifications.notifications"),
                    description: t(
                        "settings.notifications.unsubscribedSuccess",
                    ),
                    variant: COMPONENT_INTENT.INFO,
                });
            }
        } catch (e: unknown) {
            toast({
                title: t("settings.notifications.errorUnsubscription"),
                description: e instanceof Error ? e.message : String(e),
                variant: COMPONENT_INTENT.ERROR,
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
