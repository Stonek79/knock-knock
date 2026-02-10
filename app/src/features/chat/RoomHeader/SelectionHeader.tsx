import { Flex, Heading, IconButton, Tooltip } from "@radix-ui/themes";
import { Copy, Forward, Pencil, Reply, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
                    color="gray"
                    onClick={onClearSelection}
                    aria-label={t("common.close", "Закрыть")}
                >
                    <X size={24} />
                </IconButton>
                <Heading size="4">{selectedCount}</Heading>
            </Flex>

            <Flex align="center" gap="5" className={styles.rightSection}>
                {/* Primary Actions */}
                <Flex gap="5">
                    <Tooltip content={t("common.reply", "Ответить")}>
                        <IconButton
                            variant="ghost"
                            color="gray"
                            onClick={onReplySelected}
                            aria-label={t("common.reply", "Ответить")}
                        >
                            <Reply size={22} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip content={t("common.forward", "Переслать")}>
                        <IconButton
                            variant="ghost"
                            color="gray"
                            onClick={onForwardSelected}
                            aria-label={t("common.forward", "Переслать")}
                        >
                            <Forward size={22} />
                        </IconButton>
                    </Tooltip>
                </Flex>

                {/* Secondary Actions */}
                <Flex gap="5">
                    {canEditSelected && (
                        <Tooltip content={t("common.edit", "Редактировать")}>
                            <IconButton
                                variant="ghost"
                                color="gray"
                                onClick={onEditSelected}
                                aria-label={t("common.edit", "Редактировать")}
                            >
                                <Pencil size={22} />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip content={t("common.copy", "Копировать")}>
                        <IconButton
                            variant="ghost"
                            color="gray"
                            onClick={onCopySelected}
                            aria-label={t("common.copy", "Копировать")}
                        >
                            <Copy size={22} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip content={t("common.delete", "Удалить")}>
                        <IconButton
                            variant="ghost"
                            color="gray"
                            onClick={onDeleteSelected}
                            aria-label={t("common.delete", "Удалить")}
                        >
                            <Trash2 size={22} />
                        </IconButton>
                    </Tooltip>
                </Flex>
            </Flex>
        </header>
    );
}
