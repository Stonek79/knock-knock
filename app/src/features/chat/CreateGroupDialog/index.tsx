import {
	Avatar,
	Box,
	Button,
	Dialog,
	Flex,
	Text,
	TextField,
} from "@radix-ui/themes";
import { Camera, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCreateGroup } from "@/features/chat/hooks/useCreateGroup";
import {
	ContactPicker,
	useSelectedContacts,
} from "@/features/contacts/ContactPicker";
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
			<Dialog.Content maxWidth="500px">
				<Dialog.Title>{t("chat.newGroup", "Новая группа")}</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					{t(
						"chat.groupDescription",
						"Создайте группу для общения с несколькими людьми",
					)}
				</Dialog.Description>

				{/* Инфо о группе: аватар и название */}
				<Box className={styles.groupInfo}>
					<Flex className={styles.avatarUpload} align="center" gap="3">
						<Box
							className={styles.avatarPlaceholder}
							onClick={handleAvatarClick}
							style={{ cursor: "pointer" }}
						>
							{avatarUrl ? (
								<Avatar
									src={avatarUrl}
									fallback={<Camera size={24} />}
									size="5"
									radius="full"
								/>
							) : (
								<Camera size={24} className={styles.camera}/>
							)}
						</Box>
						<TextField.Root
							placeholder={t("chat.groupName", "Название группы")}
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							style={{ flex: 1 }}
							size="3"
						/>
					</Flex>
				</Box>

				{/* Выбранные участники (chips) */}
				{selectedContacts.length > 0 && (
					<Box className={styles.selectedList}>
						{selectedContacts.map((contact) => (
							<Box key={contact.id} className={styles.selectedChip}>
								<Avatar
									size="1"
									fallback={contact.display_name[0]}
									radius="full"
								/>
								<Text size="1">{contact.display_name}</Text>
								<X
									size={14}
									className={styles.removeChip}
									onClick={() => removeParticipant(contact.id)}
								/>
							</Box>
						))}
					</Box>
				)}

				{/* Выбор участников */}
				<Text size="2" weight="medium" mb="2">
					{t("chat.selectParticipants", "Выберите участников")} (
					{selectedIds.length}/∞)
				</Text>

				<ContactPicker
					mode="multi"
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					searchPlaceholder={t("common.search", "Поиск")}
				/>

				{selectedIds.length > 0 && selectedIds.length < 2 && (
					<Text size="1" color="amber" mt="2">
						{t(
							"chat.minParticipants",
							"Выберите минимум 2 участников для группы",
						)}
					</Text>
				)}

				<Flex gap="3" mt="4" justify="end">
					<Dialog.Close>
						<Button variant="soft" color="gray" disabled={isCreating}>
							{t("common.cancel")}
						</Button>
					</Dialog.Close>
					<Button
						disabled={!canCreate || isCreating}
						loading={isCreating}
						onClick={handleCreateGroup}
					>
						{t("chat.createGroup", "Создать группу")}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
