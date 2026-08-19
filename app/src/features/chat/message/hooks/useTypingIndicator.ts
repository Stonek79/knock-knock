import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { QUERY_KEYS, TYPING_CONFIG } from "@/lib/constants";
import { presenceRepository } from "@/lib/repositories/presence.repository";
import { ChatRealtimeService } from "@/lib/services/chat-realtime";
import { useAuthStore } from "@/stores/auth";

type UseTypingIndicatorProps = {
    roomId: string;
};

type UseTypingIndicatorResult = {
    /** Список имён пользователей, которые сейчас печатают */
    typingUsers: string[];
    /** Сообщить о начале/остановке печати */
    setTyping: (isTyping: boolean) => void;
};

/**
 * Хук индикатора печати.
 * Теперь это чистый потребитель кэша React Query.
 * Подписка и инвалидация кэша управляются глобально через ChatRealtimeService.
 */
export function useTypingIndicator({
    roomId,
}: UseTypingIndicatorProps): UseTypingIndicatorResult {
    const { t } = useTranslation();
    const pbUser = useAuthStore((state) => state.pbUser);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    // Получаем список печатающих через React Query
    // ChatRealtimeService будет инвалидировать этот ключ при событиях Presence
    const { data: typingUsers = [] } = useQuery({
        queryKey: QUERY_KEYS.typing(roomId),
        queryFn: async (): Promise<string[]> => {
            if (!roomId || !pbUser) {
                return [];
            }

            const result =
                await presenceRepository.getTypingUsersByRoom(roomId);

            if (result.isOk()) {
                return result.value.map((r) => {
                    return (
                        r.display_name || t("chat.unknownUser", "Неизвестный")
                    );
                });
            }
            return [];
        },
        enabled: !!roomId && !!pbUser,
        staleTime: 1000 * 5, // Небольшой staleTime, т.к. данные живые
        refetchInterval: 5000,
    });

    /**
     * Переключение статуса печати
     */
    const setTyping = useCallback(
        async (isTyping: boolean) => {
            if (!pbUser || !roomId) {
                return;
            }

            // Сообщаем глобальному сервису о нашем статусе
            ChatRealtimeService.setTypingStatus({ roomId, isTyping }).catch(
                () => {},
            );

            // Автоматический сброс через таймаут
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (isTyping) {
                // Если еще не отправляли статус "печатает" на сервер — отправляем
                if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    ChatRealtimeService.setTypingStatus({
                        roomId,
                        isTyping: true,
                    }).catch(() => {});
                }

                // Заводим новый таймер тишины (Debounce)
                timeoutRef.current = setTimeout(() => {
                    isTypingRef.current = false;
                    ChatRealtimeService.setTypingStatus({
                        roomId,
                        isTyping: false,
                    }).catch(() => {});
                }, TYPING_CONFIG.TIMEOUT_MS);
            } else {
                // Принудительная остановка (например, при отправке сообщения)
                if (isTypingRef.current) {
                    isTypingRef.current = false;
                    ChatRealtimeService.setTypingStatus({
                        roomId,
                        isTyping: false,
                    }).catch(() => {});
                }
            }
        },
        [pbUser, roomId],
    );

    return { typingUsers, setTyping };
}
