import { Avatar, Box, Flex, Heading, ScrollArea, Text } from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { MessageSquare, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DB_TABLES, ROUTES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { NewChatDialog } from '../NewChatDialog';
import styles from './sidebar.module.css';

/**
 * Тип элемента списка чатов.
 */
interface ChatItem {
    id: string;
    name: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
}

/**
 * Тип результата запроса комнат из БД.
 */
interface RoomQueryResult {
    room_id: string;
    rooms: {
        id: string;
        name: string | null;
        type: string;
    };
}

export function Sidebar() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    /**
     * Запрос списка чатов пользователя.
     * Использует TanStack Query для кеширования и автоматического обновления.
     */
    const { data: chats = [], isLoading: loading } = useQuery({
        queryKey: ['user-rooms', user?.id],
        queryFn: async (): Promise<ChatItem[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from(DB_TABLES.ROOM_MEMBERS)
                .select(`
                    room_id,
                    rooms (
                        id,
                        name,
                        type
                    )
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error('Failed to fetch rooms', error);
                return [];
            }

            const typedData = data as unknown as RoomQueryResult[];
            return typedData.map((item) => ({
                id: item.rooms.id,
                name: item.rooms.name || `Chat ${item.rooms.id.slice(0, 4)}`,
                lastMessage: t('chat.noMessages', 'No messages yet'),
                time: '',
            }));
        },
        enabled: !!user,
        staleTime: 1000 * 30, // 30 секунд
    });

    return (
        <aside className={styles.sidebar}>
            {/* Header */}
            <Flex
                p="3"
                align="center"
                justify="between"
                className={styles.header}
            >
                <Link to={ROUTES.PROFILE}>
                    <Avatar
                        size="2"
                        fallback={<User size={16} />}
                        radius="full"
                        color="blue"
                        style={{ cursor: 'pointer' }}
                    />
                </Link>
                <Heading size="4" weight="bold">
                    {t('chat.sidebarTitle', 'Чаты')}
                </Heading>
                <Flex gap="3">
                    <NewChatDialog
                        trigger={
                            <MessageSquare size={20} className={styles.icon} />
                        }
                    />
                    <Link to={ROUTES.PROFILE}>
                        <Settings size={20} className={styles.icon} />
                    </Link>
                </Flex>
            </Flex>

            {/* Chat List */}
            <ScrollArea scrollbars="vertical" className={styles.chatList}>
                <Flex direction="column">
                    {loading ? (
                        <Box className={styles.loadingContainer}>
                            <Text color="gray" size="2">
                                {t('common.loading')}
                            </Text>
                        </Box>
                    ) : chats.length === 0 ? (
                        <Box className={styles.emptyContainer}>
                            <Text color="gray" size="2">
                                {t('chat.noRooms', 'У вас пока нет чатов')}
                            </Text>
                        </Box>
                    ) : (
                        chats.map((chat) => (
                            <Link
                                key={chat.id}
                                to="/chat/$roomId"
                                params={{ roomId: chat.id }}
                                className={styles.chatListItem}
                            >
                                <Flex p="3" gap="3" align="center">
                                    <Avatar
                                        size="3"
                                        fallback={chat.name[0]}
                                        radius="full"
                                        color="blue"
                                    />
                                    <Flex
                                        direction="column"
                                        className={styles.chatInfo}
                                    >
                                        <Flex justify="between">
                                            <Text
                                                weight="bold"
                                                size="3"
                                                truncate
                                            >
                                                {chat.name}
                                            </Text>
                                            <Text color="gray" size="1">
                                                {chat.time}
                                            </Text>
                                        </Flex>
                                        <Text color="gray" size="2" truncate>
                                            {chat.lastMessage}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Link>
                        ))
                    )}
                </Flex>
            </ScrollArea>
        </aside>
    );
}
