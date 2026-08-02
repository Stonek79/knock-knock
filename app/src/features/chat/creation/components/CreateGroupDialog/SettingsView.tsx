import { Camera, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import {
    ContactPicker,
    useSelectedContacts,
} from "@/features/contacts/ContactPicker";
import {
    CONTACT_PICKER_MODE,
    ICON_SIZE,
    INVITE_EXPIRATION,
    PROFILE_TYPE,
} from "@/lib/constants";
import type { useCreateGroup } from "../../hooks/useCreateGroup";
import styles from "./creategroupdialog.module.css";

interface SettingsViewProps {
    state: ReturnType<typeof useCreateGroup>;
}

export function SettingsView({ state }: SettingsViewProps) {
    const { t } = useTranslation();
    const selectedContacts = useSelectedContacts(state.selectedIds);

    return (
        <>
            <Dialog.Description className={styles.description}>
                {t(
                    "chat.groupDescription",
                    "Создайте группу для общения с несколькими людьми",
                )}
            </Dialog.Description>

            <Box className={styles.groupInfo}>
                <Flex className={styles.avatarUpload} align="center" gap="3">
                    <Box
                        className={styles.avatarPlaceholder}
                        onClick={state.handleAvatarClick}
                    >
                        {state.avatarUrl ? (
                            <Avatar
                                src={state.avatarUrl}
                                name={
                                    state.groupName ||
                                    t("chat.defaultGroup", "Группа")
                                }
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
                        value={state.groupName}
                        onChange={(e) => state.setGroupName(e.target.value)}
                        className={styles.nameField}
                    />
                </Flex>
            </Box>

            {state.userProfileType === PROFILE_TYPE.PUBLIC ? (
                <>
                    {selectedContacts.length > 0 && (
                        <Flex className={styles.selectedList} wrap="wrap">
                            {selectedContacts.map((contact) => (
                                <Flex
                                    key={contact.id}
                                    className={styles.selectedChip}
                                    align="center"
                                >
                                    <Avatar
                                        size="xs"
                                        fallback={contact?.display_name?.[0]}
                                        name={contact.display_name}
                                    />
                                    <Text className={styles.chipLabel}>
                                        {contact.display_name}
                                    </Text>
                                    <X
                                        size={ICON_SIZE.xs}
                                        className={styles.removeChip}
                                        onClick={() =>
                                            state.removeParticipant(contact.id)
                                        }
                                    />
                                </Flex>
                            ))}
                        </Flex>
                    )}

                    <Text className={styles.participantsLabel}>
                        {t("chat.selectParticipants", "Выберите участников")} (
                        {state.selectedIds.length}/∞)
                    </Text>

                    <ContactPicker
                        mode={CONTACT_PICKER_MODE.MULTI}
                        selectedIds={state.selectedIds}
                        onSelectionChange={state.setSelectedIds}
                        searchPlaceholder={t("common.search", "Поиск")}
                    />

                    <Flex
                        className={styles.checkboxLabel}
                        align="center"
                        gap="2"
                        as="label"
                    >
                        <Checkbox
                            checked={state.onlyAdminInvites}
                            onCheckedChange={(checked) =>
                                state.setOnlyAdminInvites(checked === true)
                            }
                        />
                        <Text>
                            {t(
                                "chat.onlyAdminInvites",
                                "Только модератор может приглашать (Private)",
                            )}
                        </Text>
                    </Flex>

                    {state.selectedIds.length > 0 &&
                        state.selectedIds.length < 2 && (
                            <Text className={styles.warningText}>
                                {t(
                                    "chat.minParticipants",
                                    "Выберите минимум 2 участников для группы",
                                )}
                            </Text>
                        )}
                </>
            ) : (
                <Box className={styles.privateSettings}>
                    <Text className={styles.settingsTitle} weight="medium">
                        {t("chat.inviteSettings", "Настройки инвайт-ссылки")}
                    </Text>
                    <Flex direction="column" gap="3" mt="3">
                        <Flex justify="between" align="center" as="label">
                            <Text>
                                {t("chat.inviteExpiresIn", "Срок жизни:")}
                            </Text>
                            <Select.Root
                                value={String(state.inviteExpiresIn)}
                                onValueChange={(value) =>
                                    state.setInviteExpiresIn(Number(value))
                                }
                            >
                                <Select.Trigger className={styles.nativeSelect}>
                                    <Select.Value />
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item
                                        value={String(
                                            INVITE_EXPIRATION.FIFTEEN_MINS,
                                        )}
                                    >
                                        {t("chat.fifteenMins", "15 минут")}
                                    </Select.Item>
                                    <Select.Item
                                        value={String(
                                            INVITE_EXPIRATION.ONE_HOUR,
                                        )}
                                    >
                                        {t("chat.oneHour", "1 час")}
                                    </Select.Item>
                                    <Select.Item
                                        value={String(
                                            INVITE_EXPIRATION.ONE_DAY,
                                        )}
                                    >
                                        {t("chat.oneDay", "24 часа")}
                                    </Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </Flex>
                        <Flex justify="between" align="center" as="label">
                            <Text>
                                {t("chat.maxUses", "Количество использований:")}
                            </Text>
                            <TextField
                                type="number"
                                min="1"
                                value={state.inviteMaxUses.toString()}
                                onChange={(e) =>
                                    state.setInviteMaxUses(
                                        Number(e.target.value),
                                    )
                                }
                                className={styles.numberInput}
                            />
                        </Flex>
                    </Flex>
                </Box>
            )}

            <Flex gap="3" mt="4" justify="end">
                <Dialog.Close asChild>
                    <Button
                        variant="soft"
                        intent="neutral"
                        disabled={state.isCreating}
                    >
                        {t("common.cancel")}
                    </Button>
                </Dialog.Close>
                <Button
                    disabled={!state.canCreate || state.isCreating}
                    onClick={state.handleCreateGroup}
                >
                    {t("chat.createGroup", "Создать группу")}
                </Button>
            </Flex>
        </>
    );
}
