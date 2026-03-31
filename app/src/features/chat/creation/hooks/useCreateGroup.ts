import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CHAT_TYPE, QUERY_KEYS, ROUTES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { MOCK_GROUP_AVATARS } from "@/lib/mock/data";
import { RoomService } from "@/lib/services/room";
import { useAuthStore } from "@/stores/auth";

interface UseCreateGroupProps {
    onOpenChange: (open: boolean) => void;
}

/**
 * Хук логики создания группы.
 * Управляет состоянием формы, выбором участников и отправкой запроса через RoomService.
 */
export function useCreateGroup({ onOpenChange }: UseCreateGroupProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { profile: user } = useAuthStore();

    const [groupName, setGroupName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    /**
     * Сброс формы
     */
    const resetState = useCallback(() => {
        setGroupName("");
        setSelectedIds([]);
        setAvatarUrl(null);
    }, []);

    /**
     * Симуляция выбора аватара (заглушка для dev-режима, заменить на загрузку файла)
     */
    const handleAvatarClick = useCallback(() => {
        const random =
            MOCK_GROUP_AVATARS[
                Math.floor(Math.random() * MOCK_GROUP_AVATARS.length)
            ];
        setAvatarUrl(random);
    }, []);

    /**
     * Создание группы через RoomService
     */
    const handleCreateGroup = useCallback(async () => {
        if (selectedIds.length < 2 || !groupName.trim() || !user) {
            return;
        }

        setIsCreating(true);
        try {
            const res = await RoomService.createRoom({
                name: groupName.trim(),
                type: CHAT_TYPE.GROUP,
                myUserId: user.id,
                peerIds: selectedIds,
                avatarUrl,
            });

            if (res.isErr()) {
                logger.error("Ошибка создания группы", res.error);
                toast({
                    title: "Не удалось создать группу",
                    description: res.error.message,
                    variant: "error",
                });
                return;
            }

            const { roomId } = res.value;

            // Инвалидируем кэш списка комнат
            await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.rooms(user.id),
            });

            // Закрываем диалог и переходим в чат
            onOpenChange(false);
            resetState();

            navigate({
                to: ROUTES.CHAT_ROOM,
                params: { roomId },
            });
        } catch (error) {
            logger.error("Непредвиденная ошибка при создании группы", error);
            toast({
                title: "Ошибка создания группы",
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
        onOpenChange,
        navigate,
        avatarUrl,
        resetState,
        toast,
    ]);

    /**
     * Удаление участника из списка выбранных
     */
    const removeParticipant = useCallback((id: string) => {
        setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    }, []);

    /**
     * Обёртка для onOpenChange с сбросом состояния при закрытии
     */
    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            if (!newOpen) {
                resetState();
            }
            onOpenChange(newOpen);
        },
        [onOpenChange, resetState],
    );

    // Минимум 2 участника для группы (помимо создателя)
    const canCreate = selectedIds.length >= 2 && groupName.trim().length > 0;

    return {
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
    };
}
