/**
 * Компонент ввода сообщения.
 * Оптимизирован для мобильных устройств и десктопа.
 */

import { Mic, Paperclip, SendHorizontal, Smile, X } from "lucide-react";
import { type ChangeEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { MIME_PREFIXES } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useMessageInput } from "../../hooks/useMessageInput";
import { AttachmentPreviewModal } from "./../AttachmentPreviewModal";
import styles from "./message-input.module.css";

interface MessageInputProps {
    /** Коллбэк отправки сообщения */
    onSend: (text: string, files?: File[], audioBlob?: Blob) => Promise<void>;
    /** Коллбэк отмены (Escape) */
    onCancel?: () => void;
    /** Флаг блокировки ввода */
    disabled?: boolean;
    /** Начальное значение (для редактирования) */
    initialValue?: string | null;
    /** Коллбэк при изменении ввода (для скролла) */
    onInputChange?: () => void;
    /** Коллбэк уведомления о печати (typing indicator) */
    onTyping?: (isTyping: boolean) => void;
}

/**
 * Компонент ввода сообщения.
 * Использует наши кастомные IconButton и TextArea вместо Radix.
 * Иконки через ICON_SIZE — числовые значения, корректно работают в SVG.
 */
export function MessageInput({
    onSend,
    onCancel,
    disabled,
    initialValue,
    onInputChange,
    onTyping,
}: MessageInputProps) {
    const { t } = useTranslation();
    const toast = useToast();

    const {
        message,
        setMessage,
        sending,
        textareaRef,
        hasText,
        handleSend,
        handleSendAttachments,
        handleKeyDown,
        attachments,
        setAttachments,
        attachmentCaption,
        setAttachmentCaption,
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndSendRecording,
    } = useMessageInput({
        onSend,
        onCancel,
        disabled,
        initialValue: initialValue ?? undefined,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);

            // Пользователь запросил: выбор только 1 видео.
            const videoFiles = selectedFiles.filter((f) =>
                f.type.startsWith(MIME_PREFIXES.VIDEO),
            );
            const nonVideoFiles = selectedFiles.filter(
                (f) => !f.type.startsWith(MIME_PREFIXES.VIDEO),
            );

            let finalFiles = [...attachments];

            if (videoFiles.length > 0) {
                // Если уже есть прикрепленное видео или пытаются добавить больше одного
                const existingVideoCount = attachments.filter((f) =>
                    f.type.startsWith(MIME_PREFIXES.VIDEO),
                ).length;

                if (existingVideoCount > 0 || videoFiles.length > 1) {
                    toast({
                        title: t(
                            "chat.onlyOneVideoAllowed",
                            "Можно прикрепить только одно видео.",
                        ),
                        variant: "error",
                    });
                }

                // Берем только первое видео, если еще нет видео
                if (existingVideoCount === 0) {
                    finalFiles = [
                        ...finalFiles,
                        ...nonVideoFiles,
                        videoFiles[0],
                    ];
                } else {
                    finalFiles = [...finalFiles, ...nonVideoFiles];
                }
            } else {
                finalFiles = [...finalFiles, ...nonVideoFiles];
            }

            // Ограничение по общему количеству (максимум 10)
            if (finalFiles.length > 10) {
                toast({
                    title: t(
                        "chat.maxFilesReached",
                        "Можно прикрепить не более 10 файлов.",
                    ),
                    variant: "error",
                });
                finalFiles = finalFiles.slice(0, 10);
            }

            setAttachments(finalFiles);
            e.target.value = ""; // Сбрасываем input, чтобы можно было загрузить те же файлы еще раз
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Flex direction="column" className={styles.inputContainer}>
            {/* Модальное окно предпросмотра вложений */}
            <AttachmentPreviewModal
                isOpen={attachments.length > 0}
                attachments={attachments}
                caption={attachmentCaption}
                onCaptionChange={setAttachmentCaption}
                onClose={() => {
                    setAttachments([]);
                    setAttachmentCaption("");
                }}
                onRemoveAttachment={removeAttachment}
                onSend={handleSendAttachments}
                isSending={sending}
            />

            <Flex align="center" gap="2" className={styles.inputWrapper}>
                {/* Скрытый input для файлов */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className={styles.hiddenInput}
                    multiple
                    onChange={handleFileChange}
                />

                {/* Кнопка эмодзи */}
                <IconButton
                    variant="ghost"
                    size="md"
                    shape="round"
                    disabled={disabled || isRecording || sending}
                    type="button"
                    className={styles.actionButton}
                    aria-label={t("chat.emoji", "Эмодзи")}
                >
                    <Smile size={ICON_SIZE.sm} />
                </IconButton>

                {/* Кнопка вложения */}
                <IconButton
                    variant="ghost"
                    size="md"
                    shape="round"
                    disabled={disabled || isRecording || sending}
                    type="button"
                    className={styles.actionButton}
                    aria-label={t("chat.attachFile", "Прикрепить файл")}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Paperclip size={ICON_SIZE.sm} />
                </IconButton>

                {/* Поле ввода — наш кастомный TextArea */}
                <Box className={styles.textAreaContainer}>
                    {isRecording ? (
                        <Flex
                            align="center"
                            gap="2"
                            className={styles.recordingState}
                        >
                            <Box className={styles.recordingPulse} />
                            <Text className={styles.recordingTime}>
                                {recordingTime}s
                            </Text>
                            <IconButton
                                variant="outline"
                                size="sm"
                                shape="round"
                                intent="danger"
                                className={styles.cancelRecordingBtn}
                                onClick={stopRecording}
                            >
                                <X size={ICON_SIZE.xs} />{" "}
                                {t("chat.cancel", "Отмена")}
                            </IconButton>
                        </Flex>
                    ) : (
                        <TextArea
                            ref={textareaRef}
                            placeholder={t("chat.typeMessage", "Сообщение")}
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                onInputChange?.();
                                onTyping?.(e.target.value.length > 0);
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={disabled || sending}
                            className={styles.textArea}
                        />
                    )}
                </Box>

                {/* Кнопка отправки / микрофон */}
                {hasText || attachments.length > 0 ? (
                    <IconButton
                        size="md"
                        shape="round"
                        variant="ghost"
                        onClick={handleSend}
                        disabled={disabled || sending}
                        className={`${styles.actionButton} ${styles.sendButton}`}
                        aria-label={t("chat.send", "Отправить")}
                    >
                        <SendHorizontal size={ICON_SIZE.sm} />
                    </IconButton>
                ) : (
                    <IconButton
                        variant="ghost"
                        size="md"
                        shape="round"
                        disabled={disabled || sending}
                        type="button"
                        className={`${styles.actionButton} ${isRecording ? styles.recordingBtnActive : ""}`}
                        aria-label={t(
                            "chat.voiceMessage",
                            "Голосовое сообщение",
                        )}
                        onMouseDown={startRecording}
                        onMouseUp={stopAndSendRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopAndSendRecording}
                    >
                        <Mic size={ICON_SIZE.md} />
                    </IconButton>
                )}
            </Flex>
        </Flex>
    );
}
