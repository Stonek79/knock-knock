import { Button, TextArea } from '@radix-ui/themes';
import { Mic, Paperclip, SendHorizontal } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './message-input.module.css';

interface MessageInputProps {
    /** Коллбэк отправки сообщения */
    onSend: (text: string) => Promise<void>;
    /** Флаг блокировки ввода */
    disabled?: boolean;
}

/**
 * Компонент ввода сообщения.
 * Оптимизирован для мобильных устройств (круглая кнопка, автовысота).
 */
export function MessageInput({ onSend, disabled }: MessageInputProps) {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const hasText = message.trim().length > 0;

    const handleSend = async () => {
        if (!hasText || sending || disabled) return;

        setSending(true);
        try {
            await onSend(message.trim());
            setMessage('');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={styles.inputWrapper}>
            {/* Кнопка вложений (Слева) */}
            <Button
                variant="ghost"
                className={`${styles.actionButton} ${styles.iconButton}`}
                disabled={disabled}
                type="button"
            >
                <Paperclip size={20} />
            </Button>

            <TextArea
                size="2"
                variant="soft"
                placeholder={t('chat.typeMessage', 'Сообщение')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled || sending}
                className={styles.textArea}
            />

            {/* Микрофон или Отправка (Справа) */}
            {hasText ? (
                <Button
                    size="2"
                    radius="full"
                    onClick={handleSend}
                    disabled={disabled || sending}
                    className={`${styles.actionButton} ${styles.sendButton}`}
                >
                    <SendHorizontal size={18} />
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    className={`${styles.actionButton} ${styles.iconButton}`}
                    disabled={disabled} // Можно включить, когда будет реализована запись голоса
                    type="button"
                >
                    <Mic size={22} />
                </Button>
            )}
        </div>
    );
}
