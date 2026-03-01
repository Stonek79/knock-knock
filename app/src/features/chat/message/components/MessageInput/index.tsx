/**
 * Компонент ввода сообщения.
 * Оптимизирован для мобильных устройств и десктопа.
 */

import clsx from "clsx";
import { Mic, Paperclip, SendHorizontal, Smile, X } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { Slider } from "@/components/ui/Slider";
import { Text } from "@/components/ui/Text";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { RECORDING_LIMITS } from "@/lib/constants/storage";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useFileAttachments } from "../../hooks/useFileAttachments";
import { useMessageInput } from "../../hooks/useMessageInput";
import { AttachmentPreviewModal } from "./../AttachmentPreviewModal";
import styles from "./message-input.module.css";

// TODO: большой и сложный компонент, надо подумать над декомпозицией и вынесением логики в отдельные хуки и утилиты.

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
        setSending,
        textareaRef,
        hasText,
        handleSend,
        handleKeyDown,
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        stopAndFinishRecording,
        recordedAudio,
        setRecordedAudio,
    } = useMessageInput({
        onSend,
        onCancel,
        disabled,
        initialValue: initialValue ?? undefined,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        attachments,
        attachmentCaption,
        setAttachmentCaption,
        handleFileChange,
        removeAttachment,
        resetAttachments,
    } = useFileAttachments({ toast, t });

    const handleSendAttachments = async () => {
        if (attachments.length === 0 || sending || disabled) {
            return;
        }
        setSending(true);
        try {
            await onSend(attachmentCaption.trim(), attachments);
            resetAttachments();
        } finally {
            setSending(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        }
    };

    return (
        <Flex direction="column" className={styles.inputContainer}>
            {/* Модальное окно предпросмотра вложений */}
            <AttachmentPreviewModal
                isOpen={attachments.length > 0}
                attachments={attachments}
                caption={attachmentCaption}
                onCaptionChange={setAttachmentCaption}
                onClose={resetAttachments}
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
                        (() => {
                            const remainingTime =
                                RECORDING_LIMITS.MAX_DURATION_SECONDS -
                                recordingTime;
                            const isWarning = remainingTime <= 5;
                            const formattedTime = `00:${remainingTime.toString().padStart(2, "0")}`;
                            return (
                                <Flex
                                    align="center"
                                    gap="2"
                                    className={styles.recordingState}
                                >
                                    <Box className={styles.recordingPulse} />
                                    <Text
                                        className={clsx(
                                            styles.recordingTime,
                                            isWarning &&
                                                styles.recordingBtnActive,
                                        )}
                                    >
                                        {formattedTime}
                                    </Text>
                                    <Slider
                                        disabled
                                        value={[recordingTime]}
                                        max={
                                            RECORDING_LIMITS.MAX_DURATION_SECONDS
                                        }
                                        className={clsx(
                                            styles.recordingSlider,
                                            isWarning &&
                                                styles.recordingWarning,
                                        )}
                                    />
                                </Flex>
                            );
                        })()
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

                {/* Кнопка удаления аудио + Отправки */}
                {recordedAudio ? (
                    <Flex align="center" gap="1">
                        <IconButton
                            size="md"
                            shape="round"
                            variant="ghost"
                            onClick={() => {
                                setRecordedAudio(null);
                                setMessage("");
                            }}
                            disabled={disabled || sending}
                            className={styles.actionButton}
                            aria-label={t("chat.removeAudio", "Удалить аудио")}
                        >
                            <X size={ICON_SIZE.sm} />
                        </IconButton>
                        <IconButton
                            size="md"
                            shape="round"
                            variant="ghost"
                            onClick={handleSend}
                            disabled={disabled || sending}
                            className={clsx(
                                styles.actionButton,
                                styles.sendButton,
                            )}
                            aria-label={t("chat.send", "Отправить")}
                        >
                            <SendHorizontal size={ICON_SIZE.sm} />
                        </IconButton>
                    </Flex>
                ) : hasText || attachments.length > 0 ? (
                    <IconButton
                        size="md"
                        shape="round"
                        variant="ghost"
                        onClick={handleSend}
                        disabled={disabled || sending}
                        className={clsx(styles.actionButton, styles.sendButton)}
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
                        className={clsx(
                            styles.actionButton,
                            isRecording && styles.recordingBtnActive,
                        )}
                        aria-label={t(
                            "chat.voiceMessage",
                            "Голосовое сообщение",
                        )}
                        onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            // Игнорируем promise
                            void startRecording();
                        }}
                        onPointerUp={(e) => {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                            stopAndFinishRecording();
                        }}
                        onPointerCancel={(e) => {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                            stopRecording();
                        }}
                    >
                        <Mic size={ICON_SIZE.md} />
                    </IconButton>
                )}
            </Flex>
        </Flex>
    );
}
