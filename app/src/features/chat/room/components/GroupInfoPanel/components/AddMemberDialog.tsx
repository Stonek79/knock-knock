import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { CONTACT_PICKER_MODE } from "@/lib/constants";
import { useGroupActions } from "../../../hooks/useGroupActions";
import styles from "../groupinfopanel.module.css";

interface AddMemberDialogProps {
    roomId: string;
    roomKey?: CryptoKey;
    myUserId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Массив ID текущих участников, чтобы исключить их из списка выбора */
    currentMemberIds: string[];
}

export function AddMemberDialog({
    roomId,
    roomKey,
    myUserId,
    open,
    onOpenChange,
}: AddMemberDialogProps) {
    const { t } = useTranslation();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { addMembers, isLoading } = useGroupActions({
        roomId,
        myUserId,
    });

    const handleAdd = async () => {
        if (!roomKey || selectedIds.length === 0) {
            return;
        }

        try {
            await addMembers(selectedIds, roomKey);
            onOpenChange(false);
            setSelectedIds([]);
        } catch (error) {
            // Ошибка уже обрабатывается внутри хука
            console.error(error);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content>
                <Dialog.Title>
                    {t("chat.group.addMember", "Добавить участника")}
                </Dialog.Title>
                <Dialog.Description>
                    {t(
                        "chat.group.addMemberSubtitle",
                        "Выберите пользователей из списка контактов",
                    )}
                </Dialog.Description>

                <ContactPicker
                    mode={CONTACT_PICKER_MODE.MULTI}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    // Добавляем текущих участников в selectedIds?
                    // Лучше просто не показывать их, но API ContactPicker пока не поддерживает excludedIds.
                    // Оставим пока так. Т.к. API бэка может вернуть ошибку уникальности, учтём.
                />

                <Flex gap="3" justify="end" className={styles.confirmActions}>
                    <Button
                        variant="outline"
                        intent="neutral"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        {t("common.cancel", "Отмена")}
                    </Button>
                    <Button
                        variant="solid"
                        intent="primary"
                        onClick={handleAdd}
                        disabled={
                            isLoading || selectedIds.length === 0 || !roomKey
                        }
                    >
                        {t("common.add", "Добавить")}
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
