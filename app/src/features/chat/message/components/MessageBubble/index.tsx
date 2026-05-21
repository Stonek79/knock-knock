import clsx from "clsx";
import { Forward, RefreshCw, Star } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "yet-another-react-lightbox/styles.css";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useLongPress } from "@/hooks/useLongPress";
import {
    ATTACHMENT_TYPES,
    ICON_SIZE,
    MESSAGE_POSITION,
    MESSAGE_STATUS,
    ROOM_TYPE,
} from "@/lib/constants";
import type {
    Attachment,
    MessagePosition,
    RoomType,
    UIMessageStatus,
} from "@/lib/types";
import { getUserColor } from "@/lib/utils/colors";
import { AttachmentRenderer } from "./components/AttachmentRenderer";
import { ReplyBlock, type ReplyBlockData } from "./components/ReplyBlock";
import { StatusIcon } from "./components/StatusIcon";
import { TranscriptBlock } from "./components/TranscriptBlock";
import { ZoomBlock } from "./components/ZoomBlock";
import styles from "./message-bubble.module.css";

interface MessageBubbleProps {
    content: string | null;
    isOwn: boolean;
    timestamp: string;
    senderName?: string;
    senderAvatar?: string;
    status?: UIMessageStatus;
    isEdited?: boolean;
    isDeleted?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    isSelectionMode?: boolean;
    isEditing?: boolean;
    isStarred?: boolean;
    isFailed?: boolean;
    onReply?: () => void;
    onRetry?: () => void;
    groupPosition?: MessagePosition;
    replyTo?: ReplyBlockData | null;
    forwardFromName?: string;
    onReplyClick?: (messageId: string) => void;
    attachments?: Attachment[] | null;
    roomKey?: CryptoKey;
    roomType?: RoomType;
    userId: string;
}

/**
 * Основной компонент пузыря сообщения.
 */
