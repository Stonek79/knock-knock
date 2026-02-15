/**
 * Хук для трансляции и отслеживания индикатора "печатает...".
 *
 * Использует Supabase Presence для обмена состояниями печати в рамках комнаты.
 * Каждый участник комнаты отправляет событие typing: true/false,
 * а хук собирает и возвращает список пользователей, которые сейчас печатают.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { TYPING_CONFIG } from "@/lib/constants/chat";
import { CHANNEL_STATUS } from "@/lib/constants/supabase";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

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
 * Извлекает имена пользователей, которые печатают в данный момент, из объекта PresenceState.
 * Исключает текущего пользователя из списка.
 *
 * @param state - Текущее состояние Presence в канале
 * @param currentUserId - ID текущего пользователя
 * @returns Массив имен печатающих пользователей
 */
function parseTypingNames(
    state: PresenceState,
    currentUserId: string,
): string[] {
    return Object.entries(state)
        .filter(([userId]) => userId !== currentUserId) // Не показываем себя
        .flatMap(([_, presences]) => {
            const latest = presences[presences.length - 1];
            return latest?.is_typing ? [latest.display_name || "Unknown"] : [];
        });
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
    const displayNameRef = useRef(displayName);
    displayNameRef.current = displayName;

    /**
     * Отправка статуса "печатает" через Presence.
     * Автоматически сбрасывает статус через TYPING_CONFIG.TIMEOUT_MS.
     */
    const setTyping = useCallback(
        (isTyping: boolean) => {
            const channel = channelRef.current;
            if (!channel || !user) {
                return;
            }

            // Транслируем наш статус всем участникам
            channel.track({
                user_id: user.id,
                display_name: displayName,
                is_typing: isTyping,
            });

            // Автоматический сброс статуса при затишье (бездействии)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (isTyping) {
                timeoutRef.current = setTimeout(() => {
                    channel.track({
                        user_id: user.id,
                        display_name: displayName,
                        is_typing: false,
                    });
                }, TYPING_CONFIG.TIMEOUT_MS);
            }
        },
        [user, displayName],
    );

    /**
     * Эффект управления жизненным циклом канала.
     * Подписывается на события Presence при входе в комнату и отписывается при выходе.
     */
    useEffect(() => {
        if (!roomId || !user || import.meta.env.VITE_USE_MOCK === "true") {
            return;
        }

        const channel = supabase.channel(
            `${TYPING_CONFIG.CHANNEL_PREFIX}${roomId}`,
            {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            },
        );

        channelRef.current = channel;

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState() as PresenceState;
                setTypingUsers(parseTypingNames(state, user.id));
            })
            .subscribe((status) => {
                if (status === CHANNEL_STATUS.SUBSCRIBED) {
                    // При успешной подписке инициализируем Presence (не печатаем)
                    channel.track({
                        user_id: user.id,
                        display_name: displayNameRef.current,
                        is_typing: false,
                    });
                }

                if (status === CHANNEL_STATUS.CHANNEL_ERROR) {
                    logger.error("Typing channel subscription error", {
                        roomId,
                    });
                }

                logger.info("Typing channel status", { status, roomId });
            });

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            supabase.removeChannel(channel);
            channelRef.current = null;
            setTypingUsers([]); // Сбрасываем список при выходе
        };
    }, [roomId, user]); // Зависим только от ID комнаты и юзера

    /**
     * Эффект обновления Presence при изменении имени пользователя.
     * Если имя сменилось в процессе, обновляем наш объект track без переподключения.
     */
    useEffect(() => {
        if (channelRef.current && user && displayName) {
            channelRef.current.track({
                user_id: user.id,
                display_name: displayName,
                is_typing: false,
            });
        }
    }, [displayName, user]);

    return { typingUsers, setTyping };
}
