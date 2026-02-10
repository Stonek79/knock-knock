import { Avatar, Box, Flex, Heading, Text } from "@radix-ui/themes";
import { ChevronLeft, Phone, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import { ROOM_TYPE } from "@/lib/constants";
import type { RoomWithMembers } from "@/lib/types/room";
import { useAuthStore } from "@/stores/auth";
import styles from "./roomheader.module.css";

interface PeerUser {
    id: string;
    display_name: string;
    username?: string;
    avatar_url?: string;
}

interface DefaultHeaderProps {
    room?: RoomWithMembers;
    roomId: string;
    peerUser?: PeerUser | null;
    onEndSession?: () => void;
    /** Флаг загрузки при завершении сессии */
    ending?: boolean;
    onBack: () => void;
}

export function DefaultHeader({
    room,
    peerUser,
    onEndSession,
    ending,
    onBack,
}: DefaultHeaderProps) {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
    const { user } = useAuthStore();

    const handleInfoClick = () => {
        if (peerUser?.id) {
            console.log("Navigate to contact profile:", peerUser.id);
        }
    };

    const isDM = room?.type === ROOM_TYPE.DIRECT;
    const isGroup = room?.type === ROOM_TYPE.GROUP;

    let resolvedPeer = peerUser;
    if (isDM && !resolvedPeer && room?.room_members && user) {
        const otherMember = room.room_members.find(
            (m) => m.user_id !== user.id,
        );
        if (otherMember?.profiles) {
            resolvedPeer = {
                id: otherMember.user_id,
                display_name: otherMember.profiles.display_name,
                username: otherMember.profiles.username,
                avatar_url: otherMember.profiles.avatar_url || undefined,
            };
        }
    }

    const isSelfChat =
        isDM &&
        room?.room_members?.length === 1 &&
        room.room_members[0].user_id === user?.id;

    const displayName = isSelfChat
        ? t("chat.favorites", "Избранное")
        : isDM && resolvedPeer
          ? resolvedPeer.display_name
          : room?.name || t("chat.unknownRoom", "Чат");

    const avatarFallback = isSelfChat
        ? "⭐"
        : displayName?.[0]?.toUpperCase() || "?";
    const avatarUrl = isDM ? resolvedPeer?.avatar_url : room?.avatar_url;

    const memberNames =
        isGroup && room?.room_members
            ? room.room_members
                  .map((m) => m.profiles?.display_name)
                  .filter(Boolean)
                  .join(", ")
            : "";

    return (
        <header className={styles.roomHeader}>
            <Flex align="center" gap="3" className={styles.leftSection}>
                {isMobile && (
                    <Box
                        className={`${styles.iconButton} ${styles.backButton}`}
                        onClick={onBack}
                    >
                        <ChevronLeft size={26} />
                    </Box>
                )}

                <Flex
                    align="center"
                    gap="3"
                    className={styles.titleArea}
                    onClick={handleInfoClick}
                >
                    <Avatar
                        src={avatarUrl ?? undefined}
                        fallback={avatarFallback}
                        radius="full"
                        size="2"
                        color="gray"
                    />
                    <Flex direction="column" gap="0">
                        <Heading
                            size="3"
                            truncate
                            className={styles.displayName}
                        >
                            {room?.is_ephemeral ? "🔒 " : ""}
                            {displayName}
                        </Heading>
                        {isDM && resolvedPeer?.username && (
                            <Text size="1" color="gray" truncate>
                                @{resolvedPeer.username}
                            </Text>
                        )}
                        {isGroup && memberNames && (
                            <Text
                                size="1"
                                color="gray"
                                truncate
                                className={styles.membersList}
                            >
                                {memberNames}
                            </Text>
                        )}
                    </Flex>
                </Flex>
            </Flex>

            <Flex align="center" gap="1">
                <Button
                    variant="ghost"
                    color="gray"
                    className={styles.actionButton}
                >
                    <Phone size={20} />
                </Button>
                <Button
                    variant="ghost"
                    color="gray"
                    className={styles.actionButton}
                >
                    <Video size={20} />
                </Button>

                {room?.is_ephemeral && onEndSession && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEndSession}
                        disabled={ending}
                        className={styles.endSessionButton}
                    >
                        <Trash2 size={16} />
                        {t("chat.endSession")}
                    </Button>
                )}
            </Flex>
        </header>
    );
}
