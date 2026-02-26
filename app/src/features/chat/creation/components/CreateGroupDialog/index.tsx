import { Camera, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import {
    ContactPicker,
    useSelectedContacts,
} from "@/features/contacts/ContactPicker";
import { CONTACT_PICKER_MODE } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useCreateGroup } from "../../hooks/useCreateGroup";
import styles from "./creategroupdialog.module.css";

interface CreateGroupDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Callback изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
}

/**
 * Диалог создания группового чата.
 * Позволяет выбрать несколько контактов и задать название группы.
 */
export function CreateGroupDialog({
    open,
    onOpenChange,
}: CreateGroupDialogProps) {
    const { t } = useTranslation();

    const {
        groupName,
        setGroupName,
        avatarUrl,
        handleAvatarClick,
        selectedIds,
        setSelectedIds,
        isCreating,
        handleCreateGroup,
        removeParticipant,
        handleOpenChange,
        canCreate,
    } = useCreateGroup({ onOpenChange });

    const selectedContacts = useSelectedContacts(selectedIds);

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Content>
                <Dialog.Title>
                    {t("chat.newGroup", "Новая группа")}
                </Dialog.Title>
                <Dialog.Description className={styles.description}>
                    {t(
                        "chat.groupDescription",
                        "Создайте группу для общения с несколькими людьми",
                    )}
                </Dialog.Description>

                {/* Инфо о группе: аватар и название */}
                <Box className={styles.groupInfo}>
                    <Flex
                        className={styles.avatarUpload}
                        align="center"
                        gap="3"
                    >
                        <Box
                            className={styles.avatarPlaceholder}
                            onClick={handleAvatarClick}
                        >
                            {avatarUrl ? (
                                <Avatar
                                    src={avatarUrl}
                                    name="Группа"
                                    size="lg"
                                />
                            ) : (
                                <Camera
                                    size={ICON_SIZE.md}
                                    className={styles.camera}
                                />
                            )}
                        </Box>
                        <TextField
                            placeholder={t("chat.groupName", "Название группы")}
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className={styles.nameField}
                        />
                    </Flex>
                </Box>

                {/* Выбранные участники (chips) */}
                {selectedContacts.length > 0 && (
                    <Box className={styles.selectedList}>
                        {selectedContacts.map((contact) => (
                            <Box
                                key={contact.id}
                                className={styles.selectedChip}
                            >
                                <Avatar
                                    size="xs"
                                    fallback={contact.display_name[0]}
                                    name={contact.display_name}
                                />
                                <span className={styles.chipLabel}>
                                    {contact.display_name}
                                </span>
                                <X
                                    size={ICON_SIZE.xs}
                                    className={styles.removeChip}
                                    onClick={() =>
                                        removeParticipant(contact.id)
                                    }
                                />
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Подпись выбора участников */}
                <span className={styles.participantsLabel}>
                    {t("chat.selectParticipants", "Выберите участников")} (
                    {selectedIds.length}/∞)
                </span>

                <ContactPicker
                    mode={CONTACT_PICKER_MODE.MULTI}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    searchPlaceholder={t("common.search", "Поиск")}
                />

                {selectedIds.length > 0 && selectedIds.length < 2 && (
                    <span className={styles.warningText}>
                        {t(
                            "chat.minParticipants",
                            "Выберите минимум 2 участников для группы",
                        )}
                    </span>
                )}

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close asChild>
                        <Button
                            variant="soft"
                            intent="neutral"
                            disabled={isCreating}
                        >
                            {t("common.cancel")}
                        </Button>
                    </Dialog.Close>
                    <Button
                        disabled={!canCreate || isCreating}
                        onClick={handleCreateGroup}
                    >
                        {t("chat.createGroup", "Создать группу")}
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
