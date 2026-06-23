import { UserPlus } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Search } from "@/components/ui/Search";
import { Spinner } from "@/components/ui/Spinner";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import { useUserSearch } from "@/features/contacts/hooks/useUserSearch";
import { CONTACT_PICKER_MODE, ICON_SIZE } from "@/lib/constants";
import type { Profile } from "@/lib/types/profile";
import type { ContactPickerMode } from "@/lib/types/ui";
import { useAuthStore } from "@/stores/auth";
import styles from "./contactpicker.module.css";

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
 * Использует наши кастомные компоненты Avatar, Search, Spinner.
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

    const { data: contacts = [], isLoading: isLoadingContacts } = useContacts();
    const { data: searchResults = [], isLoading: isLoadingSearch } =
        useUserSearch(deferredSearchQuery);

    const user = useAuthStore((state) => state.profile);

    const filteredContacts = useMemo(() => {
        let list = deferredSearchQuery.trim() ? searchResults : contacts;

        // Объединяем контакты и результаты поиска, удаляя дубликаты
        if (deferredSearchQuery.trim() && contacts.length > 0) {
            const all = [...contacts, ...searchResults];
            const unique = new Map(all.map((item) => [item.id, item]));
            list = Array.from(unique.values());

            // Фильтруем локально для быстрого отклика
            const query = deferredSearchQuery.toLowerCase();
            list = list.filter(
                (contact) =>
                    contact.display_name?.toLowerCase().includes(query) ||
                    contact.username?.toLowerCase().includes(query),
            );
        }

        if (user) {
            list = list.filter((c) => c.id !== user.id);
        }

        return list;
    }, [contacts, searchResults, deferredSearchQuery, user]);

    const isLoading = isLoadingContacts || isLoadingSearch;

    const handleContactClick = (contact: Profile) => {
        if (mode === CONTACT_PICKER_MODE.SINGLE) {
            onSelectionChange([contact.id]);
        } else {
            const isSelected = selectedIds.includes(contact.id);
            if (isSelected) {
                onSelectionChange(
                    selectedIds.filter((id) => id !== contact.id),
                );
            } else {
                onSelectionChange([...selectedIds, contact.id]);
            }
        }
    };

    return (
        <Flex direction="column" className={styles.container}>
            {/* Поиск — используем наш компонент Search */}
            <Box className={styles.searchWrapper}>
                <Search
                    placeholder={
                        searchPlaceholder || t("contacts.search", "Поиск...")
                    }
                    value={searchQuery}
                    onChange={setSearchQuery}
                />
            </Box>

            {/* Состояние загрузки */}
            {isLoading && (
                <Box className={styles.emptyContainer}>
                    <Spinner size="md" />
                    <span className={styles.loadingText}>
                        {t("common.loading", "Загрузка...")}
                    </span>
                </Box>
            )}

            {/* Состояние ошибки */}
            {isError && (
                <Box className={styles.emptyContainer}>
                    <span className={styles.errorText}>
                        {t("contacts.error", "Ошибка загрузки")}
                    </span>
                </Box>
            )}

            {/* Пустой результат */}
            {!isLoading && !isError && filteredContacts.length === 0 && (
                <Box className={styles.emptyContainer}>
                    <UserPlus size={ICON_SIZE.md} />
                    <span className={styles.emptyText}>
                        {t("contacts.empty", "Контакты не найдены")}
                    </span>
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
                                data-testid="contact-item"
                            >
                                {mode === CONTACT_PICKER_MODE.MULTI && (
                                    <Checkbox
                                        checked={isSelected}
                                        className={styles.checkbox}
                                        onCheckedChange={() =>
                                            handleContactClick(contact)
                                        }
                                    />
                                )}
                                <Avatar
                                    size="md"
                                    name={contact.display_name}
                                    src={contact.avatar_url ?? undefined}
                                    className={styles.avatar}
                                />
                                <Flex
                                    direction="column"
                                    className={styles.info}
                                >
                                    <span
                                        className={styles.name}
                                        data-testid="contact-name"
                                    >
                                        {contact.display_name}
                                    </span>
                                    <span className={styles.username}>
                                        @{contact.username}
                                    </span>
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
