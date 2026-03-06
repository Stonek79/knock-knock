/**
 * Диалог подтверждения удаления сообщений.
 * Информирует о том, что удаление локальное (у собеседника сообщение останется).
 */

import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

interface DeleteConfirmDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Колбэк изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
    /** Колбэк подтверждения удаления */
    onConfirm: () => void;
}

export function DeleteConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
}: DeleteConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Content>
                <AlertDialog.Title>
                    {t("chat.deleteMessageTitle", "Удалить отсюда?")}
                </AlertDialog.Title>
                <AlertDialog.Description>
                    {t(
                        "chat.deleteMessageConfirm",
                        "Это действие удалит сообщение у вас. У собеседника оно останется, если это не ваше сообщение.",
                    )}
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel asChild>
                        <Button variant="soft" intent="neutral">
                            {t("common.cancel", "Отмена")}
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                        <Button intent="danger" onClick={onConfirm}>
                            {t("common.delete", "Удалить")}
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
