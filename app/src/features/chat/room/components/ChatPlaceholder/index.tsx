import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatList } from "@/features/chat/list";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./chat-placeholder.module.css";

/**
 * Компонент-заглушка, который показывается, когда чат не выбран.
 */
export function Placeholder() {
    const { t } = useTranslation();

    return (
        <div className={styles.chatContainer}>
            <div className={styles.emptyIconBox}>
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

/**
 * Индекс страницы /chat.
 * На десктопе: показывает заглушку «Выберите чат» (список в Sidebar).
 * На мобильных: показывает полноценный список чатов (Sidebar отсутствует).
 */
export function ChatPlaceholder() {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // На мобильных показываем список чатов (sidebar отсутствует)
    if (isMobile) {
        return <ChatList />;
    }

    // На десктопе показываем заглушку — список чатов в Sidebar
    return <Placeholder />;
}
