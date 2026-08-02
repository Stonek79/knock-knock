import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import type { CreateGroupStep } from "@/lib/constants";
import {
    CHAT_TYPE,
    CREATE_GROUP_STEPS,
    INVITE_EXPIRATION,
    PROFILE_TYPE,
    QUERY_KEYS,
    ROUTES,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { inviteService } from "@/lib/services/invite.service";
import { RoomService } from "@/lib/services/room";
import { useAuthStore } from "@/stores/auth";

interface UseCreateGroupProps {
    onOpenChange: (open: boolean) => void;
}

export function useCreateGroup({ onOpenChange }: UseCreateGroupProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.profile);

    const [step, setStep] = useState<CreateGroupStep>(
        CREATE_GROUP_STEPS.SETTINGS,
    );
    const [groupName, setGroupName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string>("");

    // Настройки для Public аккаунта
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [onlyAdminInvites, setOnlyAdminInvites] = useState(false);

    // Настройки для Private аккаунта
    const [inviteExpiresIn, setInviteExpiresIn] = useState<number>(
        INVITE_EXPIRATION.ONE_DAY,
    );
    const [inviteMaxUses, setInviteMaxUses] = useState<number>(1);

    // Результат
    const [createdInviteToken, setCreatedInviteToken] = useState<string>("");
    const [createdRoomId, setCreatedRoomId] = useState<string>("");

    const [isCreating, setIsCreating] = useState(false);

    const resetState = useCallback(() => {
        setStep(CREATE_GROUP_STEPS.SETTINGS);
        setGroupName("");
        setSelectedIds([]);
        setAvatarUrl("");
        setOnlyAdminInvites(false);
        setInviteExpiresIn(INVITE_EXPIRATION.ONE_DAY);
        setInviteMaxUses(1);
        setCreatedInviteToken("");
        setCreatedRoomId("");
    }, []);

    const handleAvatarClick = useCallback(() => {
        setAvatarUrl(avatarUrl);
    }, [avatarUrl]);

    const handleCreateGroup = useCallback(async () => {
        if (!groupName.trim() || !user) {
            return;
        }

        if (
            user.profile_type === PROFILE_TYPE.PUBLIC &&
            selectedIds.length < 2
        ) {
            return;
        }

        setIsCreating(true);
        try {
            // Для public аккаунта чекбокс управляет видимостью (private/public), для private аккаунта - всегда private
            const visibility =
                user.profile_type === PROFILE_TYPE.PRIVATE || onlyAdminInvites
                    ? PROFILE_TYPE.PRIVATE
                    : PROFILE_TYPE.PUBLIC;

            const res = await RoomService.createRoom({
                name: groupName.trim(),
                type: CHAT_TYPE.GROUP,
                visibility,
                myUserId: user.id,
                peerIds:
                    user.profile_type === PROFILE_TYPE.PUBLIC
                        ? selectedIds
                        : [],
                avatarUrl,
            });

            if (res.isErr()) {
                logger.error(
                    t("chat.errors.createGroupError", "Ошибка создания группы"),
                    res.error,
                );
                toast({
                    title: t(
                        "chat.errors.createGroupFailed",
                        "Не удалось создать группу",
                    ),
                    description: res.error.message,
                    variant: "error",
                });
                return;
            }

            const { roomId } = res.value;

            // Вычисляем срок действия только если выбран лимит времени
            let expires_at: string | undefined;
            if (user.profile_type === PROFILE_TYPE.PRIVATE) {
                const date = new Date();
                date.setSeconds(date.getSeconds() + inviteExpiresIn);
                expires_at = date.toISOString();
            }

            const inviteRes = await inviteService.generateInvite(
                roomId,
                user.id,
                user.profile_type === PROFILE_TYPE.PRIVATE ? inviteMaxUses : 0,
                expires_at,
            );

            if (inviteRes.isErr()) {
                toast({
                    title: t(
                        "chat.errors.inviteCreationFailed",
                        "Группа создана, но не удалось создать инвайт",
                    ),
                    variant: "error",
                });
            } else {
                setCreatedInviteToken(inviteRes.value.token);
            }

            setCreatedRoomId(roomId);
            await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.rooms(user.id),
            });

            setStep(CREATE_GROUP_STEPS.RESULT);
        } catch (error) {
            logger.error(
                t("chat.errors.unexpectedError", "Непредвиденная ошибка"),
                error,
            );
            toast({
                title: t(
                    "chat.errors.createGroupError",
                    "Ошибка создания группы",
                ),
                variant: "error",
            });
        } finally {
            setIsCreating(false);
        }
    }, [
        selectedIds,
        groupName,
        user,
        queryClient,
        avatarUrl,
        toast,
        onlyAdminInvites,
        inviteExpiresIn,
        inviteMaxUses,
        t,
    ]);

    const removeParticipant = useCallback((id: string) => {
        setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    }, []);

    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            if (!newOpen) {
                resetState();
            }
            onOpenChange(newOpen);
        },
        [onOpenChange, resetState],
    );

    const handleFinish = useCallback(() => {
        onOpenChange(false);
        resetState();
        if (createdRoomId) {
            navigate({
                to: ROUTES.CHAT_ROOM,
                params: { roomId: createdRoomId },
            });
        }
    }, [createdRoomId, navigate, onOpenChange, resetState]);

    const canCreatePublic =
        selectedIds.length >= 2 && groupName.trim().length > 0;
    const canCreatePrivate = groupName.trim().length > 0;
    const canCreate =
        user?.profile_type === PROFILE_TYPE.PUBLIC
            ? canCreatePublic
            : canCreatePrivate;

    return {
        step,
        groupName,
        setGroupName,
        avatarUrl,
        handleAvatarClick,
        selectedIds,
        setSelectedIds,
        isCreating,
        handleCreateGroup,
        removeParticipant,
        handleOpenChange,
        canCreate,
        userProfileType: user?.profile_type,
        onlyAdminInvites,
        setOnlyAdminInvites,
        inviteExpiresIn,
        setInviteExpiresIn,
        inviteMaxUses,
        setInviteMaxUses,
        createdInviteToken,
        handleFinish,
    };
}
