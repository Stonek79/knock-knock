import { Heading, Text } from "@radix-ui/themes";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "../chat-placeholder.module.css";

/**
 * Компонент-заглушка, который показывается, когда чат не выбран.
 */
export function ChatPlaceholder() {
    const { t } = useTranslation();

    return (
        <div className={styles.chatContainer}>
            <div className={styles.emptyIconBox}>
                <MessageCircle size={64} strokeWidth={1.5} />
            </div>
            <Heading size="5" mb="2">
                {t("chat.selectChat", "Выберите чат")}
            </Heading>
            <Text color="gray" size="3" className={styles.placeholderText}>
                {t(
                    "chat.selectChatDesc",
                    "Выберите пользователя из списка слева, чтобы начать общение.",
                )}
            </Text>
        </div>
    );
}
