/**
 * Компонент списка сообщений.
 * Отображает сообщения, обрабатывает скролл и состояния загрузки/пустого списка.
 * Поддерживает режим выделения (Selection Mode) и редактирования.
 */

import clsx from "clsx";
import { ArrowDown } from "lucide-react";
import { type RefObject, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { useUserActivity } from "@/hooks/useUserActivity";
import type { DecryptedMessageWithProfile, RoomType } from "@/lib/types";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { getMessageGroupPosition } from "@/lib/utils/messageGrouping";
import { useChatScroll } from "../../../room/hooks/useChatScroll";
import { MessageBubble } from "../../components/MessageBubble";
import { UnreadDivider } from "../../components/UnreadDivider";
import styles from "./message-list.module.css";

interface MessageListProps {
    /** Список сообщений */
    messages?: DecryptedMessageWithProfile[];
    /** Состояние загрузки */
    messagesLoading?: boolean;
    /** ID текущего пользователя для изоляции медиа и проверки авторства */
    userId: string;
    /** Набор выбранных сообщений */
    selectedMessageIds?: Set<string>;
    /** Обработчик выбора сообщения */
    onToggleSelection?: (id: string) => void;
    /** ID редактируемого сообщения */
    editingId?: string | null;
    /** Ref для внешнего управления скроллом */
    scrollRef?: RefObject<{ scrollToBottom: () => void } | null>;
    /** ID первого непрочитанного сообщения */
    firstUnreadId?: string | null;
    /** Состояние Избранного (фильтрация только звезд) */
    isFavoritesView?: boolean;
    /** Ключ шифрования комнаты */
    roomKey?: CryptoKey;
    /** Тип комнаты */
    roomType?: RoomType;
}

export function MessageList({
    messages,
    messagesLoading,
    userId,
    selectedMessageIds,
    onToggleSelection,
    editingId,
    scrollRef,
    firstUnreadId,
    isFavoritesView,
    roomKey,
    roomType,
}: MessageListProps) {
    const { t } = useTranslation();

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
                onScroll={handleScroll}
                className={styles.scrollContainer}
            >
                <Flex direction="column" gap="3">
                    {messages?.map(
                        (msg: DecryptedMessageWithProfile, index) => {
                            const isOwn = userId === msg.sender_id;
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
                                        userId={userId}
                                        timestamp={
                                            (msg.is_deleted
                                                ? msg.updated_at
                                                : msg.created_at) ||
                                            msg.created_at
                                        }
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
                                        attachments={msg.attachments}
                                        roomKey={roomKey}
                                        roomType={roomType}
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
                        className={clsx(
                            styles.scrollButton,
                            !isUserActive && styles.scrollButtonHidden,
                        )}
                    >
                        <ArrowDown size={ICON_SIZE.sm} />
                    </IconButton>
                </Box>
            )}
        </Box>
    );
}
