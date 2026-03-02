import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { usePresence } from "@/features/presence";
import { USER_WEB_STATUS } from "@/lib/constants";
import type { PeerUser } from "@/lib/types/room";
import styles from "../roomheader.module.css";

interface RoomHeaderTitleProps {
    /** Отображаемое имя чата */
    displayName: string;
    /** Флаг эфемерного чата */
    isEphemeral?: boolean;
    /** Флаг личного чата */
    isDM: boolean;
    /** Данные собеседника */
    peer?: PeerUser | null;
    /** Количество участников (для групп) */
    membersCount?: number;
    /** Количество участников онлайн (для групп) */
    onlineCount?: number;
    /** Текст индикатора печати */
    typingText?: string | null;
    /** Обработчик клика по заголовку */
    onClick: () => void;
}

/**
 * Компонент текстовой информации в заголовке чата (Имя + Статус).
 */
export function RoomHeaderTitle({
    displayName,
    isEphemeral,
    isDM,
    peer,
    membersCount,
    onlineCount,
    typingText,
    onClick,
}: RoomHeaderTitleProps) {
    const { t } = useTranslation();
    const onlineUsers = usePresence();

    const renderSubtitle = () => {
        if (typingText) {
            return (
                <span className={`${styles.subtitle} ${styles.typingText}`}>
                    {typingText}
                </span>
            );
        }

        if (isDM && peer) {
            return (
                <span className={styles.subtitle}>
                    {onlineUsers[peer.id] === USER_WEB_STATUS.ONLINE ? (
                        <Flex align="center" gap="1">
                            <span className={styles.onlineDot} />
                            <span className={styles.onlineText}>
                                {t("chat.online", "в сети")}
                            </span>
                        </Flex>
                    ) : peer.username ? (
                        `@${peer.username}`
                    ) : (
                        t("chat.offline", "не в сети")
                    )}
                </span>
            );
        }

        if (!isDM && membersCount !== undefined) {
            const onlineText =
                onlineCount !== undefined && onlineCount > 0
                    ? `, ${onlineCount} ${t("chat.online", "в сети")}`
                    : "";

            return (
                <span className={styles.subtitle}>
                    {membersCount} {t("chat.group.membersCount", "участников")}
                    {onlineText}
                </span>
            );
        }

        return null;
    };

    return (
        <Flex
            direction="column"
            gap="0"
            onClick={onClick}
            className={styles.titleArea}
        >
            <h2 className={styles.displayName}>
                {isEphemeral ? "🔒 " : ""}
                {displayName}
            </h2>

            {renderSubtitle()}
        </Flex>
    );
}
