/**
 * Диалог подтверждения завершения сеанса чата.
 * При подтверждении удаляет историю и ключи шифрования.
 */
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";

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
            <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title>
                    {t("chat.endSessionTitle", "Завершить сеанс?")}
                </AlertDialog.Title>
                <AlertDialog.Description size="2">
                    {t(
                        "chat.endSessionConfirm",
                        "Вы уверены? История чата и ключи шифрования будут удалены навсегда.",
                    )}
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            {t("common.cancel", "Отмена")}
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                        <Button color="red" onClick={onConfirm}>
                            {t("chat.endSessionAction", "Удалить чат")}
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
