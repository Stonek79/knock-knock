import { Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "../IconButton";
import { Text } from "../Text";
import styles from "./styles.module.css";

export function PwaInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Проверяем, закрывал ли пользователь подсказку
        const dismissed = localStorage.getItem("pwa_prompt_dismissed");
        if (dismissed === "true") {
            return;
        }

        // Проверяем устройство (iOS)
        const isIos =
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !("MSStream" in window);

        // Проверяем, запущено ли приложение в режиме PWA (standalone)
        const nav = navigator as unknown as { standalone?: boolean };
        const isStandalone =
            nav.standalone === true ||
            window.matchMedia("(display-mode: standalone)").matches;

        if (isIos && !isStandalone) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("pwa_prompt_dismissed", "true");
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.promptCard}>
                <div className={styles.header}>
                    <Text size="md" weight="bold">
                        Установите приложение
                    </Text>
                    <IconButton
                        onClick={handleDismiss}
                        variant="ghost"
                        size="sm"
                        aria-label="Закрыть"
                    >
                        <X width={16} height={16} />
                    </IconButton>
                </div>
                <div className={styles.content}>
                    <Text size="sm" intent="secondary">
                        Для работы уведомлений и видеозвонков добавьте
                        Knock-Knock на экран «Домой».
                    </Text>
                    <div className={styles.instructions}>
                        <div className={styles.step}>
                            <Text size="sm">1. Нажмите иконку</Text>
                            <Share className={styles.icon} />
                        </div>
                        <div className={styles.step}>
                            <Text size="sm">2. Выберите</Text>
                            <div className={styles.badge}>
                                <Plus width={12} height={12} /> На экран «Домой»
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
