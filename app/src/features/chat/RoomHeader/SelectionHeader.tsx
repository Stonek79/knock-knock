import { Copy, Forward, Pencil, Reply, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./roomheader.module.css";

interface SelectionHeaderProps {
    selectedCount: number;
    canEditSelected?: boolean;
    onClearSelection?: () => void;
    onDeleteSelected?: () => void;
    onCopySelected?: () => void;
    onReplySelected?: () => void;
    onForwardSelected?: () => void;
    onEditSelected?: () => void;
}

/**
 * Заголовок режима выбора сообщений.
 * Использует наши кастомные IconButton вместо Radix IconButton.
 */
export function SelectionHeader({
    selectedCount,
    canEditSelected,
    onClearSelection,
    onDeleteSelected,
    onCopySelected,
    onReplySelected,
    onForwardSelected,
    onEditSelected,
}: SelectionHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className={styles.roomHeader}>
            <Flex align="center" gap="3" className={styles.leftSection}>
                <IconButton
                    variant="ghost"
                    size="md"
                    shape="round"
                    onClick={onClearSelection}
                    aria-label={t("common.close", "Закрыть")}
                >
                    <X size={ICON_SIZE.md} />
                </IconButton>
                <span className={styles.selectionCount}>{selectedCount}</span>
            </Flex>

            <Flex align="center" gap="5" className={styles.rightSection}>
                <Flex gap="5">
                    <Tooltip content={t("common.reply", "Ответить")}>
                        <IconButton
                            variant="ghost"
                            size="md"
                            shape="round"
                            onClick={onReplySelected}
                            aria-label={t("common.reply", "Ответить")}
                        >
                            <Reply size={ICON_SIZE.md} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip content={t("common.forward", "Переслать")}>
                        <IconButton
                            variant="ghost"
                            size="md"
                            shape="round"
                            onClick={onForwardSelected}
                            aria-label={t("common.forward", "Переслать")}
                        >
                            <Forward size={ICON_SIZE.md} />
                        </IconButton>
                    </Tooltip>
                </Flex>

                <Flex gap="5">
                    {canEditSelected && (
                        <Tooltip content={t("common.edit", "Редактировать")}>
                            <IconButton
                                variant="ghost"
                                size="md"
                                shape="round"
                                onClick={onEditSelected}
                                aria-label={t("common.edit", "Редактировать")}
                            >
                                <Pencil size={ICON_SIZE.md} />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip content={t("common.copy", "Копировать")}>
                        <IconButton
                            variant="ghost"
                            size="md"
                            shape="round"
                            onClick={onCopySelected}
                            aria-label={t("common.copy", "Копировать")}
                        >
                            <Copy size={ICON_SIZE.md} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip content={t("common.delete", "Удалить")}>
                        <IconButton
                            variant="ghost"
                            intent="danger"
                            size="md"
                            shape="round"
                            onClick={onDeleteSelected}
                            aria-label={t("common.delete", "Удалить")}
                        >
                            <Trash2 size={ICON_SIZE.md} />
                        </IconButton>
                    </Tooltip>
                </Flex>
            </Flex>
        </header>
    );
}
