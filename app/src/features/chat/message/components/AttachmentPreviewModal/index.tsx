import {
    FileText,
    MoreHorizontal,
    SendHorizontal,
    Smile,
    X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { TextArea } from "@/components/ui/TextArea";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./attachment-preview-modal.module.css";

interface AttachmentPreviewModalProps {
    /** Файлы для предпросмотра */
    attachments: File[];
    /** Текущий текст подписи */
    caption: string;
    /** Функция изменения текста подписи */
    onCaptionChange: (text: string) => void;
    /** Открыто ли модальное окно */
    isOpen: boolean;
    /** Закрытие модального окна */
    onClose: () => void;
    /** Удаление вложения по индексу */
    onRemoveAttachment: (index: number) => void;
    /** Отправка сообщения с вложениями */
    onSend: () => void;
    /** Флаг отправки (чтобы блокировать UI) */
    isSending?: boolean;
}

/**
 * Модальное окно предпросмотра выбранных медиафайлов перед отправкой.
 * Использует Dialog.Content, который уже создаёт Portal + Overlay внутри себя.
 * CSS-класс .content.content переопределяет стандартную ширину и отступы.
 */
export function AttachmentPreviewModal({
    attachments,
    caption,
    onCaptionChange,
    isOpen,
    onClose,
    onRemoveAttachment,
    onSend,
    isSending = false,
}: AttachmentPreviewModalProps) {
    const { t } = useTranslation();

    if (!isOpen || attachments.length === 0) {
        return null;
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Content className={styles.content} hideCloseButton>
                <Flex
                    justify="between"
                    align="center"
                    className={styles.header}
                >
                    <Dialog.Close asChild>
                        <IconButton
                            variant="ghost"
                            size="md"
                            aria-label={t("chat.close", "Закрыть")}
                            disabled={isSending}
                            className={styles.headerBtn}
                        >
                            <X size={ICON_SIZE.md} />
                        </IconButton>
                    </Dialog.Close>

                    <Text weight="medium" className={styles.title}>
                        {attachments.length} {t("chat.mediaCount", "медиа")}
                    </Text>

                    <IconButton
                        variant="ghost"
                        size="md"
                        aria-label={t("chat.options", "Опции")}
                        disabled={isSending}
                        className={styles.headerBtn}
                    >
                        <MoreHorizontal size={ICON_SIZE.md} />
                    </IconButton>
                </Flex>

                {/* Превью медиа */}
                <Flex
                    align="center"
                    justify="center"
                    className={styles.mediaArea}
                >
                    {attachments.map((file, idx) => {
                        const uniqueKey = `${file.name}-${file.size}-${idx}`;
                        const isImage = file.type.startsWith("image/");
                        const isVideo = file.type.startsWith("video/");

                        return (
                            <Box key={uniqueKey} className={styles.mediaItem}>
                                {isImage ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className={styles.mediaPreview}
                                    />
                                ) : isVideo ? (
                                    <video
                                        src={URL.createObjectURL(file)}
                                        className={styles.mediaPreview}
                                        controls
                                    >
                                        <track kind="captions" />
                                    </video>
                                ) : (
                                    <Flex
                                        direction="column"
                                        align="center"
                                        justify="center"
                                        gap="2"
                                        className={styles.docPreview}
                                    >
                                        <FileText
                                            size={ICON_SIZE.xl}
                                            className={styles.docIcon}
                                        />
                                        <Text
                                            size="sm"
                                            className={styles.docName}
                                        >
                                            {file.name}
                                        </Text>
                                    </Flex>
                                )}

                                {attachments.length > 1 && (
                                    <IconButton
                                        variant="solid"
                                        intent="danger"
                                        shape="round"
                                        size="xs"
                                        className={styles.removeButton}
                                        onClick={() => onRemoveAttachment(idx)}
                                        disabled={isSending}
                                        aria-label={t(
                                            "chat.removeAttachment",
                                            "Удалить",
                                        )}
                                    >
                                        <X size={ICON_SIZE.xs} />
                                    </IconButton>
                                )}
                            </Box>
                        );
                    })}
                </Flex>

                {/* Подвал: подпись + кнопки */}
                <Flex align="center" gap="3" className={styles.footer}>
                    <TextArea
                        value={caption}
                        onChange={(e) => onCaptionChange(e.target.value)}
                        placeholder={t(
                            "chat.addCaptionShort",
                            "Добавить подпись...",
                        )}
                        disabled={isSending}
                        className={styles.captionInput}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                    />

                    <IconButton
                        variant="ghost"
                        size="md"
                        className={styles.emojiBtn}
                        disabled={isSending}
                        aria-label={t("chat.emoji", "Эмодзи")}
                    >
                        <Smile size={ICON_SIZE.md} />
                    </IconButton>

                    <IconButton
                        variant="ghost"
                        size="md"
                        onClick={onSend}
                        disabled={isSending}
                        className={styles.sendBtn}
                        aria-label={t("chat.send", "Отправить")}
                    >
                        <SendHorizontal size={ICON_SIZE.md} />
                    </IconButton>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
