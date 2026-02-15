import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { usePresence } from "@/features/contacts/hooks/usePresence";
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
                <Text size="1" className={styles.typingText} truncate>
                    {typingText}
                </Text>
            );
        }

        if (isDM && peer) {
            return (
                <Text size="1" color="gray" truncate>
                    {onlineUsers[peer.id] === "online" ? (
                        <Flex align="center" gap="1" asChild>
                            <span>
                                <Box className={styles.onlineDot} />
                                {t("chat.online", "в сети")}
                            </span>
                        </Flex>
                    ) : peer.username ? (
                        `@${peer.username}`
                    ) : (
                        t("chat.offline", "не в сети")
                    )}
                </Text>
            );
        }

        if (memberNames) {
            return (
                <Text
                    size="1"
                    color="gray"
                    truncate
                    className={styles.membersList}
                >
                    {memberNames}
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
            <Heading size="3" truncate className={styles.displayName}>
                {isEphemeral ? "🔒 " : ""}
                {displayName}
            </Heading>

            {renderSubtitle()}
        </Flex>
    );
}
