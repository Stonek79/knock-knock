import { DropdownMenu, IconButton } from "@radix-ui/themes";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./message-bubble.module.css";

interface MessageActionsProps {
    isOwn: boolean;
    isDeleted?: boolean;
    isEditing?: boolean;
    onEdit: () => void;
    onDelete?: () => void;
}

export function MessageActions({
    isOwn,
    isDeleted,
    isEditing,
    onEdit,
    onDelete,
}: MessageActionsProps) {
    const { t } = useTranslation();

    if (!isOwn || isDeleted || isEditing) {
        return null;
    }

    return (
        <div className={styles.actionsOverlay}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <IconButton
                        size="1"
                        variant="ghost"
                        className={styles.actionButton}
                    >
                        <MoreVertical className={styles.iconSmall} />
                    </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content size="1">
                    <DropdownMenu.Item onClick={onEdit}>
                        <Pencil
                            className={styles.iconMini}
                            style={{ marginRight: 6 }}
                        />{" "}
                        {t("common.edit", "Редактировать")}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item color="red" onClick={onDelete}>
                        <Trash2
                            className={styles.iconMini}
                            style={{ marginRight: 6 }}
                        />{" "}
                        {t("common.delete", "Удалить")}
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
}
