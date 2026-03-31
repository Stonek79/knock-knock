import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { useAuthStore } from "@/stores/auth";

interface UseChatScrollProps {
    messages: DecryptedMessageWithProfile[];
}

/**
 * Хук управления прокруткой в чате.
 *
 * Особенности:
 * - Выполняет первоначальный скролл вниз при загрузке.
 * - Автоматически скроллит при новых сообщениях (всегда для своих, для чужих — если экран внизу).
 * - Использует useLayoutEffect для предотвращения мерцания (layout shift).
 */
export function useChatScroll({ messages }: UseChatScrollProps) {
    const { profile: user } = useAuthStore();
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const hasScrolledOnce = useRef(false);
    const prevMessagesLength = useRef(0);

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }

            if (typeof viewport.scrollTo === "function") {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior });
            } else {
                viewport.scrollTop = viewport.scrollHeight;
            }
        },
        [],
    );

    // Управление скроллом (Первоначальный и Авто-скролл)
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || messages.length === 0) {
            return;
        }

        // 1. Первоначальный скролл при открытии
        if (!hasScrolledOnce.current) {
            scrollToBottom("instant");
            hasScrolledOnce.current = true;
            prevMessagesLength.current = messages.length;
            return;
        }

        // 2. Авто-скролл при новых сообщениях
        const newMessagesAdded = messages.length > prevMessagesLength.current;
        if (newMessagesAdded) {
            const lastMessage = messages[messages.length - 1];
            const isOwnMessage = lastMessage?.sender_id === user?.id;

            if (isOwnMessage || isAtBottom) {
                // Используем requestAnimationFrame или короткий таймаут,
                // чтобы убедиться, что DOM успел обновиться (scrollHeight актуален)
                const frame = requestAnimationFrame(() => {
                    scrollToBottom("smooth");
                });
                prevMessagesLength.current = messages.length;
                return () => cancelAnimationFrame(frame);
            }
        }

        prevMessagesLength.current = messages.length;
    }, [messages, user?.id, isAtBottom, scrollToBottom]);

    const handleScroll = () => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distanceFromBottom < 100;

        setIsAtBottom(atBottom);
        setShowScrollButton(!atBottom);
    };

    return {
        viewportRef,
        showScrollButton,
        handleScroll,
        scrollToBottom: () => scrollToBottom("smooth"),
    };
}
