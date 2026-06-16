import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { DecryptedMessageWithProfile } from "@/lib/types/message";
import { useAuthStore } from "@/stores/auth";

interface UseChatScrollProps {
    messages: DecryptedMessageWithProfile[];
    firstUnreadId?: string | null;
    unreadDividerId?: string | null;
    onDismissDivider?: () => void;
    roomId?: string;
    onMarkMessageAsRead?: (message: DecryptedMessageWithProfile) => void;
    isRoomLoading?: boolean;
}

// Кэш позиций скролла в памяти модуля (для моментального переключения чатов)
const scrollPositionsCache: Record<string, number> = {};
const atBottomCache: Record<string, boolean> = {};

type StabilizeTarget = "divider" | { type: "value"; scrollTop: number };

export function useChatScroll({
    messages,
    firstUnreadId,
    unreadDividerId,
    onDismissDivider,
    roomId,
    onMarkMessageAsRead,
    isRoomLoading = false,
}: UseChatScrollProps) {
    const user = useAuthStore((state) => state.profile);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const isAtBottomRef = useRef(true);
    const shouldStickyToBottomRef = useRef(true);
    const isUserScrollingRef = useRef(false);
    const prevMessagesLength = useRef(0);
    const isAutoScrollingRef = useRef(false);
    const prevRoomIdRef = useRef<string | null>(null);
    const throttleTimerRef = useRef<number | null>(null);
    const debounceTimerRef = useRef<number | null>(null);
    const hasInitialScrolledRef = useRef(false);

    // Новые рефы для ТГ-лайк логики плашки и стабилизации
    const isInitialPositioningRef = useRef(false);
    const dividerDismissTimerRef = useRef<number | null>(null);
    const isDividerTimerRunningRef = useRef(false);

    // ID первого сообщения ниже видимой области (для точного счетчика непрочитанных)
    const [firstBelowMessageId, setFirstBelowMessageId] = useState<
        string | null
    >(null);

    // Рефы для контроля стабилизации скролла
    const stabilizingObserverRef = useRef<ResizeObserver | null>(null);
    const stabilizeTimeoutRef = useRef<number | null>(null);
    const stabilizeTargetRef = useRef<StabilizeTarget | null>(null);

    // Наибольший таймстемп сообщения, которое ушло за верхний или видимый край
    const maxReadTimestampRef = useRef<number>(0);

    const saveScrollToStorage = useCallback(
        (rId: string, scrollTop: number, atBottom: boolean) => {
            try {
                sessionStorage.setItem(
                    `scroll_pos_${rId}`,
                    JSON.stringify({ scrollTop, isAtBottom: atBottom }),
                );
            } catch (e) {
                console.warn(
                    "Failed to save scroll position to sessionStorage",
                    e,
                );
            }
        },
        [],
    );

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

    const scrollToDivider = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const dividerElement = viewport.querySelector("[data-unread-divider]");
        if (dividerElement) {
            const containerRect = viewport.getBoundingClientRect();
            const elementRect = dividerElement.getBoundingClientRect();
            const targetScrollTop =
                elementRect.top - containerRect.top + viewport.scrollTop;

            viewport.scrollTop = targetScrollTop;
        }
    }, []);

    const stopStabilization = useCallback(() => {
        if (stabilizingObserverRef.current) {
            stabilizingObserverRef.current.disconnect();
            stabilizingObserverRef.current = null;
        }
        if (stabilizeTimeoutRef.current) {
            window.clearTimeout(stabilizeTimeoutRef.current);
            stabilizeTimeoutRef.current = null;
        }
        stabilizeTargetRef.current = null;
        isInitialPositioningRef.current = false;
    }, []);

    const startStabilization = useCallback(
        (target: StabilizeTarget) => {
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }

            stopStabilization();

            isInitialPositioningRef.current = true;
            stabilizeTargetRef.current = target;

            const runStabilize = () => {
                const currentTarget = stabilizeTargetRef.current;
                if (currentTarget === "divider") {
                    scrollToDivider();
                } else if (currentTarget?.type === "value") {
                    if (viewportRef.current) {
                        viewportRef.current.scrollTop = currentTarget.scrollTop;
                    }
                }
            };

            // Выполняем первую стабилизацию сразу
            runStabilize();

            const observer = new ResizeObserver(() => {
                runStabilize();
            });

            const content = viewport.firstElementChild;
            if (content) {
                observer.observe(content);
            }
            stabilizingObserverRef.current = observer;

            // Таймаут безопасности (4 секунды) на случай долгой загрузки без действий пользователя
            stabilizeTimeoutRef.current = window.setTimeout(() => {
                stopStabilization();
            }, 4000);
        },
        [scrollToDivider, stopStabilization],
    );

    // Слушатели событий ввода пользователя для надежного разделения пользовательского и программного скролла
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const handleUserAction = () => {
            isUserScrollingRef.current = true;
            stopStabilization();
        };

        const handleUserKeyDown = (e: KeyboardEvent) => {
            const keys = [
                "ArrowUp",
                "ArrowDown",
                "PageUp",
                "PageDown",
                "Home",
                "End",
                " ",
            ];
            if (keys.includes(e.key)) {
                handleUserAction();
            }
        };

        viewport.addEventListener("touchstart", handleUserAction, {
            passive: true,
        });
        viewport.addEventListener("touchmove", handleUserAction, {
            passive: true,
        });
        viewport.addEventListener("wheel", handleUserAction, { passive: true });
        window.addEventListener("keydown", handleUserKeyDown, {
            passive: true,
        });

        return () => {
            viewport.removeEventListener("touchstart", handleUserAction);
            viewport.removeEventListener("touchmove", handleUserAction);
            viewport.removeEventListener("wheel", handleUserAction);
            window.removeEventListener("keydown", handleUserKeyDown);
        };
    }, [stopStabilization]);

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
        let firstBelowId: string | null = null;

        for (const el of messageElements) {
            const rect = el.getBoundingClientRect();
            const isVisible =
                rect.top < viewportRect.bottom &&
                rect.bottom > viewportRect.top;
            const isBelow = rect.top >= viewportRect.bottom;

            if (isVisible) {
                const msgId = el.getAttribute("data-message-id");
                const msg = messages.find((m) => {
                    return m.id === msgId;
                });
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
            } else if (isBelow && !firstBelowId) {
                firstBelowId = el.getAttribute("data-message-id");
            }
        }

        setFirstBelowMessageId(firstBelowId);

        if (lastVisibleMessage) {
            onMarkMessageAsRead(lastVisibleMessage);
        }
    }, [messages, user?.id, onMarkMessageAsRead]);

    const handleScroll = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport || isAutoScrollingRef.current) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;

        isAtBottomRef.current = atBottom;
        setShowScrollButton(!atBottom);

        if (roomId) {
            // Сохраняем в кэш модуля (быстрый доступ)
            scrollPositionsCache[roomId] = scrollTop;
            atBottomCache[roomId] = atBottom;

            // Прижим к низу отключаем ТОЛЬКО если пользователь сам скроллит вверх
            if (!atBottom && isUserScrollingRef.current) {
                shouldStickyToBottomRef.current = false;
            } else if (atBottom) {
                shouldStickyToBottomRef.current = true;
            }

            // Сбрасываем флаг пользовательского скролла
            isUserScrollingRef.current = false;

            // Дебаунс (1 сек) для синхронизации с sessionStorage
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = window.setTimeout(() => {
                debounceTimerRef.current = null;
                saveScrollToStorage(roomId, scrollTop, atBottom);
            }, 1000);
        }

        // Проверка положения плашки непрочитанных
        if (unreadDividerId && onDismissDivider) {
            const dividerElement = viewport.querySelector(
                "[data-unread-divider]",
            );
            if (dividerElement) {
                const dividerRect = dividerElement.getBoundingClientRect();
                const viewportRect = viewport.getBoundingClientRect();
                // Плашка находится в видимой зоне или ушла выше неё
                const isReadingOrRead = dividerRect.top < viewportRect.bottom;

                if (isReadingOrRead && !isDividerTimerRunningRef.current) {
                    // Запускаем таймер на 20 сек
                    isDividerTimerRunningRef.current = true;
                    if (dividerDismissTimerRef.current) {
                        window.clearTimeout(dividerDismissTimerRef.current);
                    }
                    dividerDismissTimerRef.current = window.setTimeout(() => {
                        onDismissDivider();
                        isDividerTimerRunningRef.current = false;
                        dividerDismissTimerRef.current = null;
                    }, 20000);
                } else if (
                    !isReadingOrRead &&
                    isDividerTimerRunningRef.current
                ) {
                    // Плашка ушла ниже вьюпорта (пользователь скроллит вверх к старым сообщениям)
                    isDividerTimerRunningRef.current = false;
                    if (dividerDismissTimerRef.current) {
                        window.clearTimeout(dividerDismissTimerRef.current);
                        dividerDismissTimerRef.current = null;
                    }
                }
            }
        }

        // Троттлинг проверки видимости сообщений (раз в 200мс)
        if (!throttleTimerRef.current) {
            throttleTimerRef.current = window.setTimeout(() => {
                throttleTimerRef.current = null;
                checkVisibleMessages();
            }, 200);
        }
    }, [
        checkVisibleMessages,
        roomId,
        saveScrollToStorage,
        unreadDividerId,
        onDismissDivider,
    ]);

    // Клик по кнопке скролла
    const handleScrollButtonClick = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        // Если плашка unreadDividerId задана и элемент есть в DOM, скроллим к ней
        if (unreadDividerId) {
            const dividerElement = viewport.querySelector(
                "[data-unread-divider]",
            );
            if (dividerElement) {
                scrollToDivider();
                return;
            }
        }

        // Иначе листаем в самый конец к последнему сообщению
        scrollToBottom("smooth");
    }, [unreadDividerId, scrollToDivider, scrollToBottom]);

    // Сохранение и очистка таймеров при размонтировании
    useEffect(() => {
        return () => {
            if (throttleTimerRef.current) {
                window.clearTimeout(throttleTimerRef.current);
            }
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
            if (dividerDismissTimerRef.current) {
                window.clearTimeout(dividerDismissTimerRef.current);
            }
            stopStabilization();

            const viewport = viewportRef.current;
            if (viewport && roomId) {
                const { scrollTop, scrollHeight, clientHeight } = viewport;
                const atBottom = scrollHeight - scrollTop - clientHeight < 100;
                saveScrollToStorage(roomId, scrollTop, atBottom);
            }
        };
    }, [roomId, saveScrollToStorage, stopStabilization]);

    // Основной ResizeObserver для прижима скролла к низу чата
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            // Если идет начальное позиционирование, не прижимаем к низу
            if (isInitialPositioningRef.current) {
                return;
            }
            if (shouldStickyToBottomRef.current) {
                scrollToBottom("auto");
            }
        });

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

        // Сохранение скролла при смене комнаты
        if (roomId && prevRoomIdRef.current !== roomId) {
            const prevRoomId = prevRoomIdRef.current;
            const viewport = viewportRef.current;
            if (prevRoomId && viewport) {
                if (debounceTimerRef.current) {
                    window.clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
                saveScrollToStorage(
                    prevRoomId,
                    viewport.scrollTop,
                    isAtBottomRef.current,
                );
            }

            // Очищаем таймер списания плашки старой комнаты
            if (dividerDismissTimerRef.current) {
                window.clearTimeout(dividerDismissTimerRef.current);
                dividerDismissTimerRef.current = null;
            }
            isDividerTimerRunningRef.current = false;

            // Отключаем стабилизацию для старой комнаты
            stopStabilization();

            prevMessagesLength.current = 0;
            isAtBottomRef.current = true;
            shouldStickyToBottomRef.current = true;
            prevRoomIdRef.current = roomId;
            hasInitialScrolledRef.current = false;
            maxReadTimestampRef.current = 0;
        }

        if (messages.length === 0) {
            return;
        }

        const isNewMessage = messages.length > prevMessagesLength.current;
        const lastMessage = messages[messages.length - 1];
        const isOwnMessage = lastMessage?.sender === user?.id;

        // Первоначальный скролл при входе в чат (когда сообщения и комната загружены)
        if (!hasInitialScrolledRef.current && !isRoomLoading) {
            hasInitialScrolledRef.current = true;

            requestAnimationFrame(() => {
                const viewport = viewportRef.current;
                if (!viewport) {
                    return;
                }

                let scrolled = false;

                // 1. Если есть плашка непрочитанных, скроллим к ней и запускаем стабилизацию
                if (unreadDividerId) {
                    isAtBottomRef.current = false;
                    shouldStickyToBottomRef.current = false;
                    setShowScrollButton(true);
                    scrolled = true;

                    startStabilization("divider");
                }

                // 2. Если плашки нет, пытаемся восстановить сохраненную позицию
                if (!scrolled) {
                    const saved = sessionStorage.getItem(
                        `scroll_pos_${roomId}`,
                    );
                    if (saved) {
                        try {
                            const { scrollTop, isAtBottom } = JSON.parse(saved);
                            if (isAtBottom) {
                                scrollToBottom("auto");
                                isAtBottomRef.current = true;
                                shouldStickyToBottomRef.current = true;
                            } else {
                                isAtBottomRef.current = false;
                                shouldStickyToBottomRef.current = false;
                                startStabilization({
                                    type: "value",
                                    scrollTop,
                                });
                            }
                            setShowScrollButton(!isAtBottom);
                            scrolled = true;
                        } catch (_e) {
                            // Игнорируем ошибки парсинга
                        }
                    } else if (
                        roomId &&
                        scrollPositionsCache[roomId] !== undefined
                    ) {
                        const savedScrollTop = scrollPositionsCache[roomId];
                        const savedAtBottom = atBottomCache[roomId];
                        if (savedAtBottom) {
                            scrollToBottom("auto");
                            isAtBottomRef.current = true;
                            shouldStickyToBottomRef.current = true;
                        } else {
                            isAtBottomRef.current = false;
                            shouldStickyToBottomRef.current = false;
                            startStabilization({
                                type: "value",
                                scrollTop: savedScrollTop,
                            });
                        }
                        setShowScrollButton(!savedAtBottom);
                        scrolled = true;
                    }
                }

                // 3. Иначе скроллим в самый низ
                if (!scrolled) {
                    scrollToBottom("auto");
                    isAtBottomRef.current = true;
                    shouldStickyToBottomRef.current = true;
                    setShowScrollButton(false);
                }

                // Запускаем проверку видимости сообщений сразу после позиционирования скролла
                setTimeout(() => {
                    checkVisibleMessages();
                }, 100);
            });
        } else if (isNewMessage && prevMessagesLength.current > 0) {
            // Скроллим только если написали мы, или если мы читали последние сообщения
            if (isOwnMessage || isAtBottomRef.current) {
                scrollToBottom("smooth");
            }
        } else if (messages.length < prevMessagesLength.current) {
            scrollToBottom("auto");
        }

        prevMessagesLength.current = messages.length;
    }, [
        messages,
        user?.id,
        scrollToBottom,
        unreadDividerId,
        roomId,
        checkVisibleMessages,
        isRoomLoading,
        saveScrollToStorage,
        startStabilization,
        stopStabilization,
    ]);

    // Вычисляем количество непрочитанных (только тех, что ниже видимой области)
    const unreadCount = useMemo(() => {
        if (!firstUnreadId || !messages || messages.length === 0) {
            return 0;
        }

        const firstUnreadMsg = messages.find((m) => {
            return m.id === firstUnreadId;
        });
        if (!firstUnreadMsg) {
            return 0;
        }

        const unreadTs = new Date(firstUnreadMsg.created).getTime();
        let targetTs = unreadTs;

        if (firstBelowMessageId) {
            const belowMsg = messages.find((m) => {
                return m.id === firstBelowMessageId;
            });
            if (belowMsg) {
                const belowTs = new Date(belowMsg.created).getTime();
                maxReadTimestampRef.current = Math.max(
                    maxReadTimestampRef.current,
                    belowTs,
                );
                targetTs = Math.max(unreadTs, maxReadTimestampRef.current);
            }
        } else {
            // Если firstBelowMessageId === null, значит ниже вьюпорта нет ни одного сообщения.
            // Все сообщения на экране, значит мы прочитали их все.
            // Запоминаем время последнего сообщения, чтобы при скролле вверх счетчик не откатывался.
            const lastMsg = messages[messages.length - 1];
            if (lastMsg) {
                const lastTs = new Date(lastMsg.created).getTime();
                maxReadTimestampRef.current = Math.max(
                    maxReadTimestampRef.current,
                    lastTs + 1,
                );
            }
            return 0;
        }

        return messages.filter((m) => {
            const mTs = new Date(m.created).getTime();
            // Считаем только входящие сообщения, которые новее или равны targetTs
            return m.sender !== user?.id && mTs >= targetTs;
        }).length;
    }, [firstUnreadId, firstBelowMessageId, messages, user?.id]);

    return {
        viewportRef,
        showScrollButton,
        handleScroll,
        scrollToBottom: handleScrollButtonClick,
        unreadCount,
    };
}
