import { Button, TextArea } from '@radix-ui/themes';
import { SendHorizontal } from 'lucide-react';
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

    const handleSend = async () => {
        if (!message.trim() || sending || disabled) return;

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
            <TextArea
                size="3"
                variant="surface"
                placeholder={t('chat.typeMessage', 'Введите сообщение...')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled || sending}
                className={styles.textArea}
            />
            <Button
                size="3"
                radius="full"
                onClick={handleSend}
                disabled={!message.trim() || disabled || sending}
                className={styles.sendButton}
            >
                <SendHorizontal size={22} />
            </Button>
        </div>
    );
}
