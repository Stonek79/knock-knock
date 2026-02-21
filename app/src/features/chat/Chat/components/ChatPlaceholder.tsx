import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "../chat-placeholder.module.css";

/**
 * Компонент-заглушка, который показывается, когда чат не выбран.
 */
export function ChatPlaceholder() {
    const { t } = useTranslation();

    return (
        <div className={styles.chatContainer}>
            <div className={styles.emptyIconBox}>
                {/* ICON_SIZE.xl = 48px — числовое значение, SVG-атрибут работает корректно */}
                <MessageCircle size={ICON_SIZE.xl} strokeWidth={1.5} />
            </div>
            <h2 className={styles.placeholderTitle}>
                {t("chat.selectChat", "Выберите чат")}
            </h2>
            <p className={styles.placeholderText}>
                {t(
                    "chat.selectChatDesc",
                    "Выберите пользователя из списка слева, чтобы начать общение.",
                )}
            </p>
        </div>
    );
}
