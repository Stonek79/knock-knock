import {
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

interface UseMessageInputProps {
    onSend: (text: string) => Promise<void>;
    disabled?: boolean;
}

/**
 * Хук логики ввода сообщения.
 * Управляет высотой textarea, состоянием отправки и обработкой клавиш.
 */
export function useMessageInput({ onSend, disabled }: UseMessageInputProps) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasText = message.trim().length > 0;

    /**
     * Автоматическая подстройка высоты
     */
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = '40px'; // Сброс
            if (message.trim()) {
                const scrollHeight = textarea.scrollHeight;
                textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
            }
        }
    }, [message]);

    // Синхронизация высоты при изменении текста
    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

    /**
     * Отправка сообщения
     */
    const handleSend = async () => {
        if (!hasText || sending || disabled) return;

        setSending(true);
        try {
            await onSend(message.trim());
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = '40px';
            }
        } finally {
            setSending(false);
            // Возвращаем фокус
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        }
    };

    /**
     * Обработка Enter
     */
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (window.innerWidth > 600) {
                e.preventDefault();
                handleSend();
            }
        }
    };

    return {
        message,
        setMessage,
        sending,
        textareaRef,
        hasText,
        handleSend,
        handleKeyDown,
    };
}
