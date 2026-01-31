import {
	Avatar,
	Box,
	Checkbox,
	Flex,
	ScrollArea,
	Spinner,
	Text,
	TextField,
} from "@radix-ui/themes";
import { Search, UserPlus } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import type { Profile } from "@/lib/types/profile";
import styles from "./contactpicker.module.css";

/**
 * Режим работы компонента ContactPicker.
 */
export type ContactPickerMode = "single" | "multi";

interface ContactPickerProps {
	/**
	 * Режим выбора:
	 * - 'single': Одиночный выбор (для личных/приватных чатов)
	 * - 'multi': Множественный выбор (для групп)
	 */
	mode: ContactPickerMode;
	/** Выбранные контакты (массив id) */
	selectedIds: string[];
	/** Callback изменения выбора */
	onSelectionChange: (selectedIds: string[]) => void;
	/** Placeholder для поиска */
	searchPlaceholder?: string;
}

/**
 * Компонент выбора контактов для диалогов создания чатов.
 *
 * Поддерживает одиночный и множественный выбор.
 * Использует useContacts для загрузки контактов.
 *
 * @param props - Пропсы компонента
 */
export function ContactPicker({
	mode,
	selectedIds,
	onSelectionChange,
	searchPlaceholder,
}: ContactPickerProps) {
	const { t } = useTranslation();
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	/**
	 * Запрос списка контактов.
	 */
	const { data: contacts = [], isLoading, isError } = useContacts();

	/**
	 * Фильтрация контактов по поисковому запросу.
	 */
	const filteredContacts = useMemo(() => {
		if (!deferredSearchQuery.trim()) {
			return contacts;
		}
		const query = deferredSearchQuery.toLowerCase();
		return contacts.filter(
			(contact) =>
				contact.display_name.toLowerCase().includes(query) ||
				contact.username.toLowerCase().includes(query),
		);
	}, [contacts, deferredSearchQuery]);

	/**
	 * Обработчик клика по контакту.
	 */
	const handleContactClick = (contact: Profile) => {
		if (mode === "single") {
			// Одиночный выбор — просто заменяем
			onSelectionChange([contact.id]);
		} else {
			// Множественный выбор — toggle
			const isSelected = selectedIds.includes(contact.id);
			if (isSelected) {
				onSelectionChange(selectedIds.filter((id) => id !== contact.id));
			} else {
				onSelectionChange([...selectedIds, contact.id]);
			}
		}
	};

	const isSearching = searchQuery !== deferredSearchQuery;

	return (
		<Flex direction="column" className={styles.container}>
			{/* Поиск */}
			<Box className={styles.searchWrapper}>
				<TextField.Root
					placeholder={searchPlaceholder || t("contacts.search", "Поиск...")}
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				>
					<TextField.Slot>
						{isSearching ? <Spinner size="1" /> : <Search size={16} />}
					</TextField.Slot>
				</TextField.Root>
			</Box>

			{/* Состояние загрузки */}
			{isLoading && (
				<Box className={styles.emptyContainer}>
					<Spinner size="3" />
					<Text color="gray" size="2">
						{t("common.loading", "Загрузка...")}
					</Text>
				</Box>
			)}

			{/* Состояние ошибки */}
			{isError && (
				<Box className={styles.emptyContainer}>
					<Text color="red" size="2">
						{t("contacts.error", "Ошибка загрузки")}
					</Text>
				</Box>
			)}

			{/* Пустой результат */}
			{!isLoading && !isError && filteredContacts.length === 0 && (
				<Box className={styles.emptyContainer}>
					<UserPlus size={40} />
					<Text size="2">{t("contacts.empty", "Контакты не найдены")}</Text>
				</Box>
			)}

			{/* Список контактов */}
			{!isLoading && !isError && filteredContacts.length > 0 && (
				<ScrollArea type="hover" className={styles.list}>
					{filteredContacts.map((contact) => {
						const isSelected = selectedIds.includes(contact.id);
						return (
							<Box
								key={contact.id}
								className={`${styles.item} ${isSelected ? styles.itemSelected : ""}`}
								onClick={() => handleContactClick(contact)}
							>
								{mode === "multi" && (
									<Checkbox
										checked={isSelected}
										className={styles.checkbox}
										onCheckedChange={() => handleContactClick(contact)}
									/>
								)}
								<Avatar
									size="2"
									fallback={contact.display_name[0]}
									radius="full"
									color="indigo"
									src={contact.avatar_url ?? undefined}
								/>
								<Flex direction="column" className={styles.info}>
									<Text className={styles.name}>{contact.display_name}</Text>
									<Text className={styles.username}>@{contact.username}</Text>
								</Flex>
							</Box>
						);
					})}
				</ScrollArea>
			)}
		</Flex>
	);
}

/**
 * Хук для получения выбранных контактов по их ID.
 */
export function useSelectedContacts(selectedIds: string[]): Profile[] {
	const { data: contacts = [] } = useContacts();

	return useMemo(() => {
		return contacts.filter((c) => selectedIds.includes(c.id));
	}, [contacts, selectedIds]);
}
