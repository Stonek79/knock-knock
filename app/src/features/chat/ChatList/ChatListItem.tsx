import { Avatar, Box, Flex, Text } from "@radix-ui/themes";
import { Link } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";
import styles from "./chatlist.module.css";

/**
 * Данные элемента списка чатов.
 */
interface ChatItem {
    id: string;
    name: string;
    avatar?: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
}

interface ChatListItemProps {
    /** Данные чата */
    chat: ChatItem;
    /** Префикс для ссылки (например /favorites для сохранения контекста) */
    linkPrefix?: string;
}

/**
 * Элемент списка чатов.
 * Кликабельная ссылка на комнату чата.
 *
 * @param props - Пропсы компонента
 */
export function ChatListItem({
    chat,
    linkPrefix = ROUTES.CHAT_LIST,
}: ChatListItemProps) {
    if (linkPrefix === ROUTES.FAVORITES) {
        return (
            <Link
                to="/favorites/$roomId"
                params={{ roomId: chat.id }}
                className={styles.chatListItem}
                activeProps={{
                    className: `${styles.chatListItem} ${styles.chatListItemActive}`,
                }}
            >
                <ChatListItemContent chat={chat} />
            </Link>
        );
    }

    return (
        <Link
            to="/chat/$roomId"
            params={{ roomId: chat.id }}
            className={styles.chatListItem}
            activeProps={{
                className: `${styles.chatListItem} ${styles.chatListItemActive}`,
            }}
        >
            <ChatListItemContent chat={chat} />
        </Link>
    );
}

/**
 * Внутренний контент элемента списка для переиспользования.
 */
function ChatListItemContent({ chat }: { chat: ChatItem }) {
    return (
        <Flex p="3" gap="3" align="center" width="100%">
            <Avatar
                size="3"
                src={chat.avatar}
                fallback={chat.name.replace(/🔒\s*/, "")[0]}
                radius="full"
                color="gray"
                variant="soft"
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
                <Text
                    color="gray"
                    size="2"
                    truncate
                    className={styles.lastMessage}
                >
                    {chat.lastMessage}
                </Text>
            </Flex>
            {chat?.unread && chat.unread > 0 ? (
                <Box className={styles.unreadBadge}>{chat?.unread}</Box>
            ) : null}
        </Flex>
    );
}

export type { ChatItem };
