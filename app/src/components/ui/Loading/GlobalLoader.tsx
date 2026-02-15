import { Button, Flex, Spinner, Text } from "@radix-ui/themes";
import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./loading.module.css";

/** Таймаут до показа сообщения об ошибке (мс) */
const CONNECTION_TIMEOUT_MS = 8000;

/**
 * Премиальный полноэкранный лоадер.
 * Используется ТОЛЬКО для начальной загрузки авторизации.
 * Через 8 секунд показывает сообщение об ошибке с кнопкой retry.
 */
export function GlobalLoader() {
    const { t } = useTranslation();
    const [isTimedOut, setIsTimedOut] = useState(false);

    /** Таймер: если за 8 сек загрузка не завершилась — показываем fallback */
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsTimedOut(true);
        }, CONNECTION_TIMEOUT_MS);

        return () => clearTimeout(timer);
    }, []);

    /** Перезагрузка страницы при таймауте */
    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            className={styles.loaderWrapper}
        >
            {isTimedOut ? (
                /* Состояние таймаута: ошибка связи */
                <>
                    <div className={styles.iconContainer}>
                        <WifiOff className={styles.timeoutIcon} />
                    </div>
                    <Text size="3" weight="medium" align="center">
                        {t(
                            "errors.connectionFailed",
                            "Не удалось подключиться",
                        )}
                    </Text>
                    <Text
                        size="2"
                        color="gray"
                        align="center"
                        className={styles.loadingText}
                    >
                        {t(
                            "errors.checkConnection",
                            "Проверьте подключение к интернету и попробуйте снова",
                        )}
                    </Text>
                    <Button
                        size="3"
                        variant="soft"
                        onClick={handleRetry}
                        mt="4"
                        style={{ cursor: "pointer" }}
                    >
                        <RefreshCw size={16} />
                        {t("errors.retry", "Попробовать снова")}
                    </Button>
                </>
            ) : (
                /* Состояние загрузки: спиннер + текст */
                <>
                    <div className={styles.iconContainer}>
                        <div className={styles.pulseRing} />
                        <Spinner size="3" />
                    </div>
                    <Text size="2" color="gray" className={styles.loadingText}>
                        {t("common.loading", "Загрузка...")}
                    </Text>
                </>
            )}
        </Flex>
    );
}
