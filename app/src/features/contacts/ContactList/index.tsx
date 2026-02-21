import clsx from "clsx";
import { Search, UserPlus } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Heading } from "@/components/ui/Heading";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Spinner } from "@/components/ui/Spinner";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import { usePresence } from "@/hooks/usePresence";
import { USER_CONTACTS_MODES, USER_WEB_STATUS } from "@/lib/constants/user";
import type { Profile } from "@/lib/types/profile";
import styles from "./contactlist.module.css";

interface ContactListProps {
    /**
     * Режим отображения:
     * - 'list': Обычный список контактов
     * - 'select': Режим выбора контакта (например, для нового приватного чата)
     */
    mode?: "list" | "select";
    /** Колбэк при выборе контакта */
    onSelect?: (contact: Profile) => void;
}

/**
 * Компонент списка контактов.
 *
 * Использует TanStack Query для загрузки данных и useDeferredValue
 * для плавной фильтрации при вводе в поисковое поле.
 *
 * @param props - Пропсы компонента
 * @returns JSX элемент списка контактов
 */
export function ContactList({ mode = "list", onSelect }: ContactListProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");

    // Отложенное значение поиска для плавного UX
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // 1. Загрузка данных (Persistent)
    const { data: contacts = [], isLoading, isError, error } = useContacts();

    // 2. Загрузка статусов (Ephemeral)
    const onlineUsers = usePresence();

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

    const title =
        mode === USER_CONTACTS_MODES.SELECT
            ? t("contacts.selectTitle", "Выбрать контакт")
            : t("contacts.title", "Контакты");

    // Индикатор "поиск в процессе" (когда deferred отстаёт от актуального)
    const isSearching = searchQuery !== deferredSearchQuery;

    const renderContent = () => {
        // 1. Loading
        if (isLoading) {
            return (
                <Box className={styles.emptyContainer}>
                    <Spinner size="lg" />
                    <Text intent="secondary">
                        {t("common.loading", "Загрузка...")}
                    </Text>
                </Box>
            );
        }

        // 2. Error
        if (isError) {
            return (
                <Box className={styles.emptyContainer}>
                    <Text intent="danger">
                        {t("contacts.error", "Ошибка загрузки контактов")}
                    </Text>
                    <Text size="sm" intent="secondary">
                        {error instanceof Error
                            ? error.message
                            : "Unknown error"}
                    </Text>
                </Box>
            );
        }

        // 3. Not Found (Empty Search)
        if (filteredContacts.length === 0) {
            return (
                <Box className={styles.emptyContainer}>
                    <Text>{t("contacts.notFound", "Контакты не найдены")}</Text>
                </Box>
            );
        }

        // 4. List
        return (
            <ScrollArea type="hover" className={styles.list}>
                {filteredContacts.map((contact) => {
                    const isOnline =
                        onlineUsers[contact.id] === USER_WEB_STATUS.ONLINE;

                    return (
                        <Box
                            key={contact.id}
                            className={styles.item}
                            onClick={() => onSelect?.(contact)}
                        >
                            <Box className={styles.avatarContainer}>
                                <Avatar
                                    size="md"
                                    fallback={contact.display_name[0]}
                                    radius="full"
                                    src={contact.avatar_url ?? undefined}
                                />
                                {isOnline && (
                                    <Box
                                        className={clsx(
                                            styles.statusIndicator,
                                            styles.statusOnline,
                                        )}
                                    />
                                )}
                            </Box>
                            <Flex direction="column" className={styles.info}>
                                <Text className={styles.name}>
                                    {contact.display_name}
                                </Text>
                                <Text className={styles.statusText}>
                                    @{contact.username}
                                    {isOnline && (
                                        <Text
                                            intent="success"
                                            size="sm"
                                            className={styles.statusOnlineText}
                                        >
                                            Online
                                        </Text>
                                    )}
                                </Text>
                            </Flex>
                        </Box>
                    );
                })}
            </ScrollArea>
        );
    };

    return (
        <Flex direction="column" className={styles.container}>
            {/* Заголовок и поиск */}
            <Box className={styles.header} p="3">
                <Flex justify="between" align="center" mb="3">
                    <Heading size="lg">{title}</Heading>
                    {mode === USER_CONTACTS_MODES.LIST && (
                        <Box
                            className={styles.addContactButton}
                            onClick={() => console.log("Add contact")}
                        >
                            <UserPlus />
                        </Box>
                    )}
                </Flex>
                <TextField
                    placeholder={t("contacts.search", "Поиск по имени...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                >
                    <TextField.Slot>
                        {isSearching ? <Spinner size="sm" /> : <Search />}
                    </TextField.Slot>
                </TextField>
            </Box>

            {/* Контент списка */}
            {renderContent()}
        </Flex>
    );
}
