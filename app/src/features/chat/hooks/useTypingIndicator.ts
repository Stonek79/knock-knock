/**
 * Хук для трансляции и отслеживания индикатора "печатает...".
 *
 * Использует Supabase Presence для обмена состояниями печати в рамках комнаты.
 * Каждый участник комнаты отправляет событие typing: true/false,
 * а хук собирает и возвращает список пользователей, которые сейчас печатают.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

/** Задержка дебаунса перед сбросом статуса "печатает" (мс) */
const TYPING_TIMEOUT_MS = 3000;

/** Канал presence привязан к комнате */
const TYPING_CHANNEL_PREFIX = "typing:";

/** Структура данных Presence для печати */
interface TypingPresence {
    user_id: string;
    display_name: string;
    is_typing: boolean;
}

/** Тип состояния Presence */
interface PresenceState {
    [key: string]: TypingPresence[];
}

interface UseTypingIndicatorProps {
    roomId: string;
    displayName?: string;
}

interface UseTypingIndicatorResult {
    /** Список имён пользователей, которые сейчас печатают */
    typingUsers: string[];
    /** Сообщить о начале/остановке печати */
    setTyping: (isTyping: boolean) => void;
}

/**
 * Хук индикатора печати.
 *
 * @param roomId — ID комнаты
 * @param displayName — Имя текущего пользователя (для отображения у собеседника)
 * @returns typingUsers — массив имён печатающих, setTyping — функция для отправки события
 */
export function useTypingIndicator({
    roomId,
    displayName = "",
}: UseTypingIndicatorProps): UseTypingIndicatorResult {
    const { user } = useAuthStore();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    /**
     * Отправка статуса "печатает" через Presence.
     * Автоматически сбрасывает статус через TYPING_TIMEOUT_MS.
     */
    const setTyping = useCallback(
        (isTyping: boolean) => {
            if (!channelRef.current || !user) {
                return;
            }

            channelRef.current.track({
                user_id: user.id,
                display_name: displayName,
                is_typing: isTyping,
            });

            // Автоматический сброс статуса при бездействии
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (isTyping) {
                timeoutRef.current = setTimeout(() => {
                    channelRef.current?.track({
                        user_id: user?.id ?? "",
                        display_name: displayName,
                        is_typing: false,
                    });
                }, TYPING_TIMEOUT_MS);
            }
        },
        [user, displayName],
    );

    useEffect(() => {
        if (!roomId || !user) {
            return;
        }

        // В Mock-режиме не подписываемся (typing работает только с реальным бэкендом)
        if (import.meta.env.VITE_USE_MOCK === "true") {
            return;
        }

        const channel = supabase.channel(`${TYPING_CHANNEL_PREFIX}${roomId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channelRef.current = channel;

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState() as PresenceState;
                const names: string[] = [];

                for (const [userId, presences] of Object.entries(state)) {
                    // Не показываем себя
                    if (userId === user.id) {
                        continue;
                    }

                    const latest = presences[presences.length - 1];
                    if (latest?.is_typing) {
                        names.push(latest.display_name || "Unknown");
                    }
                }

                setTypingUsers(names);
            })
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    // Изначально не печатаем
                    channel.track({
                        user_id: user.id,
                        display_name: displayName,
                        is_typing: false,
                    });
                }
                logger.info("Typing channel status", {
                    status,
                    roomId,
                });
            });

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [roomId, user, displayName]);

    return { typingUsers, setTyping };
}
