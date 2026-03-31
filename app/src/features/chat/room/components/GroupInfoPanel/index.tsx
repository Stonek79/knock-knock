import { ChevronLeft, LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { useGroupPresence } from "@/features/presence";
import { MEMBER_ROLE } from "@/lib/constants";
import type { ExpandedRoomMember, RoomWithMembers } from "@/lib/types";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useGroupActions } from "../../hooks/useGroupActions";
import { AddMemberDialog } from "./components/AddMemberDialog";
import { GroupInfoHeader } from "./components/GroupInfoHeader";
import { GroupMembersList } from "./components/GroupMembersList";
import styles from "./groupinfopanel.module.css";

interface GroupInfoPanelProps {
    /** Открыта ли панель */
    isOpen: boolean;
    /** Callback изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
    /** Данные комнаты с участниками */
    room: RoomWithMembers | undefined;
    /** Ключ комнаты для шифрования (нужен при добавлении) */
    roomKey?: CryptoKey;
    /** ID текущего авторизованного пользователя */
    myUserId: string | undefined;
    /** Callback при успешном выходе из группы */
    onLeaveGroupSuccess?: () => void;
}

/**
 * Боковая панель с подробной информацией о групповом чате.
 *
 * - Десктоп: фиксированная панель справа.
 * - Мобилка: drawer, выезжающий снизу.
 *
 * Содержит: шапку группы, список участников с управлением (для администраторов)
 * и кнопку выхода из группы.
 */