export function MessageBubble({
    content,
    isOwn,
    timestamp,
    senderName,
    senderAvatar,
    status = MESSAGE_STATUS.SENT,
    isEdited = false,
    isDeleted = false,
    isSelected = false,
    onToggleSelection,
    isSelectionMode = false,
    isEditing = false,
    isStarred = false,
    isFailed = false,
    onReply,
    onRetry,
    groupPosition = MESSAGE_POSITION.SINGLE,
    replyTo = null,
    forwardFromName,
    onReplyClick,
    attachments = null,
    roomKey,
    roomType,
    userId,
}: MessageBubbleProps) {
    const { t } = useTranslation();
    const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
    const hasLongPressedRef = useRef(false);

    const [hasMediaError, setHasMediaError] = useState(false);
    const showError = isFailed || hasMediaError;

    const hasAudioAttachment = useMemo(() => {
        return attachments?.some((a) => a.type === ATTACHMENT_TYPES.AUDIO);
    }, [attachments]);

    const imageAttachments = useMemo(() => {
        return (
            attachments?.filter((a) => a.type === ATTACHMENT_TYPES.IMAGE) || []
        );
    }, [attachments]);

    // Проверяем, состоит ли сообщение ИСКЛЮЧИТЕЛЬНО из ОДНОЙ картинки
    const isImageOnly =
        !content &&
        attachments?.length === 1 &&
        imageAttachments.length === 1 &&
        !isDeleted;

    const timeString = new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    // Отмечаем цветом разных пользователей
    const userColor = senderName ? getUserColor(senderName) : undefined;

    // Логика Swipe-to-Reply (мобильные устройства)
    const [swipeOffset, setSwipeOffset] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isEditing || isSelectionMode) {
            return;
        }

        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) {
            return;
        }

        if (isEditing || isSelectionMode) {
            return;
        }

        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        // Определяем, что это именно горизонтальный свайп, а не вертикальный скролл
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            if (deltaX < 0) {
                // Разрешаем свайп только влево
                setSwipeOffset(Math.max(deltaX, -60)); // Ограничиваем максимальное натяжение
            }
        }
    };

    const handleTouchEnd = () => {
        if (swipeOffset <= -40) {
            onReply?.();
            // Легкая вибрация, если поддерживается браузером
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(50);
            }
        }

        setSwipeOffset(0);
        touchStartX.current = null;
        touchStartY.current = null;
    };

    // Long Press для выделения сообщения (мобилка)
    const { onPointerDown, onPointerUp, onPointerLeave } = useLongPress(
        () => {
            if (!isEditing) {
                hasLongPressedRef.current = true;
                onToggleSelection?.();
            }
        },
        { delay: 400 },
    );

    const wrapper = clsx(styles.bubbleWrapper, {
        [styles.own]: isOwn,
        [styles.peer]: !isOwn,
        [styles.selected]: isSelected,
    });

    const bubble = clsx(styles.bubble, {
        [styles.bubbleOwn]: isOwn,
        [styles.bubblePeer]: !isOwn,
        [styles.bubbleImageOnly]: isImageOnly,
    });

    const metadataContent = (
        <>
            {isStarred && <Star size={ICON_SIZE.xs} className={styles.star} />}
            <span className={styles.time}>
                {timeString}
                {isEdited && !isDeleted && ` • ${t("chat.edited", "изм.")}`}
            </span>
            {showError ? (
                <Button
                    className={styles.retryBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRetry?.();
                    }}
                    title={t("chat.retry", "Повторить")}
                >
                    <RefreshCw size={ICON_SIZE.xs} />
                </Button>
            ) : (
                <StatusIcon
                    status={status}
                    isOwn={isOwn}
                    isDeleted={isDeleted}
                    iconClassName={styles.iconSmall}
                    sentClassName={styles.statusIconSent}
                    readClassName={styles.statusIconRead}
                />
            )}
        </>
    );

    return (
        <Flex
            className={wrapper}
            data-group-position={groupPosition}
            data-testid="message-bubble"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            // Гибридный подход: мобилка = Long Press, десктоп = клик
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;

                // Медиа-элементы: картинки, видео, или кастомные медиа-контейнеры (data-media)
                const isMedia = target.closest("img, video, [data-media]");

                // Интерактивные: нативные кнопки, ссылки, инпуты и кастомные контролы (data-interactive)
                const isInteractive = target.closest(
                    "button, a, input, textarea, select, [data-interactive]",
                );

                // Блокируем лонг-пресс только если это "чистый" интерактивный элемент (без медиа внутри)
                if (isInteractive && !isMedia) {
                    return;
                }
                onPointerDown(e);
            }}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onClickCapture={(e) => {
                // 1. Блокируем "фантомный" клик, который браузер генерирует сразу после отпускания пальца
                if (hasLongPressedRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => {
                        hasLongPressedRef.current = false;
                    }, 50);
                    return;
                }

                // 2. Если режим выделения УЖЕ активен, перехватываем любой клик (даже по фото или файлу)
                if (isSelectionMode && !isEditing && onToggleSelection) {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSelection();
                }
            }}
        >
            {!isOwn && roomType !== ROOM_TYPE.DIRECT && (
                <Box className={styles.avatarContainer}>
                    {groupPosition === MESSAGE_POSITION.SINGLE ||
                    groupPosition === MESSAGE_POSITION.END ? (
                        <Avatar
                            src={senderAvatar || undefined}
                            name={senderName}
                        />
                    ) : (
                        <Box className={styles.avatarPlaceholder} />
                    )}
                </Box>
            )}

            <Box className={bubble}>
                {!isOwn &&
                    senderName &&
                    (groupPosition === MESSAGE_POSITION.SINGLE ||
                        groupPosition === MESSAGE_POSITION.START) && (
                        <span
                            className={clsx(styles.senderName, {
                                color: userColor,
                            })}
                        >
                            {senderName}
                        </span>
                    )}
                {forwardFromName && (
                    <Flex
                        align="center"
                        gap="1"
                        className={styles.forwardBlock}
                    >
                        <Forward size={ICON_SIZE.xs} />
                        <Text className={styles.forwardText}>
                            {t("chat.forwardedFrom", "Переслано от:")}{" "}
                            <span>{forwardFromName}</span>
                        </Text>
                    </Flex>
                )}
                {replyTo && (
                    <ReplyBlock replyData={replyTo} onClick={onReplyClick} />
                )}
                {!isDeleted && (
                    <AttachmentRenderer
                        attachments={attachments || []}
                        setLightboxIndex={setLightboxIndex}
                        isOwn={isOwn}
                        hasTranscript={!!content && hasAudioAttachment}
                        isTranscriptExpanded={isTranscriptExpanded}
                        onToggleTranscript={() =>
                            setIsTranscriptExpanded((prev) => !prev)
                        }
                        roomKey={roomKey}
                        userId={userId}
                        onMediaError={setHasMediaError}
                    />
                )}
                {isDeleted ? (
                    <Text className={styles.deletedContent}>
                        {t("chat.messageDeleted", "Сообщение удалено")}
                    </Text>
                ) : content && hasAudioAttachment ? (
                    <>
                        {isTranscriptExpanded ? (
                            <TranscriptBlock content={content} />
                        ) : null}
                        <Box className={styles.metadata}>{metadataContent}</Box>
                    </>
                ) : content ? (
                    <Text className={styles.content} data-testid="message-text">
                        <Box className={styles.metadata}>{metadataContent}</Box>
                        {content}
                    </Text>
                ) : null}
                {isImageOnly && (
                    <Box
                        className={clsx(
                            styles.metadata,
                            styles.metadataOverlay,
                        )}
                    >
                        {metadataContent}
                    </Box>
                )}
            </Box>

            <ZoomBlock
                imageAttachments={imageAttachments}
                roomKey={roomKey}
                roomType={roomType}
                userId={userId}
                isDeleted={isDeleted}
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                index={lightboxIndex}
            />
        </Flex>
    );
}
