import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { usePresence } from "@/hooks/usePresence";
import { USER_WEB_STATUS } from "@/lib/constants/user";
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
    /** Список имен участников (для групп) */
    memberNames?: string;
    /** Текст индикатора печати */
    typingText?: string | null;
    /** Обработчик клика по заголовку */
    onClick: () => void;
}

/**
 * Компонент текстовой информации в заголовке чата (Имя + Статус).
 * Использует нативные теги вместо Radix Text/Heading.
 */
export function RoomHeaderTitle({
    displayName,
    isEphemeral,
    isDM,
    peer,
    memberNames,
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

        if (memberNames) {
            return (
                <span className={`${styles.subtitle} ${styles.membersList}`}>
                    {memberNames}
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
