import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import type { PeerUser, RoomWithMembers } from "@/lib/types/room";
import { RoomHeaderActions } from "./components/RoomHeaderActions";
import { RoomHeaderTitle } from "./components/RoomHeaderTitle";
import { useRoomHeaderInfo } from "./hooks/useRoomHeaderInfo";
import styles from "./roomheader.module.css";

interface DefaultHeaderProps {
    /** Данные комнаты */
    room?: RoomWithMembers;
    /** ID комнаты */
    roomId: string;
    /** Данные собеседника (для личных чатов) */
    peerUser?: PeerUser | null;
    /** Колбэк завершения сессии (для эфемерных чатов) */
    onEndSession?: () => void;
    /** Флаг процесса завершения сессии */
    ending?: boolean;
    /** Колбэк возврата назад */
    onBack: () => void;
    /** Список печатающих пользователей */
    typingUsers?: string[];
}

/**
 * Базовый заголовок комнаты чата.
 * Поддерживает отображение личных чатов (собеседник, статус) и групп.
 * Декомпозирован на логику (хук) и мелкие презентационные компоненты.
 */
export function DefaultHeader({
    room,
    peerUser,
    onEndSession,
    ending,
    onBack,
    typingUsers = [],
}: DefaultHeaderProps) {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // Используем хук для вычисления всей информации о комнате
    const { isDM, resolvedPeer, displayName, avatarUrl, memberNames } =
        useRoomHeaderInfo({ room, peerUser });

    console.log(displayName);

    const handleInfoClick = () => {
        if (resolvedPeer?.id) {
            // TODO: Реализовать навигацию в профиль
        }
    };

    /** Формируем текст в зависимости от количества печатающих */
    const getTypingText = (): string | null => {
        if (!typingUsers || typingUsers.length === 0) {
            return null;
        }

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

    const typingText = getTypingText();

    return (
        <header className={styles.roomHeader}>
            <Flex align="center" gap="3" className={styles.leftSection}>
                {isMobile && (
                    <Box
                        className={`${styles.iconButton} ${styles.backButton}`}
                        onClick={onBack}
                    >
                        <ChevronLeft className={styles.backIcon} />
                    </Box>
                )}

                <Flex align="center" gap="3" className={styles.titleArea}>
                    <Avatar size="sm" src={avatarUrl} name={displayName} />

                    <RoomHeaderTitle
                        displayName={displayName}
                        isEphemeral={room?.is_ephemeral}
                        isDM={isDM}
                        peer={resolvedPeer}
                        memberNames={memberNames}
                        onClick={handleInfoClick}
                        typingText={typingText}
                    />
                </Flex>
            </Flex>

            <RoomHeaderActions
                isEphemeral={room?.is_ephemeral}
                onEndSession={onEndSession}
                ending={ending}
            />
        </header>
    );
}
