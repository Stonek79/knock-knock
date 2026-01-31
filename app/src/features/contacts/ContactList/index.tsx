import {
    Avatar,
    Box,
    Flex,
    Heading,
    ScrollArea,
    Spinner,
    Text,
    TextField,
} from '@radix-ui/themes';
import { Search, UserPlus } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { usePresence } from '@/features/contacts/hooks/usePresence';
import type { Profile } from '@/lib/types/profile';
import styles from './contactlist.module.css';

interface ContactListProps {
    /**
     * Режим отображения:
     * - 'list': Обычный список контактов
     * - 'select': Режим выбора контакта (например, для нового приватного чата)
     */
    mode?: 'list' | 'select';
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
export function ContactList({ mode = 'list', onSelect }: ContactListProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

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
        mode === 'select'
            ? t('contacts.selectTitle', 'Выбрать контакт')
            : t('contacts.title', 'Контакты');

    // Индикатор "поиск в процессе" (когда deferred отстаёт от актуального)
    const isSearching = searchQuery !== deferredSearchQuery;

    const renderContent = () => {
        // 1. Loading
        if (isLoading) {
            return (
                <Box className={styles.emptyContainer}>
                    <Spinner size="3" />
                    <Text color="gray">
                        {t('common.loading', 'Загрузка...')}
                    </Text>
                </Box>
            );
        }

        // 2. Error
        if (isError) {
            return (
                <Box className={styles.emptyContainer}>
                    <Text color="red">
                        {t('contacts.error', 'Ошибка загрузки контактов')}
                    </Text>
                    <Text size="1" color="gray">
                        {error instanceof Error
                            ? error.message
                            : 'Unknown error'}
                    </Text>
                </Box>
            );
        }

        // 3. Not Found (Empty Search)
        if (filteredContacts.length === 0) {
            return (
                <Box className={styles.emptyContainer}>
                    <Text>{t('contacts.notFound', 'Контакты не найдены')}</Text>
                </Box>
            );
        }

        // 4. List
        return (
            <ScrollArea type="hover" className={styles.list}>
                {filteredContacts.map((contact) => {
                    const isOnline = onlineUsers[contact.id] === 'online';

                    return (
                        <Box
                            key={contact.id}
                            className={styles.item}
                            onClick={() => onSelect?.(contact)}
                        >
                            <Box className={styles.avatarContainer}>
                                <Avatar
                                    size="3"
                                    fallback={contact.display_name[0]}
                                    radius="full"
                                    color="indigo"
                                    src={contact.avatar_url ?? undefined}
                                />
                                {isOnline && (
                                    <Box
                                        className={`${styles.statusIndicator} ${styles.statusOnline}`}
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
                                        <Text color="green" size="1" ml="2">
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
                    <Heading size="4">{title}</Heading>
                    {mode === 'list' && (
                        <Box
                            style={{ cursor: 'pointer' }}
                            onClick={() => console.log('Add contact')}
                        >
                            <UserPlus size={20} />
                        </Box>
                    )}
                </Flex>
                <TextField.Root
                    placeholder={t('contacts.search', 'Поиск по имени...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                >
                    <TextField.Slot>
                        {isSearching ? (
                            <Spinner size="1" />
                        ) : (
                            <Search size={16} />
                        )}
                    </TextField.Slot>
                </TextField.Root>
            </Box>

            {/* Контент списка */}
            {renderContent()}
        </Flex>
    );
}
