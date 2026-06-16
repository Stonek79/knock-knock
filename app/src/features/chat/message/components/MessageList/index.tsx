/**
 * Компонент списка сообщений.
 * Отображает сообщения, обрабатывает скролл и состояния загрузки/пустого списка.
 * Поддерживает режим выделения (Selection Mode) и редактирования.
 */

import { type RefObject, useImperativeHandle, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { CLIENT_MESSAGE_STATUS } from "@/lib/constants";
import type {
    ChatMessage,
    DecryptedMessageWithProfile,
    RoomType,
} from "@/lib/types";
import { getMessageGroupPosition } from "@/lib/utils/messageGrouping";
import { useChatScroll } from "../../../room/hooks/useChatScroll";
import { MessageBubble } from "../../components/MessageBubble";
import type { ReplyBlockData } from "../../components/MessageBubble/components/ReplyBlock";
import { UnreadDivider } from "../../components/UnreadDivider";
import styles from "./message-list.module.css";
import { ScrollButton } from "./ScrollButton";

interface MessageListProps {
    /** Список сообщений */
    messages?: DecryptedMessageWithProfile[];
    /** Состояние загрузки */
    messagesLoading?: boolean;
    /** Состояние загрузки комнаты */
    isRoomLoading?: boolean;
    /** ID текущего пользователя для изоляции медиа и проверки авторства */
    userId: string;
    /** Набор выбранных сообщений */
    selectedMessageIds?: Set<string>;
    /** Обработчик выбора сообщения */
    onToggleSelection?: (id: string) => void;
    /** Обработчик для ответа на сообщение (через меню или свайп) */
    onReplyMessage?: (id: string) => void;
    /** ID редактируемого сообщения */
    editingId?: string | null;
    /** Ref для внешнего управления скроллом */
    scrollRef?: RefObject<{ scrollToBottom: () => void } | null>;
    /** ID первого непрочитанного сообщения */
    firstUnreadId?: string | null;
    /** ID статической плашки первого непрочитанного сообщения */
    unreadDividerId?: string | null;
    /** Обработчик скрытия плашки непрочитанных */
    onDismissDivider?: () => void;
    /** Состояние Избранного (фильтрация только звезд) */
    isFavoritesView?: boolean;
    /** Ключ шифрования комнаты */
    roomKey?: CryptoKey;
    /** Тип комнаты */
    roomType?: RoomType;
    /** Обработчик повторной отправки сообщения */
    onRetry?: (message: ChatMessage) => void;
    /** ID комнаты чата */
    roomId?: string;
    /** Обработчик прочтения сообщения */
    onMarkMessageAsRead?: (message: DecryptedMessageWithProfile) => void;
}

export function MessageList({
    messages,
    messagesLoading,
    isRoomLoading,
    userId,
    selectedMessageIds,
    onToggleSelection,
    onReplyMessage,
    editingId,
    scrollRef,
    firstUnreadId,
    unreadDividerId,
    onDismissDivider,
    isFavoritesView,
    roomKey,
    roomType,
    onRetry,
    roomId,
    onMarkMessageAsRead,
}: MessageListProps) {
    const { t } = useTranslation();

    const {
        viewportRef,
        showScrollButton,
        scrollToBottom,
        handleScroll: handleChatScroll,
        unreadCount,
    } = useChatScroll({
        messages: messages || [],
        firstUnreadId,
        unreadDividerId,
        onDismissDivider,
        roomId,
        onMarkMessageAsRead,
        isRoomLoading,
    });

    // Expose scrollToBottom to parent via ref
    useImperativeHandle(scrollRef, () => ({ scrollToBottom }), [
        scrollToBottom,
    ]);

    const unknownMessage = t("chat.unknownUser", "Неизвестный");

    // Архитектурная оптимизация: мемоизируем маппинг элементов сообщений.
    const renderedMessages = useMemo(() => {
        // Режим выделения активируется, если выбрано хотя бы одно сообщение
        const isSelectionMode = (selectedMessageIds?.size ?? 0) > 0;

        return messages?.map((msg: DecryptedMessageWithProfile, index) => {
            const isOwn = userId === msg.sender;
            const isEditing = editingId === msg.id && isOwn;
            const isFirstUnread = msg.id === unreadDividerId;

            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];

            const groupPosition = getMessageGroupPosition(
                msg,
                prevMsg,
                nextMsg,
            );

            let replyToData: ReplyBlockData | null = null;

            // Получаем данные цитируемого сообщения
            if (msg.metadata?.reply_to_id) {
                const originalMsg = messages.find(
                    (m) => m.id === msg.metadata?.reply_to_id,
                );
                if (originalMsg) {
                    replyToData = {
                        id: originalMsg.id,
                        senderName:
                            originalMsg.profiles?.display_name ||
                            unknownMessage,
                        content: originalMsg.content,
                        attachments: originalMsg.attachments,
                        isDeleted: originalMsg.is_deleted,
                    };
                }
            }

            return (
                <Box
                    key={msg.id}
                    className={styles.messageWrapper}
                    data-message-id={msg.id}
                >
                    {isFirstUnread && <UnreadDivider />}
                    <MessageBubble
                        content={msg.content}
                        isOwn={isOwn}
                        userId={userId}
                        timestamp={
                            (msg.is_deleted ? msg.updated : msg.created) ||
                            msg.created
                        }
                        senderName={msg.profiles?.display_name}
                        senderAvatar={msg.profiles?.avatar_url ?? undefined}
                        status={msg.status}
                        isEdited={msg.is_edited}
                        isDeleted={msg.is_deleted}
                        isStarred={msg.is_starred}
                        isSelected={selectedMessageIds?.has(msg.id)}
                        onToggleSelection={() => onToggleSelection?.(msg.id)}
                        onReply={
                            onReplyMessage
                                ? () => onReplyMessage(msg.id)
                                : undefined
                        }
                        isSelectionMode={isSelectionMode}
                        isEditing={isEditing}
                        groupPosition={groupPosition}
                        replyTo={replyToData}
                        forwardFromName={msg.metadata?.forward_from_name}
                        onReplyClick={(id) => {
                            const element = document.querySelector(
                                `[data-message-id="${id}"]`,
                            );
                            if (element) {
                                element.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                });
                            }
                        }}
                        attachments={msg.attachments}
                        roomKey={roomKey}
                        roomType={roomType}
                        isFailed={
                            (msg as ChatMessage)._uiStatus ===
                            CLIENT_MESSAGE_STATUS.FAILED
                        }
                        onRetry={() => {
                            if (onRetry) {
                                onRetry(msg as ChatMessage);
                            }
                        }}
                    />
                </Box>
            );
        });
    }, [
        messages,
        userId,
        editingId,
        unreadDividerId,
        selectedMessageIds,
        onToggleSelection,
        onReplyMessage,
        roomKey,
        roomType,
        unknownMessage,
        onRetry,
    ]);

    // Состояние загрузки
    if (messagesLoading) {
        return (
            <Flex justify="center" align="center" className={styles.loadingBox}>
                <span className={styles.statusText}>
                    {userId
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
                onScroll={handleChatScroll}
                className={styles.scrollContainer}
            >
                <Flex direction="column" gap="3">
                    {renderedMessages}
                </Flex>
            </div>
            <ScrollButton
                scrollToBottom={scrollToBottom}
                showScrollButton={showScrollButton}
                unreadCount={unreadCount}
            />
        </Box>
    );
}
