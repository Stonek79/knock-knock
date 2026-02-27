import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
    ContactPicker,
    useSelectedContacts,
} from "@/features/contacts/ContactPicker";
import { CONTACT_PICKER_MODE } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import { useCreateDM } from "../../hooks/useCreateDM";
import styles from "./createchatdialog.module.css";

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

            onOpenChange(false);
            setSelectedIds([]);
            setError(null);

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
            <Dialog.Content>
                <Dialog.Title>
                    {isPrivate ? t("chat.newPrivate") : t("chat.newChat")}
                </Dialog.Title>
                <Dialog.Description className={styles.description}>
                    {t("chat.selectContact")}
                </Dialog.Description>

                {error && <Alert variant="danger">{error}</Alert>}

                <ContactPicker
                    mode={CONTACT_PICKER_MODE.SINGLE}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    searchPlaceholder={t("common.search", "Поиск")}
                />

                {canCreate && (
                    <span className={styles.selectedInfo}>
                        Выбран: <strong>{selectedName}</strong>
                    </span>
                )}

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close asChild>
                        <Button variant="soft" intent="neutral">
                            {t("common.cancel")}
                        </Button>
                    </Dialog.Close>
                    <Button
                        disabled={!canCreate || createDM.isPending}
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
