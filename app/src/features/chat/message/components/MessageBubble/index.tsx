import clsx from "clsx";
import { Forward, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import DownloadPlugin from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { useLongPress } from "@/hooks/useLongPress";
import { BREAKPOINTS, useMediaQuery } from "@/hooks/useMediaQuery";
import {
    ATTACHMENT_TYPES,
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
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useLightboxSlides } from "../../hooks/useLightboxSlides";
import { AttachmentRenderer } from "./components/AttachmentRenderer";
import { StatusIcon } from "./components/StatusIcon";
import { TranscriptBlock } from "./components/TranscriptBlock";
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
    isEditing?: boolean;
    isStarred?: boolean;
    groupPosition?: MessagePosition;
    attachments?: Attachment[] | null;
    roomKey?: CryptoKey;
    roomType?: RoomType;
    userId: string;
}

/**
 * Основной компонент пузыря сообщения.
 * Декомпозирован: AttachmentRenderer, StatusIcon, TranscriptBlock вынесены в подпапки.
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
    isEditing = false,
    isStarred = false,
    groupPosition = MESSAGE_POSITION.SINGLE,
    attachments = null,
    roomKey,
    roomType,
    userId,
}: MessageBubbleProps) {
    const { t } = useTranslation();
    const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

    const hasAudioAttachment = attachments?.some(
        (a) => a.type === ATTACHMENT_TYPES.AUDIO,
    );
    const imageAttachments =
        attachments?.filter((a) => a.type === ATTACHMENT_TYPES.IMAGE) || [];

    const { slides } = useLightboxSlides({
        attachments: imageAttachments,
        userId,
        roomKey,
        enabled: lightboxIndex >= 0,
    });

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

    // Определяем мобильное устройство
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // Long Press для выделения сообщения (мобилка)
    const { onPointerDown, onPointerUp, onPointerLeave } = useLongPress(
        () => {
            if (!isEditing) {
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
            <StatusIcon
                status={status}
                isOwn={isOwn}
                isDeleted={isDeleted}
                iconClassName={styles.iconSmall}
                sentClassName={styles.statusIconSent}
                readClassName={styles.statusIconRead}
            />
        </>
    );

    return (
        <Flex
            className={wrapper}
            data-group-position={groupPosition}
            data-testid="message-bubble"
            // Гибридный подход: мобилка = Long Press, десктоп = клик
            onPointerDown={(e) => {
                // Игнорируем если клик по интерактивному элементу
                const target = e.target as HTMLElement;
                if (
                    target.closest(
                        "button, a, img, [data-interactive], .imageButton, .transcriptToggle",
                    )
                ) {
                    return;
                }
                onPointerDown(e);
            }}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onClick={() => {
                // На десктопе — выделение кликом
                if (!isMobile && !isEditing && onToggleSelection) {
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
                            className={styles.senderName}
                            style={{ color: userColor }}
                        >
                            {senderName}
                        </span>
                    )}
                <Flex>
                    <Box>
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
                        />
                        {isDeleted ? (
                            <Text className={styles.deletedContent}>
                                {t("chat.messageDeleted", "Сообщение удалено")}
                            </Text>
                        ) : content && hasAudioAttachment ? (
                            isTranscriptExpanded ? (
                                <TranscriptBlock content={content} />
                            ) : null
                        ) : content ? (
                            <Text
                                className={styles.content}
                                data-testid="message-text"
                            >
                                {content}
                            </Text>
                        ) : null}
                    </Box>

                    {isImageOnly ? (
                        <Box
                            className={clsx(
                                styles.metadata,
                                styles.metadataOverlay,
                            )}
                        >
                            {metadataContent}
                        </Box>
                    ) : (
                        <Box className={styles.metadata}>{metadataContent}</Box>
                    )}
                </Flex>
            </Box>

            {imageAttachments.length > 0 && (
                <Lightbox
                    open={lightboxIndex >= 0}
                    close={() => setLightboxIndex(-1)}
                    index={lightboxIndex}
                    slides={slides}
                    plugins={[Zoom, DownloadPlugin]}
                    carousel={{ finite: imageAttachments.length === 1 }}
                    render={{
                        buttonPrev:
                            imageAttachments.length <= 1
                                ? () => null
                                : undefined,
                        buttonNext:
                            imageAttachments.length <= 1
                                ? () => null
                                : undefined,
                    }}
                    toolbar={{
                        buttons: [
                            <button
                                key="star"
                                type="button"
                                className="yarl__button"
                                onClick={() => {
                                    // Кнопка в разработке
                                }}
                                title={t("chat.star", "В избранное")}
                            >
                                <Star size={24} />
                            </button>,
                            <button
                                key="forward"
                                type="button"
                                className="yarl__button"
                                onClick={() => {
                                    // Кнопка в разработке
                                }}
                                title={t("chat.forward", "Переслать")}
                            >
                                <Forward size={24} />
                            </button>,
                            "download",
                            "close",
                        ],
                    }}
                />
            )}
        </Flex>
    );
}
