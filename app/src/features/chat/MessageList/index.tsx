/**
 * Компонент списка сообщений.
 * Отображает сообщения, обрабатывает скролл и состояния загрузки/пустого списка.
 * Поддерживает режим выделения (Selection Mode) и редактирования.
 */
import { Box, Flex, IconButton, Text } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown } from "lucide-react";
import { type RefObject, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { useUserActivity } from "@/hooks/useUserActivity";
import { DB_TABLES } from "@/lib/constants";
import { MessageService } from "@/lib/services/message";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { getMessageGroupPosition } from "@/lib/utils/messageGrouping";
import { useAuthStore } from "@/stores/auth";
import { UnreadDivider } from "../components/UnreadDivider";
import { useChatScroll } from "../hooks/useChatScroll";
import { MessageBubble } from "../MessageBubble";
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
        // Также обновляем активность при прокрутке
        triggerActivity();
    };

    // Expose scrollToBottom to parent via ref
    useImperativeHandle(scrollRef, () => ({ scrollToBottom }), [
        scrollToBottom,
    ]);

    const queryClient = useQueryClient();

    const handleToggleStar = async (messageId: string, isStarred: boolean) => {
        const result = await MessageService.toggleStar(messageId, isStarred);
        if (result.isOk()) {
            // Инвалидируем сообщения комнаты и список избранного
            queryClient.invalidateQueries({ queryKey: [DB_TABLES.MESSAGES] });
            queryClient.invalidateQueries({ queryKey: [DB_TABLES.FAVORITES] });
        }
    };

    // Состояние загрузки
    if (messagesLoading) {
        return (
            <Flex justify="center" align="center" className={styles.loadingBox}>
                <Text color="gray">
                    {user?.id
                        ? t("chat.loadingMessages", "Загрузка сообщений...")
                        : t("common.authorizing", "Авторизация...")}
                </Text>
            </Flex>
        );
    }

    // Пустой список
    if (messages?.length === 0) {
        return (
            <Flex justify="center" align="center" className={styles.emptyBox}>
                <Text color="gray">
                    {isFavoritesView
                        ? t(
                              "chat.noFavoritesInThisChat",
                              "В этом чате нет избранных сообщений",
                          )
                        : t("chat.noMessages", "Нет сообщений")}
                </Text>
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

                            // Grouping Logic
                            const prevMsg = messages[index - 1];
                            const nextMsg = messages[index + 1];

                            const groupPosition = getMessageGroupPosition(
                                msg,
                                prevMsg,
                                nextMsg,
                            );

                            return (
                                <Box key={msg.id} style={{ width: "100%" }}>
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
                                        onToggleStar={(starred) =>
                                            handleToggleStar(msg.id, starred)
                                        }
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
                        size="3"
                        radius="full"
                        variant="solid"
                        color="blue"
                        onClick={() => scrollToBottom()}
                        className={`${styles.scrollButton} ${!isUserActive ? styles.scrollButtonHidden : ""}`}
                    >
                        <ArrowDown width="18" height="18" />
                    </IconButton>
                </Box>
            )}
        </Box>
    );
}
