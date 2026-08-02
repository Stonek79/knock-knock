import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Text } from "@/components/ui/Text";
import { usePresence } from "@/features/presence";
import { USER_WEB_STATUS } from "@/lib/constants";
import type { PeerUser } from "@/lib/types/room";
import styles from "./room-header-title.module.css";

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
                <Text className={`${styles.subtitle} ${styles.typingText}`}>
                    {typingText}
                </Text>
            );
        }

        if (isDM && peer) {
            return (
                <Text className={styles.subtitle}>
                    {onlineUsers[peer.id] === USER_WEB_STATUS.ONLINE ? (
                        <Flex align="center" gap="1" pl="1">
                            <Text className={styles.onlineDot} />
                            <Text className={styles.onlineText}>
                                {t("chat.online", "в сети")}
                            </Text>
                        </Flex>
                    ) : peer.username ? (
                        `@${peer.username}`
                    ) : (
                        t("chat.offline", "не в сети")
                    )}
                </Text>
            );
        }

        if (!isDM && membersCount !== undefined) {
            const onlineText =
                onlineCount !== undefined && onlineCount > 0
                    ? `, ${onlineCount} ${t("chat.online", "в сети")}`
                    : "";

            return (
                <Text className={styles.subtitle}>
                    {membersCount} {t("chat.group.membersCount", "участников")}
                    {onlineText}
                </Text>
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
            <Text as="h2" className={styles.displayName}>
                {isEphemeral ? "🔒 " : ""}
                {displayName}
            </Text>
            {renderSubtitle()}
        </Flex>
    );
}
