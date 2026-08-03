import { useCallback, useEffect, useState } from "react";
import {
    BROWSER_CONSTANTS,
    PWA_DISPLAY_MODE,
    PWA_EVENTS,
    PWA_PROMPT_OUTCOME,
    STORAGE_CONFIG,
} from "@/lib/constants";

type PwaOutcome = (typeof PWA_PROMPT_OUTCOME)[keyof typeof PWA_PROMPT_OUTCOME];

export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: PwaOutcome;
        platform: string;
    }>;
    prompt(): Promise<void>;
}

declare global {
    interface WindowEventMap {
        [PWA_EVENTS.BEFORE_INSTALL_PROMPT]: BeforeInstallPromptEvent;
    }
}

export function useInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Проверяем, закрывал ли пользователь подсказку
        const dismissed = localStorage.getItem(
            STORAGE_CONFIG.PWA_PROMPT_DISMISSED,
        );
        if (dismissed === "true") {
            return;
        }

        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener(
            PWA_EVENTS.BEFORE_INSTALL_PROMPT,
            handleBeforeInstallPrompt,
        );

        // Проверяем устройство (iOS)
        const isIos =
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !(BROWSER_CONSTANTS.MS_STREAM in window);

        // Проверяем, запущено ли приложение в режиме PWA (standalone)
        const nav = navigator as unknown as { standalone?: boolean };
        const isStandalone =
            nav.standalone === true ||
            window.matchMedia(PWA_DISPLAY_MODE.STANDALONE).matches;

        if (isIos && !isStandalone) {
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener(
                PWA_EVENTS.BEFORE_INSTALL_PROMPT,
                handleBeforeInstallPrompt,
            );
        };
    }, []);

    const dismissPrompt = useCallback(() => {
        localStorage.setItem(STORAGE_CONFIG.PWA_PROMPT_DISMISSED, "true");
        setIsVisible(false);
    }, []);

    const installPrompt = useCallback(async () => {
        if (!deferredPrompt) {
            return;
        }

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === PWA_PROMPT_OUTCOME.ACCEPTED) {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    }, [deferredPrompt]);

    return {
        isVisible,
        isNativePromptReady: deferredPrompt !== null,
        dismissPrompt,
        installPrompt,
    };
}
