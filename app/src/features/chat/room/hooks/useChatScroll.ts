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
    firstUnreadId?: string | null;
    roomId?: string;
    onMarkMessageAsRead?: (message: DecryptedMessageWithProfile) => void;
}

export function useChatScroll({
    messages,
    firstUnreadId,
    roomId,
    onMarkMessageAsRead,
}: UseChatScrollProps) {
    const user = useAuthStore((state) => state.profile);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const isAtBottomRef = useRef(true);
    const prevMessagesLength = useRef(0);
    const isAutoScrollingRef = useRef(false);
    const prevRoomIdRef = useRef<string | null>(null);
    const throttleTimerRef = useRef<number | null>(null);

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

    // Функция проверки видимости сообщений на экране
    const checkVisibleMessages = useCallback(() => {
        const viewport = viewportRef.current;
        if (
            !viewport ||
            !messages ||
            messages.length === 0 ||
            !onMarkMessageAsRead
        ) {
            return;
        }

        const viewportRect = viewport.getBoundingClientRect();
        const messageElements = viewport.querySelectorAll("[data-message-id]");

        let lastVisibleMessage: DecryptedMessageWithProfile | null = null;

        for (const el of messageElements) {
            const rect = el.getBoundingClientRect();
            // Сообщение считается видимым, если оно пересекает видимую область экрана.
            // Проверяем, что верхняя часть элемента выше нижней границы экрана,
            // а нижняя часть элемента ниже верхней границы экрана.
            const isVisible =
                rect.top < viewportRect.bottom &&
                rect.bottom > viewportRect.top;

            if (isVisible) {
                const msgId = el.getAttribute("data-message-id");
                const msg = messages.find((m) => m.id === msgId);
                // Нам интересны только сообщения собеседника (не наши)
                if (msg && msg.sender !== user?.id) {
                    if (
                        !lastVisibleMessage ||
                        new Date(msg.created).getTime() >
                            new Date(lastVisibleMessage.created).getTime()
                    ) {
                        lastVisibleMessage = msg;
                    }
                }
            }
        }

        if (lastVisibleMessage) {
            onMarkMessageAsRead(lastVisibleMessage);
        }
    }, [messages, user?.id, onMarkMessageAsRead]);

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

        // Троттлинг проверки видимости сообщений (раз в 200мс)
        if (!throttleTimerRef.current) {
            throttleTimerRef.current = window.setTimeout(() => {
                throttleTimerRef.current = null;
                checkVisibleMessages();
            }, 200);
        }
    }, [checkVisibleMessages]);

    // Очистка таймера при размонтировании
    useEffect(() => {
        return () => {
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
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

        return () => {
            resizeObserver.disconnect();
        };
    }, [scrollToBottom]);

    // Реакция на загрузку и новые сообщения
    useLayoutEffect(() => {
        if (!messages) {
            return;
        }

        // Сброс состояния при смене комнаты
        if (roomId && prevRoomIdRef.current !== roomId) {
            prevMessagesLength.current = 0;
            isAtBottomRef.current = true;
            prevRoomIdRef.current = roomId;
        }

        if (messages.length === 0) {
            return;
        }

        const isFirstLoad = prevMessagesLength.current === 0;
        const isNewMessage = messages.length > prevMessagesLength.current;

        const lastMessage = messages[messages.length - 1];
        const isOwnMessage = lastMessage?.sender === user?.id;

        if (isFirstLoad) {
            requestAnimationFrame(() => {
                let scrolled = false;
                if (firstUnreadId) {
                    const unreadElement = viewportRef.current?.querySelector(
                        `[data-message-id="${firstUnreadId}"]`,
                    );
                    if (unreadElement) {
                        unreadElement.scrollIntoView({ block: "start" });
                        const viewport = viewportRef.current;
                        if (viewport) {
                            const atBottom =
                                viewport.scrollHeight -
                                    viewport.scrollTop -
                                    viewport.clientHeight <
                                100;
                            isAtBottomRef.current = atBottom;
                            setShowScrollButton(!atBottom);
                        }
                        scrolled = true;
                    }
                }

                if (!scrolled) {
                    scrollToBottom("auto");
                    isAtBottomRef.current = true;
                }

                // Запускаем проверку видимости сообщений сразу после позиционирования скролла
                setTimeout(() => {
                    checkVisibleMessages();
                }, 100);
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
    }, [
        messages,
        user?.id,
        scrollToBottom,
        firstUnreadId,
        roomId,
        checkVisibleMessages,
    ]);

    return {
        viewportRef,
        showScrollButton,
        handleScroll,
        scrollToBottom: () => {
            scrollToBottom("smooth");
        },
    };
}
