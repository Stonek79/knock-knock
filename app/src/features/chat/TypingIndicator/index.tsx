/**
 * Компонент индикатора "печатает..." в чате.
 *
 * Отображает анимированные точки и имя печатающего пользователя.
 * Плавно появляется/исчезает при изменении состояния.
 */
import { Box, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import styles from "./typing.module.css";

interface TypingIndicatorProps {
    /** Список имён пользователей, которые сейчас печатают */
    typingUsers: string[];
}

/**
 * Визуальный индикатор печати.
 * Показывает анимированные точки и текст "Имя печатает..."
 */
export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    const { t } = useTranslation();
    const isVisible = typingUsers.length > 0;

    /** Формируем текст в зависимости от количества печатающих */
    const getTypingText = (): string => {
        if (typingUsers.length === 1) {
            return t("chat.typing.one", "{{name}} печатает...", {
                name: typingUsers[0],
            });
        }
        if (typingUsers.length === 2) {
            return t("chat.typing.two", "{{name1}} и {{name2}} печатают...", {
                name1: typingUsers[0],
                name2: typingUsers[1],
            });
        }
        return t("chat.typing.many", "Несколько участников печатают...");
    };

    return (
        <Box
            className={`${styles.container} ${isVisible ? styles.visible : ""}`}
        >
            {/* Анимированные точки */}
            <div className={styles.dots}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
            </div>

            {/* Текст */}
            {isVisible && (
                <Text className={styles.text}>{getTypingText()}</Text>
            )}
        </Box>
    );
}
