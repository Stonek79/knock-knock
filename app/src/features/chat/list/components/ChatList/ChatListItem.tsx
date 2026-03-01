import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Box } from "@/components/layout/Box";
import { Avatar } from "@/components/ui/Avatar";
import { ROUTES } from "@/lib/constants";
import styles from "./chatlist.module.css";

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
    const link = clsx(styles.chatListItem, styles.chatListItemActive);

    if (linkPrefix === ROUTES.FAVORITES) {
        return (
            <Link
                to={ROUTES.FAVORITES_ROOM}
                params={{ roomId: chat.id }}
                className={styles.chatListItem}
                activeProps={{
                    className: link,
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
                className: link,
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
        <div className={styles.itemContainer}>
            <Avatar
                size="md"
                src={chat.avatar}
                name={chat.name.replace(/🔒\s*/, "")}
            />
            <div className={styles.chatInfo}>
                <div className={styles.name}>
                    <span className={styles.chatName}>{chat.name}</span>
                    <span className={styles.chatTime}>{chat.time}</span>
                </div>
                <span className={clsx(styles.lastMessage, styles.truncate)}>
                    {chat.lastMessage}
                </span>
            </div>
            {chat?.unread && chat.unread > 0 ? (
                <Box className={styles.unreadBadge}>{chat?.unread}</Box>
            ) : null}
        </div>
    );
}
