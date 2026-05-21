import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useTypingIndicator } from "@/features/chat/message";
import { useGroupPresence } from "@/features/presence/hooks/useGroupPresence";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ROOM_TYPE } from "@/lib/constants";
import { useChatPeer } from "../../../../hooks/useChatPeer";
import { useChatRoomActions } from "../../../../hooks/useChatRoomActions";
import { useChatRoomData } from "../../../../hooks/useChatRoomData";
import { useChatRoomStore } from "../../../../store";
import { useRoomHeaderInfo } from "../../hooks/useRoomHeaderInfo";
import rootStyles from "../../roomheader.module.css";
import { RoomHeaderActions } from "../RoomHeaderActions";
import { RoomHeaderTitle } from "../RoomHeaderTitle";
import styles from "./default-header.module.css";

interface DefaultHeaderProps {
    /** ID комнаты */
    roomId: string;
}

/**
 * Базовый заголовок комнаты чата.
 * Запрашивает необходимые данные по roomId.
 */
export function DefaultHeader({ roomId }: DefaultHeaderProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // 1. Запрашиваем данные комнаты
    const { data: roomInfo } = useChatRoomData(roomId);
    const room = roomInfo?.room;
    const otherUserId = roomInfo?.otherUserId;
    const { data: peerUser } = useChatPeer(otherUserId, room?.type);

    // 2. Индикатор печати
    const { typingUsers } = useTypingIndicator({ roomId });

    // 3. Состояние и экшены из стора
    const setShowEndSessionDialog = useChatRoomStore(
        (s) => s.setShowEndSessionDialog,
    );
    const setShowGroupInfoPanel = useChatRoomStore(
        (s) => s.setShowGroupInfoPanel,
    );
    const { ending } = useChatRoomActions(roomId);

    const { isDM, resolvedPeer, displayName, avatarUrl, isGroup } =
        useRoomHeaderInfo({ room, peerUser });

    const memberIds = room?.room_members?.map((m) => m.user_id) ?? [];
    const presence = useGroupPresence(isGroup ? memberIds : []);

    const toast = useToast();

    const handleBack = () => {
        router.history.back();
    };

    const handleInfoClick = () => {
        if (isDM && resolvedPeer?.id) {
            toast({
                title: t(
                    "profile.notImplemented",
                    "Просмотр профиля пока недоступен",
                ),
                variant: "info",
            });
        } else if (!isDM) {
            setShowGroupInfoPanel(true);
        }
    };

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
        <header className={rootStyles.roomHeader}>
            <Flex align="center" gap="3" className={styles.leftSection}>
                {isMobile && (
                    <Box
                        className={`${styles.iconButton} ${styles.backButton}`}
                        onClick={handleBack}
                    >
                        <ChevronLeft className={styles.backIcon} />
                    </Box>
                )}

                <Flex
                    align="center"
                    gap="2"
                    onClick={handleInfoClick}
                    className={styles.infoWrapper}
                >
                    <Avatar size="sm" src={avatarUrl} name={displayName} />

                    <RoomHeaderTitle
                        displayName={displayName}
                        isEphemeral={room?.type === ROOM_TYPE.EPHEMERAL}
                        isDM={isDM}
                        peer={resolvedPeer}
                        membersCount={
                            isGroup ? room?.room_members?.length : undefined
                        }
                        onlineCount={isGroup ? presence.onlineCount : undefined}
                        onClick={handleInfoClick}
                        typingText={typingText}
                    />
                </Flex>
            </Flex>

            <RoomHeaderActions
                isEphemeral={room?.type === ROOM_TYPE.EPHEMERAL}
                onEndSession={() => setShowEndSessionDialog(true)}
                ending={ending}
                onInfoClick={isGroup ? handleInfoClick : undefined}
            />
        </header>
    );
}
