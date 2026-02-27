/**
 * Хук подписки на Realtime-обновления списка чатов.
 *
 * Слушает изменения в таблице messages (INSERT/UPDATE) и
 * инвалидирует кэш списка комнат, чтобы ChatList обновлялся в реальном времени.
 *
 * Также слушает таблицу rooms для обнаружения новых чатов, когда
 * кто-то создаёт с нами комнату.
 */
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CHANNEL_STATUS, DB_TABLES, REALTIME_EVENTS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

/** Тип записи в таблице room_members для Realtime */
interface RoomMemberRow {
    room_id: string;
    user_id: string;
}

/** Тип записи в таблице messages для Realtime */
interface MessageRow {
    id: string;
    room_id: string;
    sender_id: string;
}

/**
 * Подписка на обновления списка чатов.
 *
 * Обновляет кэш в двух случаях:
 * 1. Новое сообщение в любой комнате — обновляется last_message у чата.
 * 2. Нас добавили в новую комнату — появляется новый чат в списке.
 */
export function useChatListSubscription() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user) {
            return;
        }

        // В Mock-режиме не подписываемся
        if (import.meta.env.VITE_USE_MOCK === "true") {
            return;
        }

        const channel = supabase
            .channel("chatlist-updates")
            // Слушаем новые сообщения — обновляем last_message в списке
            .on(
                "postgres_changes",
                {
                    event: REALTIME_EVENTS.INSERT,
                    schema: "public",
                    table: DB_TABLES.MESSAGES,
                },
                (payload: RealtimePostgresChangesPayload<MessageRow>) => {
                    const msg = payload.new as MessageRow;
                    logger.info(
                        "ChatList: new message detected, invalidating rooms",
                        {
                            roomId: msg.room_id,
                        },
                    );

                    // Инвалидируем кэш списка комнат
                    queryClient.invalidateQueries({
                        queryKey: ["rooms"],
                    });

                    // Также инвалидируем счётчик непрочитанных
                    queryClient.invalidateQueries({
                        queryKey: ["unread_counts"],
                    });
                },
            )
            // Слушаем добавление нас в новую комнату
            .on(
                "postgres_changes",
                {
                    event: REALTIME_EVENTS.INSERT,
                    schema: "public",
                    table: DB_TABLES.ROOM_MEMBERS,
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: RealtimePostgresChangesPayload<RoomMemberRow>) => {
                    const member = payload.new as RoomMemberRow;
                    logger.info(
                        "ChatList: added to new room, invalidating rooms",
                        {
                            roomId: member.room_id,
                        },
                    );

                    queryClient.invalidateQueries({
                        queryKey: ["rooms"],
                    });
                },
            )
            .subscribe((status) => {
                if (status === CHANNEL_STATUS.CHANNEL_ERROR) {
                    logger.error("ChatList subscription error");
                }
                logger.info("ChatList subscription status", { status });
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);
}
