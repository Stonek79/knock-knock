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

export function useChatScroll({ messages }: UseChatScrollProps) {
    const user = useAuthStore((state) => state.profile);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const isAtBottomRef = useRef(true);
    const prevMessagesLength = useRef(0);
    const isAutoScrollingRef = useRef(false);

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }

            isAutoScrollingRef.current = true;

            const targetScrollTop =
                viewport.scrollHeight - viewport.clientHeight;

            if (behavior === "smooth") {
                viewport.scrollTo({ top: targetScrollTop, behavior: "smooth" });
            } else {
                viewport.scrollTop = targetScrollTop;
            }

            requestAnimationFrame(() => {
                isAutoScrollingRef.current = false;
            });
        },
        [],
    );

    const handleScroll = useCallback(() => {
        const viewport = viewportRef.current;
        // Если скроллит скрипт — игнорируем
        if (!viewport || isAutoScrollingRef.current) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = viewport;

        // 100px погрешности для комфортного прилипания
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;

        isAtBottomRef.current = atBottom;
        setShowScrollButton(!atBottom);
    }, []);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            // Если картинка загрузилась и расперла контейнер, просто снова фокусируемся на якоре
            if (isAtBottomRef.current) {
                scrollToBottom("auto");
            }
        });

        // Следим за внутренним Flex-контейнером с сообщениями
        const content = viewport.firstElementChild;
        if (content) {
            resizeObserver.observe(content);
        }

        return () => resizeObserver.disconnect();
    }, [scrollToBottom]);

    // Реакция на загрузку и новые сообщения
    useLayoutEffect(() => {
        if (!messages || messages.length === 0) {
            return;
        }

        const isFirstLoad = prevMessagesLength.current === 0;
        const isNewMessage = messages.length > prevMessagesLength.current;

        const lastMessage = messages[messages.length - 1];
        const isOwnMessage = lastMessage?.sender === user?.id;

        if (isFirstLoad) {
            requestAnimationFrame(() => {
                scrollToBottom("auto");
                isAtBottomRef.current = true;
            });
        } else if (isNewMessage) {
            // Скроллим если написали мы, или если мы читали последние сообщения
            if (isOwnMessage || isAtBottomRef.current) {
                scrollToBottom("smooth");
            }
        } else if (messages.length < prevMessagesLength.current) {
            // Если сообщение удалили - просто корректируем позицию без анимации
            scrollToBottom("auto");
        }

        prevMessagesLength.current = messages.length;
    }, [messages, user?.id, scrollToBottom]);

    return {
        viewportRef,
        showScrollButton,
        handleScroll,
        scrollToBottom: () => scrollToBottom("smooth"),
    };
}
