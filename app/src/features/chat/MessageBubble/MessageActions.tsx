import clsx from "clsx";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./message-bubble.module.css";

interface MessageActionsProps {
    isOwn: boolean;
    isStarred?: boolean;
    isDeleted?: boolean;
    isEditing?: boolean;
    onEdit: () => void;
    onDelete?: () => void;
    onToggleStar?: (isStarred: boolean) => void;
}

/**
 * Контекстное меню действий над сообщением.
 */
export function MessageActions({
    isOwn,
    isStarred,
    isDeleted,
    isEditing,
    onEdit,
    onDelete,
    onToggleStar,
}: MessageActionsProps) {
    const { t } = useTranslation();

    if (!isOwn || isDeleted || isEditing) {
        return null;
    }

    const starIconClass = clsx(styles.iconSmall, isStarred && styles.star);
    const iconsStyles = clsx(styles.iconSmall, styles.iconsStyles);

    return (
        <div className={styles.actionsOverlay}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        className={styles.actionButton}
                    >
                        <MoreVertical size={ICON_SIZE.xs} />
                    </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item
                        onClick={() => onToggleStar?.(!isStarred)}
                    >
                        <Star className={starIconClass} />
                        {isStarred
                            ? t("common.unstar", "Убрать")
                            : t("common.star", "В избранное")}
                    </DropdownMenu.Item>

                    <DropdownMenu.Item onClick={onEdit}>
                        <Pencil className={iconsStyles} />{" "}
                        {t("common.edit", "Редактировать")}
                    </DropdownMenu.Item>

                    <DropdownMenu.Item intent="danger" onClick={onDelete}>
                        <Trash2 className={iconsStyles} />{" "}
                        {t("common.delete", "Удалить")}
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
}
