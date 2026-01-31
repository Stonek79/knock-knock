import { IconButton, TextArea } from '@radix-ui/themes';
import { Mic, Paperclip, SendHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMessageInput } from '@/features/chat/hooks/useMessageInput';
import styles from './message-input.module.css';

interface MessageInputProps {
    /** Коллбэк отправки сообщения */
    onSend: (text: string) => Promise<void>;
    /** Флаг блокировки ввода */
    disabled?: boolean;
}

/**
 * Компонент ввода сообщения.
 * Оптимизирован для мобильных устройств и десктопа (автовысота).
 */
export function MessageInput({ onSend, disabled }: MessageInputProps) {
    const { t } = useTranslation();

    const {
        message,
        setMessage,
        sending,
        textareaRef,
        hasText,
        handleSend,
        handleKeyDown,
    } = useMessageInput({ onSend, disabled });

    return (
        <div className={styles.inputWrapper}>
            <IconButton
                variant="ghost"
                color="gray"
                radius="full"
                disabled={disabled}
                type="button"
                size="3"
                className={styles.actionButton}
            >
                <Paperclip size={20} />
            </IconButton>

            <div className={styles.textAreaContainer}>
                <TextArea
                    ref={textareaRef}
                    placeholder={t('chat.typeMessage', 'Сообщение')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || sending}
                    className={styles.textArea}
                    size="3"
                    variant="soft"
                />
            </div>

            {hasText ? (
                <IconButton
                    size="3"
                    radius="full"
                    onClick={handleSend}
                    disabled={disabled || sending}
                    className={styles.actionButton}
                >
                    <SendHorizontal size={18} />
                </IconButton>
            ) : (
                <IconButton
                    variant="ghost"
                    color="gray"
                    radius="full"
                    disabled={disabled}
                    type="button"
                    size="3"
                    className={styles.actionButton}
                >
                    <Mic size={22} />
                </IconButton>
            )}
        </div>
    );
}
