/**
 * Диалог подтверждения завершения сеанса чата.
 * При подтверждении удаляет историю и ключи шифрования.
 */

import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

interface EndSessionDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Колбэк изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
    /** Колбэк подтверждения завершения */
    onConfirm: () => void;
}

export function EndSessionDialog({
    open,
    onOpenChange,
    onConfirm,
}: EndSessionDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Content>
                <AlertDialog.Title>
                    {t("chat.endSessionTitle", "Завершить сеанс?")}
                </AlertDialog.Title>
                <AlertDialog.Description>
                    {t(
                        "chat.endSessionConfirm",
                        "Вы уверены? История чата и ключи шифрования будут удалены навсегда.",
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
                            {t("chat.endSessionAction", "Удалить чат")}
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
