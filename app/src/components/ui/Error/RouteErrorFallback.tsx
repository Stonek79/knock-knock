import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import styles from "./route-error.module.css";

/**
 * Компонент ошибки маршрута.
 * Используется как defaultErrorComponent в TanStack Router.
 * Показывает сообщение об ошибке и кнопку «Повторить».
 */
export function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
    const { t } = useTranslation();
    const router = useRouter();

    /** Повторная попытка: инвалидируем маршрут и сбрасываем ошибку */
    const handleRetry = () => {
        reset();
        router.invalidate();
    };

    /** Извлекаем текст ошибки */
    const errorMessage =
        error instanceof Error
            ? error.message
            : t("errors.unknown", "Произошла непредвиденная ошибка");

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            gap="4"
            className={styles.container}
        >
            {/* Иконка ошибки */}
            <div className={styles.iconWrapper}>
                <AlertTriangle className={styles.icon} />
            </div>

            {/* Заголовок */}
            <Heading size="lg" align="center">
                {t("errors.title", "Что-то пошло не так")}
            </Heading>

            {/* Описание ошибки */}
            <Text
                size="md"
                intent="secondary"
                align="center"
                className={styles.message}
            >
                {errorMessage}
            </Text>

            {/* Кнопка повтора */}
            <Button
                size="md"
                variant="soft"
                onClick={handleRetry}
                className={styles.retryButton}
            >
                <RefreshCw className={styles.buttonIcon} />
                {t("errors.retry", "Попробовать снова")}
            </Button>
        </Flex>
    );
}
