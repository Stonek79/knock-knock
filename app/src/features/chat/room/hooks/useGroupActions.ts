import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import { MEMBER_ROLE } from "@/lib/constants";
import { RoomService } from "@/lib/services/room";

interface UseGroupActionsProps {
    roomId: string;
    myUserId?: string;
    // Опциональный callback, который можно вызвать при выходе из комнаты
    // Например, для навигации назад на список чатов
    onLeaveSuccess?: () => void;
}

/**
 * Хук для управления участниками группы (добавление, исключение, роли, выход)
 */
export function useGroupActions({
    roomId,
    myUserId,
    onLeaveSuccess,
}: UseGroupActionsProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Добавление участников (шифруем ключи с помощью roomKey)
    const addMembers = async (newMemberIds: string[], roomKey: CryptoKey) => {
        if (!myUserId) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await RoomService.addMembersToGroup(
                roomId,
                newMemberIds,
                roomKey,
                myUserId,
            );

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            toast({
                title: t("chat.group.membersAdded", "Участники добавлены"),
                variant: "success",
            });
        } catch (error) {
            toast({
                title: t("common.error", "Произошла ошибка"),
                description: String(error),
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Удаление участника из группы (требует прав ADMIN, проверяется на бэке)
    const removeMember = async (userIdToRemove: string) => {
        setIsLoading(true);
        try {
            const result = await RoomService.removeMemberFromGroup(
                roomId,
                userIdToRemove,
            );

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            toast({
                title: t("chat.group.memberRemoved", "Участник удален"),
                variant: "success",
            });
        } catch (error) {
            toast({
                title: t("common.error", "Произошла ошибка"),
                description: String(error),
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Обновление роли участника (требует прав ADMIN)
    const updateRole = async (targetUserId: string, currentRole: string) => {
        setIsLoading(true);
        try {
            const newRole =
                currentRole === MEMBER_ROLE.ADMIN
                    ? MEMBER_ROLE.MEMBER
                    : MEMBER_ROLE.ADMIN;
            const result = await RoomService.updateMemberRole(
                roomId,
                targetUserId,
                newRole,
            );

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            toast({
                title: t("chat.group.roleUpdated", "Роль обновлена"),
                variant: "success",
            });
        } catch (error) {
            toast({
                title: t("common.error", "Произошла ошибка"),
                description: String(error),
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Выход из группы самого текущего пользователя
    const leaveGroup = async () => {
        if (!myUserId) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await RoomService.leaveGroup(roomId, myUserId);

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            toast({
                title: t("chat.group.youLeft", "Вы покинули группу"),
                variant: "success",
            });

            // Вызываем внешний callback, если он передан
            onLeaveSuccess?.();
        } catch (error) {
            toast({
                title: t("common.error", "Произошла ошибка"),
                description: String(error),
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Удаление группы целиком (для создателя)
    const deleteGroup = async () => {
        setIsLoading(true);
        try {
            const result = await RoomService.deleteRoom(roomId);

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            toast({
                title: t("chat.group.deleted", "Группа удалена"),
                variant: "success",
            });

            // Вызываем внешний callback, если он передан
            onLeaveSuccess?.();
        } catch (error) {
            toast({
                title: t("common.error", "Произошла ошибка"),
                description: String(error),
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        addMembers,
        removeMember,
        updateRole,
        leaveGroup,
        deleteGroup,
    };
}
