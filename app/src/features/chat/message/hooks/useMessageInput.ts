import {
    type KeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

interface UseMessageInputProps {
    onSend: (text: string) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean;
    initialValue?: string;
}

export function useMessageInput({
    onSend,
    onCancel,
    disabled,
    initialValue,
}: UseMessageInputProps) {
    // ... existing state ...
    const [message, setMessage] = useState(initialValue || "");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasText = message.trim().length > 0;

    // ... adjustHeight ...
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "40px";
            if (message.trim()) {
                const scrollHeight = textarea.scrollHeight;
                textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
            }
        }
    }, [message]);

    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

    // При изменении initialValue (режим редактирования) обновляем поле и ставим фокус
    useEffect(() => {
        let focusTimer: ReturnType<typeof setTimeout> | null = null;

        if (initialValue !== undefined) {
            setMessage(initialValue || "");
            // Автофокус при входе в режим редактирования
            if (initialValue) {
                focusTimer = setTimeout(() => textareaRef.current?.focus(), 50);
            }
        }

        // Очистка таймера при размонтировании
        return () => {
            if (focusTimer) {
                clearTimeout(focusTimer);
            }
        };
    }, [initialValue]);

    // ... handleSend ...
    const handleSend = async () => {
        if (!hasText || sending || disabled) {
            return;
        }

        setSending(true);
        try {
            await onSend(message.trim());
            setMessage("");
        } finally {
            setSending(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape" && onCancel) {
            e.preventDefault();
            onCancel();
            setMessage(""); // Clear input on cancel? Or keep? Usually reset.
            return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
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