export function GroupInfoPanel({
    isOpen,
    onOpenChange,
    room,
    roomKey,
    myUserId,
    onLeaveGroupSuccess,
}: GroupInfoPanelProps) {
    const { t } = useTranslation();

    // Состояние диалогов
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    // Подключаем хук действий над участниками
    const { removeMember, updateRole, leaveGroup, deleteGroup, isLoading } =
        useGroupActions({
            roomId: room?.id ?? "",
            myUserId,
            onLeaveSuccess: () => {
                setShowLeaveConfirm(false);
                setShowDeleteConfirm(false);
                onOpenChange(false); // Закрываем панель
                onLeaveGroupSuccess?.();
            },
        });

    const rawMembers = room?.room_members ?? [];
    const members: ExpandedRoomMember[] = rawMembers.map((rm) => {
        const profile = rm.profiles
            ? {
                  ...rm.profiles,
                  display_name:
                      rm.profiles.display_name ||
                      t("chat.defaultUserName", "Пользователь"),
              }
            : null;

        return {
            ...rm,
            profiles: profile,
        };
    });

    const memberIds = members.map((m) => m.user_id);
    const presence = useGroupPresence(memberIds);

    const myMember = members.find((m) => m.user_id === myUserId);
    const isAdmin = myMember?.role === MEMBER_ROLE.ADMIN;

    // Определяем создателя (того, кто вступил первым)
    const sortedMembers = [...members].sort(
        (a, b) =>
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
    );
    const creator = sortedMembers[0];
    const isCreator = creator?.user_id === myUserId;

    if (!room) {
        return null;
    }

    // --- Обработчики списка участников ---

    const handleAddMember = () => {
        setShowAddMember(true);
    };

    const handleRemoveMember = (userId: string) => {
        if (!isAdmin) {
            return;
        }
        if (
            confirm(
                t(
                    "chat.group.confirmRemove",
                    "Удалить пользователя из группы?",
                ),
            )
        ) {
            removeMember(userId);
        }
    };

    const handleUpdateRole = (userId: string, currentRole: string) => {
        if (!isAdmin) {
            return;
        }
        updateRole(userId, currentRole);
    };

    const handleConfirmLeave = () => {
        leaveGroup();
    };

    const handleConfirmDelete = () => {
        deleteGroup();
    };

    return (
        <>
            {/* Диалог подтверждения выхода */}
            <Dialog.Root
                open={showLeaveConfirm}
                onOpenChange={setShowLeaveConfirm}
            >
                <Dialog.Content>
                    <Dialog.Title>
                        {t("chat.group.leaveConfirmTitle", "Покинуть группу?")}
                    </Dialog.Title>
                    <Dialog.Description>
                        {t(
                            "chat.group.leaveConfirmDesc",
                            "Вы больше не будете получать сообщения из этой группы. История переписки сохранится на вашем устройстве.",
                        )}
                    </Dialog.Description>
                    <Flex
                        gap="3"
                        justify="end"
                        className={styles.confirmActions}
                    >
                        <Button
                            variant="outline"
                            intent="neutral"
                            onClick={() => setShowLeaveConfirm(false)}
                            disabled={isLoading}
                        >
                            {t("common.cancel", "Отмена")}
                        </Button>
                        <Button
                            variant="solid"
                            intent="danger"
                            onClick={handleConfirmLeave}
                            disabled={isLoading}
                        >
                            {t("chat.group.leave", "Покинуть")}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Диалог подтверждения удаления */}
            <Dialog.Root
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
            >
                <Dialog.Content>
                    <Dialog.Title>
                        {t("chat.group.deleteConfirmTitle", "Удалить группу?")}
                    </Dialog.Title>
                    <Dialog.Description>
                        {t(
                            "chat.group.deleteConfirmDesc",
                            "Группа будет удалена навсегда, вместе со всей историей переписки для всех участников.",
                        )}
                    </Dialog.Description>
                    <Flex
                        gap="3"
                        justify="end"
                        className={styles.confirmActions}
                    >
                        <Button
                            variant="outline"
                            intent="neutral"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isLoading}
                        >
                            {t("common.cancel", "Отмена")}
                        </Button>
                        <Button
                            variant="solid"
                            intent="danger"
                            onClick={handleConfirmDelete}
                            disabled={isLoading}
                        >
                            {t("chat.group.delete", "Удалить")}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Диалог добавления участников (Contact Picker) */}
            <AddMemberDialog
                roomId={room.id}
                roomKey={roomKey}
                myUserId={myUserId}
                open={showAddMember}
                onOpenChange={setShowAddMember}
                currentMemberIds={memberIds}
            />

            {/* Основная панель настроек */}
            <Box
                className={`${styles.panelContainer} ${isOpen ? styles.isOpen : ""}`}
            >
                {/* Шапка панели */}
                <Flex
                    className={styles.header}
                    align="center"
                    justify="between"
                >
                    <Flex align="center" gap="2">
                        <IconButton
                            aria-label={t("common.back", "Назад")}
                            variant="ghost"
                            intent="neutral"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className={styles.backButton}
                        >
                            <ChevronLeft size={ICON_SIZE.md} />
                        </IconButton>
                        <h2 className={styles.title}>
                            {t("chat.group.info", "Информация о группе")}
                        </h2>
                    </Flex>
                </Flex>

                {/* Содержимое */}
                <Box className={styles.scrollArea}>
                    <GroupInfoHeader
                        name={room.name}
                        avatarUrl={room.avatar_url ?? null}
                        membersCount={members.length}
                        onlineCount={presence.onlineCount}
                    />

                    <GroupMembersList
                        members={members}
                        myUserId={myUserId}
                        isAdmin={isAdmin}
                        onlineStatusMap={presence.onlineStatusMap}
                        onAddMember={handleAddMember}
                        onUpdateRole={handleUpdateRole}
                        onRemove={handleRemoveMember}
                    />
                    {/* Action-бар */}
                    <Box className={styles.actions}>
                        {isCreator ? (
                            <Button
                                variant="outline"
                                intent="danger"
                                className={styles.leaveButton}
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isLoading}
                            >
                                <LogOut size={ICON_SIZE.sm} />
                                {t("chat.group.delete", "Удалить группу")}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                intent="danger"
                                className={styles.leaveButton}
                                onClick={() => setShowLeaveConfirm(true)}
                                disabled={isLoading}
                            >
                                <LogOut size={ICON_SIZE.sm} />
                                {t("chat.group.leave", "Выйти из группы")}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </>
    );
}
