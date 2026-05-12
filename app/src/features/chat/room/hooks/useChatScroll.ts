import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
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
    const user = useAuthStore((state) => state.profile);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const hasScrolledOnce = useRef(false);
    const prevMessagesLength = useRef(0);
    const prevScrollTop = useRef(0);

    const isAtBottomRef = useRef(true);
    const isAutoScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }

            const targetScrollTop =
                viewport.scrollHeight - viewport.clientHeight;

            isAutoScrollingRef.current = true;

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(
                () => {
                    isAutoScrollingRef.current = false;
                },
                behavior === "smooth" ? 800 : 100,
            );

            if (typeof viewport.scrollTo === "function") {
                viewport.scrollTo({ top: targetScrollTop, behavior });
            } else {
                viewport.scrollTop = targetScrollTop;
            }
        },
        [],
    );

    // Следим за изменением размера контента (например, при загрузке картинок)
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            // Если контент прыгнул (картинка загрузилась) И мы внизу экрана
            // Или если прямо сейчас идет автоскролл
            if (isAtBottomRef.current || isAutoScrollingRef.current) {
                scrollToBottom("instant");
            }
        });

        // Следим за самим контейнером (изменение высоты при открытии клавиатуры)
        resizeObserver.observe(viewport);

        const content = viewport.firstElementChild;
        if (content) {
            resizeObserver.observe(content);
        }

        return () => resizeObserver.disconnect();
    }, [scrollToBottom]);

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
        const messagesDeleted = messages.length < prevMessagesLength.current;
        const lastMessage = messages[messages.length - 1];
        const isOwnMessage = lastMessage?.sender === user?.id;
        const isAtBottom = isAtBottomRef.current;

        if (newMessagesAdded) {
            if (isOwnMessage || isAtBottom) {
                const frame = requestAnimationFrame(() => {
                    scrollToBottom("smooth");
                });
                prevMessagesLength.current = messages.length;

                return () => cancelAnimationFrame(frame);
            }
        } else if (messagesDeleted) {
            const frame = requestAnimationFrame(() => {
                scrollToBottom("instant");
            });

            return () => cancelAnimationFrame(frame);
        }

        prevMessagesLength.current = messages.length;
    }, [messages, user?.id, scrollToBottom]);

    const handleScroll = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        // Увеличили порог (150px = 2-3 строчки) для большей отзывчивости.
        // Math.abs спасает от багов субпиксельного рендеринга (Chrome/Safari)
        const distanceFromBottom = Math.abs(
            scrollHeight - scrollTop - clientHeight,
        );
        const atBottom = distanceFromBottom < 150;

        // Если скролл пошел вверх (явное действие пользователя), прерываем автоскролл
        if (scrollTop < prevScrollTop.current && distanceFromBottom > 150) {
            isAutoScrollingRef.current = false;
        }
        prevScrollTop.current = scrollTop;

        isAtBottomRef.current = atBottom;
        setShowScrollButton(!atBottom);
    }, []);

    return {
        viewportRef,
        showScrollButton,
        handleScroll,
        scrollToBottom: () => scrollToBottom("smooth"),
    };
}
