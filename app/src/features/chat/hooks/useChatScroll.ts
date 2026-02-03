import { useCallback, useEffect, useRef, useState } from 'react';
import type { DecryptedMessageWithProfile } from '@/lib/types/message';
import { useAuthStore } from '@/stores/auth';

interface UseChatScrollProps {
    messages: DecryptedMessageWithProfile[];
}

export function useChatScroll({ messages }: UseChatScrollProps) {
    const { user } = useAuthStore();
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasScrolledOnce, setHasScrolledOnce] = useState(false);
    const prevMessagesLength = useRef(0);

    /**
     * Прокрутка к последнему сообщению.
     */
    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = 'smooth') => {
            const viewport = viewportRef.current;
            if (!viewport) return;

            // Проверка на наличие scrollTo (JSDOM его не поддерживает)
            if (typeof viewport.scrollTo === 'function') {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior });
            } else {
                viewport.scrollTop = viewport.scrollHeight;
            }
        },
        [],
    );

    // Первоначальный скролл при загрузке сообщений
    useEffect(() => {
        if (messages.length > 0 && !hasScrolledOnce) {
            // Используем instant для мгновенного появления внизу при открытии
            const timer = setTimeout(() => {
                scrollToBottom('instant');
                setHasScrolledOnce(true);
                prevMessagesLength.current = messages.length;
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [messages.length, hasScrolledOnce, scrollToBottom]);

    // Авто-скролл при добавлении новых сообщений
    useEffect(() => {
        if (!hasScrolledOnce) return;

        const newMessagesAdded = messages.length > prevMessagesLength.current;
        const lastMessage = messages[messages.length - 1];

        if (newMessagesAdded && lastMessage) {
            const isOwnMessage = lastMessage.sender_id === user?.id;

            // 1. Если сообщение моё -> всегда скроллим
            // 2. Если чужое -> скроллим только если мы уже внизу
            if (isOwnMessage || isAtBottom) {
                // Небольшая задержка, чтобы React успел отрисовать новый элемент и обновить scrollHeight
                const timer = setTimeout(() => {
                    scrollToBottom('smooth');
                }, 50);

                prevMessagesLength.current = messages.length;
                return () => clearTimeout(timer);
            }
        }

        prevMessagesLength.current = messages.length;
    }, [messages, user?.id, isAtBottom, hasScrolledOnce, scrollToBottom]);

    // Обработчик скролла для определения положения
    const handleScroll = () => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        // Порог в 100px от низа считается "мы внизу"
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distanceFromBottom < 100;

        setIsAtBottom(atBottom);
        setShowScrollButton(!atBottom);
    };

    return {
        viewportRef,
        showScrollButton,
        handleScroll,
        scrollToBottom: () => scrollToBottom('smooth'),
    };
}
