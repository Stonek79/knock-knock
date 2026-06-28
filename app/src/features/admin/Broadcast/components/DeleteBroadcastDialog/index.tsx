import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

interface DeleteBroadcastDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Колбэк изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
    /** Колбэк подтверждения удаления */
    onConfirm: () => void;
}

/**
 * Диалог подтверждения удаления рассылки.
 * Заменяет стандартный window.confirm для соответствия UI/UX приложения.
 */
export function DeleteBroadcastDialog({
    open,
    onOpenChange,
    onConfirm,
}: DeleteBroadcastDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Content>
                <AlertDialog.Title>
                    {t(
                        "settings.broadcast.deleteConfirmTitle",
                        "Удалить рассылку?",
                    )}
                </AlertDialog.Title>
                <AlertDialog.Description>
                    {t(
                        "settings.broadcast.deleteConfirmDescription",
                        "Вы уверены, что хотите удалить эту рассылку из истории? Это действие нельзя отменить.",
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
