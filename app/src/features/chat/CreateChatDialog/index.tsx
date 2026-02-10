import { Button, Callout, Dialog, Flex, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateDM } from "@/features/chat/hooks/useCreateDM";
import {
    ContactPicker,
    useSelectedContacts,
} from "@/features/contacts/ContactPicker";
import { useAuthStore } from "@/stores/auth";

interface CreateChatDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Callback изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
    /** Приватный чат или обычный */
    isPrivate?: boolean;
}

/**
 * Диалог создания личного или приватного чата.
 * Позволяет выбрать контакт для начала переписки.
 *
 * Использует useCreateDM для атомарного создания чата без редиректов-посредников.
 *
 * @see https://www.radix-ui.com/themes/docs/components/dialog
 */
export function CreateChatDialog({
    open,
    onOpenChange,
    isPrivate = false,
}: CreateChatDialogProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const createDM = useCreateDM();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const selectedContacts = useSelectedContacts(selectedIds);

    /**
     * Обработчик создания чата.
     * Создаёт комнату (или находит существующую) и сразу переходит в неё.
     */
    const handleCreateChat = useCallback(async () => {
        if (selectedIds.length === 0 || !user) {
            return;
        }

        const targetUserId = selectedIds[0];
        setError(null);

        try {
            const roomId = await createDM.mutateAsync({
                currentUserId: user.id,
                targetUserId,
                isPrivate,
            });

            // Закрываем диалог и сбрасываем выбор
            onOpenChange(false);
            setSelectedIds([]);
            setError(null);

            // Переходим сразу в чат
            navigate({
                to: "/chat/$roomId",
                params: { roomId },
            });
        } catch (err) {
            console.error("Failed to create chat:", err);
            setError(err instanceof Error ? err.message : t("common.error"));
        }
    }, [selectedIds, user, onOpenChange, navigate, isPrivate, createDM, t]);

    /**
     * Сброс состояния при закрытии диалога.
     */
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedIds([]);
            setError(null);
        }
        onOpenChange(newOpen);
    };

    const canCreate = selectedIds.length > 0;
    const selectedName =
        selectedContacts.length === 1
            ? selectedContacts[0].display_name
            : `${selectedContacts.length} контактов`;

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Content maxWidth="450px">
                <Dialog.Title>
                    {isPrivate ? t("chat.newPrivate") : t("chat.newChat")}
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t("chat.selectContact")}
                </Dialog.Description>

                {error && (
                    <Callout.Root color="red" mb="4">
                        <Callout.Icon>
                            <AlertCircle size={16} />
                        </Callout.Icon>
                        <Callout.Text>{error}</Callout.Text>
                    </Callout.Root>
                )}

                <ContactPicker
                    mode="single"
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    searchPlaceholder={t("common.search", "Поиск")}
                />

                {canCreate && (
                    <Text size="2" color="gray" mt="3">
                        Выбран: <Text weight="medium">{selectedName}</Text>
                    </Text>
                )}

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            {t("common.cancel")}
                        </Button>
                    </Dialog.Close>
                    <Button
                        disabled={!canCreate || createDM.isPending}
                        loading={createDM.isPending}
                        onClick={handleCreateChat}
                    >
                        {createDM.isPending
                            ? t("common.processing")
                            : t("chat.create")}
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
