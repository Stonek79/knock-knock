import { useTranslation } from "react-i18next";
import { ROOM_TYPE } from "@/lib/constants";
import type { PeerUser, RoomWithMembers } from "@/lib/types/room";
import { useAuthStore } from "@/stores/auth";

interface UseRoomHeaderInfoProps {
    room?: RoomWithMembers;
    peerUser?: PeerUser | null;
}

/**
 * Хук для вычисления информации о комнате чата.
 * Обрабатывает логику имен, аватаров и участников для разных типов комнат.
 */
export function useRoomHeaderInfo({ room, peerUser }: UseRoomHeaderInfoProps) {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    const isDM = room?.type === ROOM_TYPE.DIRECT;
    const isGroup = room?.type === ROOM_TYPE.GROUP;

    // Разрешение собеседника для личных чатов, если он не передан
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

    // Чат с самим собой (Избранное)
    const isSelfChat =
        isDM &&
        room?.room_members?.length === 1 &&
        room.room_members[0].user_id === user?.id;

    // Вычисление отображаемого имени
    const displayName = isSelfChat
        ? t("chat.favorites", "Избранное")
        : isDM && resolvedPeer
          ? resolvedPeer.display_name
          : room?.name || t("chat.unknownRoom", "Чат");

    // Вычисление аватара
    const avatarFallback = isSelfChat
        ? "⭐"
        : displayName?.[0]?.toUpperCase() || "?";
    const avatarUrl =
        (isDM ? resolvedPeer?.avatar_url : room?.avatar_url) ?? undefined;

    // Список имен участников для групп
    const memberNames =
        isGroup && room?.room_members
            ? room.room_members
                  .map((m) => m.profiles?.display_name)
                  .filter(Boolean)
                  .join(", ")
            : "";

    return {
        isDM,
        isGroup,
        isSelfChat,
        resolvedPeer,
        displayName,
        avatarUrl,
        avatarFallback,
        memberNames,
    };
}
