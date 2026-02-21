/**
 * Компонент ввода сообщения.
 * Оптимизирован для мобильных устройств и десктопа.
 */

import { Mic, Paperclip, SendHorizontal, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/IconButton";
import { TextArea } from "@/components/ui/TextArea";
import { useMessageInput } from "@/features/chat/hooks/useMessageInput";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./message-input.module.css";

interface MessageInputProps {
    /** Коллбэк отправки сообщения */
    onSend: (text: string) => Promise<void>;
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

    const {
        message,
        setMessage,
        sending,
        textareaRef,
        hasText,
        handleSend,
        handleKeyDown,
    } = useMessageInput({
        onSend,
        onCancel,
        disabled,
        initialValue: initialValue ?? undefined,
    });

    return (
        <div className={styles.inputWrapper}>
            {/* Кнопка эмодзи */}
            <IconButton
                variant="ghost"
                size="md"
                shape="round"
                disabled={disabled}
                type="button"
                className={styles.actionButton}
                aria-label="Эмодзи"
            >
                <Smile size={ICON_SIZE.sm} />
            </IconButton>

            {/* Кнопка вложения */}
            <IconButton
                variant="ghost"
                size="md"
                shape="round"
                disabled={disabled}
                type="button"
                className={styles.actionButton}
                aria-label="Прикрепить файл"
            >
                <Paperclip size={ICON_SIZE.sm} />
            </IconButton>

            {/* Поле ввода — наш кастомный TextArea */}
            <div className={styles.textAreaContainer}>
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
            </div>

            {/* Кнопка отправки / микрофон */}
            {hasText ? (
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
                    disabled={disabled}
                    type="button"
                    className={styles.actionButton}
                    aria-label="Голосовое сообщение"
                >
                    <Mic size={ICON_SIZE.md} />
                </IconButton>
            )}
        </div>
    );
}
