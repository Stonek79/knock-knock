import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { ROUTES } from "@/lib/constants";
import styles from "./chatlist-item.module.css";

/**
 * Данные элемента списка чатов.
 */
export type ChatItem = {
    id: string;
    name: string;
    avatar?: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
    pinPosition?: number | null;
    isSystem?: boolean;
};

interface ChatListItemProps {
    /** Данные чата */
    chat: ChatItem;
    /** Префикс для ссылки (например /favorites для сохранения контекста) */
    linkPrefix?: string;
}

/**
 * Элемент списка чатов.
 * Кликабельная ссылка на комнату чата.
 */
export function ChatListItem({
    chat,
    linkPrefix = ROUTES.CHAT_LIST,
}: ChatListItemProps) {
    const linkClasses = clsx(styles.chatListItem, styles.chatListItemActive);

    if (linkPrefix === ROUTES.FAVORITES) {
        return (
            <Link
                to={ROUTES.FAVORITES_ROOM}
                params={{ roomId: chat.id }}
                className={styles.chatListItem}
                activeProps={{
                    className: linkClasses,
                }}
            >
                <ChatListItemContent chat={chat} />
            </Link>
        );
    }

    return (
        <Link
            to={ROUTES.CHAT_ROOM}
            params={{ roomId: chat.id }}
            className={styles.chatListItem}
            activeProps={{
                className: linkClasses,
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
        <Flex width="100%" minWidth={0} gap="3" data-testid="chat-item">
            {chat.isSystem ? (
                <Box className={styles.systemAvatarWrapper}>
                    <Avatar
                        size="md"
                        name={chat.name}
                        fallback="📢" // Рупор для системного чата
                    />
                </Box>
            ) : (
                <Avatar
                    size="md"
                    src={chat.avatar}
                    name={chat.name.replace(/🔒\s*/, "")}
                />
            )}
            <Box className={styles.chatInfo}>
                <Flex className={styles.name} align="center" justify="between">
                    <Text
                        className={styles.chatName}
                        data-testid="chat-item-name"
                    >
                        {chat.name}
                    </Text>
                    <Text className={styles.chatTime}>{chat.time}</Text>
                </Flex>
                <Text className={styles.lastMessage}>{chat.lastMessage}</Text>
            </Box>
            {chat?.unread && chat.unread > 0 ? (
                <Box className={styles.unreadBadge}>{chat?.unread}</Box>
            ) : null}
        </Flex>
    );
}
