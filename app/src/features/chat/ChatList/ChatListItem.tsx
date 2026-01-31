import { Avatar, Box, Flex, Text } from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import styles from './chatlist.module.css';

/**
 * Данные элемента списка чатов.
 */
interface ChatItem {
    id: string;
    name: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
}

interface ChatListItemProps {
    /** Данные чата */
    chat: ChatItem;
}

/**
 * Элемент списка чатов.
 * Кликабельная ссылка на комнату чата.
 *
 * @param props - Пропсы компонента
 */
export function ChatListItem({ chat }: ChatListItemProps) {
    return (
        <Link
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
                <Flex direction="column" className={styles.chatInfo}>
                    <Flex justify="between">
                        <Text weight="bold" size="3" truncate>
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
                {chat.unread && chat.unread > 0 && (
                    <Box className={styles.unreadBadge}>{chat.unread}</Box>
                )}
            </Flex>
        </Link>
    );
}

export type { ChatItem };
