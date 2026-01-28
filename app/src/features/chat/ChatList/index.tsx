import {
    Avatar,
    Box,
    DropdownMenu,
    Flex,
    ScrollArea,
    Text,
} from '@radix-ui/themes';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Lock, MessageSquarePlus, MoreVertical, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateChatDialog } from '@/features/chat/CreateChatDialog';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import { CHAT_TYPE, DB_TABLES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { ChatType } from '@/lib/types';
import { formatChatTime } from '@/lib/utils/date';
import { useAuthStore } from '@/stores/auth';
import styles from './chatlist.module.css';

/**
 * Тип открытого диалога создания чата.
 */
type ChatDialogType = ChatType | null;

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
 * Расширен для последнего сообщения (Mock).
 */
interface RoomQueryResult {
    room_id: string;
    rooms: {
        id: string;
        name: string | null;
        type?: string;
        last_message?: {
            content: string;
            created_at: string;
            sender_id: string;
        };
    };
}

/**
 * Компонент списка чатов.
 * Используется как в Sidebar (десктоп), так и как основной контент на мобильных.
 *
 * @returns JSX элемент списка чатов
 */
export function ChatList() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);
    const [openDialog, setOpenDialog] = useState<ChatDialogType>(null);

    /**
     * Запрос списка чатов пользователя.
     * Использует TanStack Query для кеширования и автоматического обновления.
     */
    const { data: chats = [], isLoading: loading } = useQuery({
        queryFn: async (): Promise<ChatItem[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from(DB_TABLES.ROOM_MEMBERS)
                .select(`
                    room_id,
                    rooms (
                        id,
                        name,
                        type,
                        last_message
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
                lastMessage:
                    item.rooms.last_message?.content ||
                    t('chat.noMessages', 'Нет сообщений'),
                time: item.rooms.last_message?.created_at
                    ? formatChatTime(item.rooms.last_message.created_at)
                    : '',
            }));
        },
        enabled: !!user,
        staleTime: 1000 * 30, // 30 секунд
        queryKey: ['rooms', user?.id, 'v3'],
    });

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            setOpenDialog(null);
        }
    };

    if (loading) {
        return (
            <Box className={styles.loadingContainer}>
                <Text color="gray" size="2">
                    {t('common.loading')}
                </Text>
            </Box>
        );
    }

    return (
        <>
            <Flex direction="column" className={styles.container}>
                {!isMobile && (
                    <Flex
                        justify="between"
                        align="center"
                        p="3"
                        className={styles.header}
                    >
                        <Text size="5" weight="bold">
                            {t('chat.title', 'Чаты')}
                        </Text>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <Box className={styles.iconButton}>
                                    <MoreVertical size={20} />
                                </Box>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content>
                                <DropdownMenu.Item
                                    onSelect={() =>
                                        setOpenDialog(CHAT_TYPE.PUBLIC)
                                    }
                                >
                                    <Flex align="center" gap="2">
                                        <MessageSquarePlus size={16} />
                                        {t('chat.newChat')}
                                    </Flex>
                                </DropdownMenu.Item>

                                <DropdownMenu.Item
                                    onSelect={() =>
                                        setOpenDialog(CHAT_TYPE.PRIVATE)
                                    }
                                >
                                    <Flex align="center" gap="2">
                                        <Lock size={16} />
                                        {t('chat.newPrivate')}
                                    </Flex>
                                </DropdownMenu.Item>

                                <DropdownMenu.Item disabled>
                                    <Flex align="center" gap="2">
                                        <Users size={16} />
                                        {t('chat.newGroup')}
                                    </Flex>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </Flex>
                )}

                {chats.length === 0 ? (
                    <Box className={styles.emptyContainer}>
                        <Text color="gray" size="2">
                            {t('chat.noRooms', 'У вас пока нет чатов')}
                        </Text>
                    </Box>
                ) : (
                    <ScrollArea
                        scrollbars="vertical"
                        className={styles.chatList}
                    >
                        <Flex direction="column">
                            {chats.map((chat) => (
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
                                            <Text
                                                color="gray"
                                                size="2"
                                                truncate
                                            >
                                                {chat.lastMessage}
                                            </Text>
                                        </Flex>
                                        {chat.unread && chat.unread > 0 && (
                                            <Box className={styles.unreadBadge}>
                                                {chat.unread}
                                            </Box>
                                        )}
                                    </Flex>
                                </Link>
                            ))}
                        </Flex>
                    </ScrollArea>
                )}
            </Flex>

            {/* Диалоги рендерятся вне основного контейнера через порталы */}
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PUBLIC}
                onOpenChange={handleDialogChange}
                isPrivate={false}
            />
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PRIVATE}
                onOpenChange={handleDialogChange}
                isPrivate
            />
        </>
    );
}
