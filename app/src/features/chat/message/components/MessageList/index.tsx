/**
 * Компонент списка сообщений.
 * Отображает сообщения, обрабатывает скролл и состояния загрузки/пустого списка.
 * Поддерживает режим выделения (Selection Mode) и редактирования.
 */

import { ArrowDown } from "lucide-react";
import { type RefObject, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { MessageBubble } from "@/features/chat/message/components/MessageBubble";
import { UnreadDivider } from "@/features/chat/message/components/UnreadDivider";
import { useChatScroll } from "@/features/chat/room/hooks/useChatScroll";
import { useUserActivity } from "@/hooks/useUserActivity";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { getMessageGroupPosition } from "@/lib/utils/messageGrouping";
import { useAuthStore } from "@/stores/auth";
import styles from "./message-list.module.css";

interface MessageListProps {
    messages?: DecryptedMessageWithProfile[];
    messagesLoading?: boolean;
    selectedMessageIds?: Set<string>;
    onToggleSelection?: (id: string) => void;
    editingId?: string | null;
    /** Ref для внешнего управления скроллом */
    scrollRef?: RefObject<{ scrollToBottom: () => void } | null>;
    /** ID первого непрочитанного сообщения */
    firstUnreadId?: string | null;
    /** Состояние Избранного (фильтрация только звезд) */
    isFavoritesView?: boolean;
}

export function MessageList({
    messages,
    messagesLoading,
    selectedMessageIds,
    onToggleSelection,
    editingId,
    scrollRef,
    firstUnreadId,
    isFavoritesView,
}: MessageListProps) {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    const {
        viewportRef,
        showScrollButton,
        scrollToBottom,
        handleScroll: handleChatScroll,
    } = useChatScroll({
        messages: messages || [],
    });

    // Логика авто-скрытия кнопки прокрутки
    const { isActive: isUserActive, triggerActivity } = useUserActivity(2000);

    // Общий обработчик прокрутки
    const handleScroll = () => {
        handleChatScroll();
        triggerActivity();
    };

    // Expose scrollToBottom to parent via ref
    useImperativeHandle(scrollRef, () => ({ scrollToBottom }), [
        scrollToBottom,
    ]);

    // Состояние загрузки
    if (messagesLoading) {
        return (
            <Flex justify="center" align="center" className={styles.loadingBox}>
                <span className={styles.statusText}>
                    {user?.id
                        ? t("chat.loadingMessages", "Загрузка сообщений...")
                        : t("common.authorizing", "Авторизация...")}
                </span>
            </Flex>
        );
    }

    // Пустой список
    if (messages?.length === 0) {
        return (
            <Flex justify="center" align="center" className={styles.emptyBox}>
                <span className={styles.statusText}>
                    {isFavoritesView
                        ? t(
                              "chat.noFavoritesInThisChat",
                              "В этом чате нет избранных сообщений",
                          )
                        : t("chat.noMessages", "Нет сообщений")}
                </span>
            </Flex>
        );
    }

    return (
        <Box className={styles.listWrapper}>
            {/* Скроллируемый контейнер */}
            <div
                ref={viewportRef}
                onScroll={handleScroll}
                className={styles.scrollContainer}
            >
                <Flex direction="column" gap="3">
                    {messages?.map(
                        (msg: DecryptedMessageWithProfile, index) => {
                            const isOwn = user?.id === msg.sender_id;
                            const isEditing = editingId === msg.id && isOwn;
                            const isFirstUnread = msg.id === firstUnreadId;

                            const prevMsg = messages[index - 1];
                            const nextMsg = messages[index + 1];

                            const groupPosition = getMessageGroupPosition(
                                msg,
                                prevMsg,
                                nextMsg,
                            );

                            return (
                                <Box
                                    key={msg.id}
                                    className={styles.messageWrapper}
                                >
                                    {isFirstUnread && <UnreadDivider />}
                                    <MessageBubble
                                        content={msg.content}
                                        isOwn={isOwn}
                                        timestamp={msg.created_at}
                                        senderName={msg.profiles?.display_name}
                                        senderAvatar={
                                            msg.profiles?.avatar_url ??
                                            undefined
                                        }
                                        status={msg.status}
                                        isEdited={msg.is_edited}
                                        isDeleted={msg.is_deleted}
                                        isStarred={msg.is_starred}
                                        isSelected={selectedMessageIds?.has(
                                            msg.id,
                                        )}
                                        onToggleSelection={() =>
                                            onToggleSelection?.(msg.id)
                                        }
                                        isEditing={isEditing}
                                        groupPosition={groupPosition}
                                    />
                                </Box>
                            );
                        },
                    )}
                </Flex>
            </div>
            {showScrollButton && (
                <Box className={styles.scrollButtonWrapper}>
                    <IconButton
                        size="lg"
                        shape="round"
                        variant="solid"
                        onClick={() => scrollToBottom()}
                        className={`${styles.scrollButton} ${!isUserActive ? styles.scrollButtonHidden : ""}`}
                    >
                        <ArrowDown size={ICON_SIZE.sm} />
                    </IconButton>
                </Box>
            )}
        </Box>
    );
}
