import type { QueryData } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DB_TABLES, MESSAGE_STATUS, QUERY_KEYS } from "@/lib/constants";
import { decryptMessage } from "@/lib/crypto/messages";
import { logger } from "@/lib/logger";
import { messageAttachmentSchema } from "@/lib/schemas/message";
import { isMock, supabase } from "@/lib/supabase";
import type {
    Attachment,
    DecryptedMessageWithProfile,
} from "@/lib/types/message";
import { useAuthStore } from "@/stores/auth";
import { useMessageSubscription } from "./useMessageSubscription";

const getMessagesQuery = (roomId: string) =>
    supabase
        .from(DB_TABLES.MESSAGES)
        .select("*, profiles(display_name, avatar_url)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true }); // Сортировка от старых к новым

type MessageQueryResult = QueryData<ReturnType<typeof getMessagesQuery>>;

/**
 * Парсит attachments из JSON в типизированный массив Attachment
 */
function parseAttachments(json: unknown): Attachment[] | null {
    if (!json || !Array.isArray(json)) {
        return null;
    }

    const parsed = json
        .map((item) => {
            const result = messageAttachmentSchema.safeParse(item);
            return result.success ? result.data : null;
        })
        .filter((item): item is Attachment => item !== null);

    return parsed.length > 0 ? parsed : null;
}

/**
 * Вспомогательная функция для маппинга ответа БД в строго типизированный объект
 */
function mapMessageRow(
    msg: MessageQueryResult[number],
    content: string | null,
    t: (key: string, defaultValue: string) => string,
): DecryptedMessageWithProfile {
    const rawProfile = Array.isArray(msg.profiles)
        ? msg.profiles[0]
        : msg.profiles;
    const profiles = rawProfile
        ? {
              display_name:
                  rawProfile.display_name ||
                  t("chat.unknownUser", "Неизвестный"),
              avatar_url: rawProfile.avatar_url,
          }
        : null;

    return {
        id: msg.id,
        room_id: msg.room_id || "",
        sender_id: msg.sender_id,
        content,
        iv: msg.iv,
        created_at: msg.created_at || "",
        updated_at: msg.updated_at || undefined,
        status:
            (msg.status as (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS]) ||
            MESSAGE_STATUS.SENT,
        deleted_by: [], // В БД пока нет этого поля, фоллбэк согласно схеме Zod
        is_edited: msg.is_edited || false,
        is_deleted: msg.is_deleted || false,
        is_starred: msg.is_starred || false,
        attachments: parseAttachments(msg.attachments),
        profiles,
    };
}

/**
 * Хук для загрузки сообщений и автоматического обновления.
 *
 * Основные функции:
 * 1. Первичная загрузка сообщений из базы данных.
 * 2. Расшифровка контента на клиенте (End-to-End Encryption).
 * 3. Фильтрация удаленных сообщений.
 * 4. Подключение к Realtime обновлениям через отдельный хук.
 */
export function useMessages(roomId: string, roomKey?: CryptoKey) {
    const { user } = useAuthStore();
    const { t } = useTranslation();

    // 1. Инициализация подписки на Realtime события (новые сообщения, обновления статусов)
    useMessageSubscription({
        roomId,
        roomKey,
        userId: user?.id,
    });

    // 2. React Query для загрузки и кэширования списка сообщений
    const query = useQuery({
        queryKey: QUERY_KEYS.messages(roomId),
        queryFn: async (): Promise<DecryptedMessageWithProfile[]> => {
            // Если нет ID комнаты или ключа шифрования, загрузка невозможна
            if (!roomId || !roomKey) {
                return [];
            }

            const messagesQuery = getMessagesQuery(roomId);

            // Запрос в Supabase
            const { data, error } = await messagesQuery;

            if (error) {
                logger.error("Ошибка при загрузке сообщений", error);
                throw error;
            }

            const decrypted: DecryptedMessageWithProfile[] = [];

            // Приведение типов для результата Supabase (join с profiles)
            const rows = data || ([] as MessageQueryResult);

            // 3. Обработка и расшифровка каждого сообщения
            for (const msg of rows) {
                // Если контента нет по другой причине (битые данные)
                if (msg.content === null) {
                    decrypted.push(mapMessageRow(msg, null, t));
                    continue;
                }

                // Если сообщение помечено как удаленное
                if (msg.is_deleted) {
                    // Если это СВОЕ сообщение -> полностью скрываем
                    if (msg.sender_id === user?.id) {
                        continue;
                    }
                    // Если чужое -> показываем плашку "Сообщение удалено"
                    decrypted.push(mapMessageRow(msg, null, t));
                    continue;
                }

                if (isMock) {
                    decrypted.push(mapMessageRow(msg, msg.content, t));
                    continue;
                }

                // Проверка целостности данных шифрования
                if (!msg.iv) {
                    logger.error(
                        `Сообщение ${msg.id} не содержит IV (вектор инициализации)`,
                    );
                    decrypted.push(
                        mapMessageRow(
                            msg,
                            t(
                                "chat.noEncryptionVector",
                                "🔒 Ошибка: Нет вектора шифрования",
                            ),
                            t,
                        ),
                    );
                    continue;
                }

                try {
                    // Попытка расшифровки
                    // Важно: расшифровка происходит на клиенте, сервер не видит ключа
                    const content = await decryptMessage(
                        msg.content,
                        msg.iv,
                        roomKey,
                    );
                    decrypted.push(mapMessageRow(msg, content, t));
                } catch (e) {
                    // В случае ошибки расшифровки (например, смена ключей или битые данные)
                    logger.error(
                        `Не удалось расшифровать сообщение ${msg.id}`,
                        e,
                    );
                    decrypted.push(
                        mapMessageRow(
                            msg,
                            t("chat.decryptionError", "🔒 Ошибка расшифровки"),
                            t,
                        ),
                    );
                }
            }
            return decrypted;
        },
        // Запрос выполняется только когда известны RoomID и есть ключ
        enabled: !!roomId && !!roomKey,
    });

    return query;
}
