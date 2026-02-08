import { useQuery } from '@tanstack/react-query';
import { DB_TABLES } from '@/lib/constants';
import { decryptMessage } from '@/lib/crypto/messages';
import { logger } from '@/lib/logger';
import { isMock, supabase } from '@/lib/supabase';
import type {
    DecryptedMessageWithProfile,
    MessageRow,
} from '@/lib/types/message';
import { useAuthStore } from '@/stores/auth';
import { useMessageSubscription } from './useMessageSubscription';

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

    // 1. Инициализация подписки на Realtime события (новые сообщения, обновления статусов)
    useMessageSubscription({
        roomId,
        roomKey,
        userId: user?.id,
    });

    // 2. React Query для загрузки и кэширования списка сообщений
    const query = useQuery({
        queryKey: ['messages', roomId],
        queryFn: async (): Promise<DecryptedMessageWithProfile[]> => {
            // Если нет ID комнаты или ключа шифрования, загрузка невозможна
            if (!roomId || !roomKey) return [];

            // Запрос в Supabase
            const { data, error } = await supabase
                .from(DB_TABLES.MESSAGES)
                .select('*, profiles(display_name, avatar_url)')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true }); // Сортировка от старых к новым

            if (error) {
                logger.error('Ошибка при загрузке сообщений', error);
                throw error;
            }

            const decrypted: DecryptedMessageWithProfile[] = [];

            // Приведение типов для результата Supabase (join с profiles)
            const rows = data as unknown as (MessageRow & {
                profiles: {
                    display_name: string;
                    avatar_url: string | null;
                } | null;
            })[];

            // 3. Обработка и расшифровка каждого сообщения
            for (const msg of rows) {
                // Local Delete (Delete for Me)
                if (msg.deleted_by?.includes(user?.id || '')) {
                    continue;
                }

                // Если сообщение помечено как удаленное
                if (msg.is_deleted) {
                    // Если это СВОЕ сообщение -> полностью скрываем
                    if (msg.sender_id === user?.id) {
                        continue;
                    }
                    // Если чужое -> показываем плашку "Сообщение удалено"
                    decrypted.push({ ...msg, content: null });
                    continue;
                }

                // Если контента нет по другой причине (битые данные)
                if (msg.content === null) {
                    decrypted.push({ ...msg, content: null });
                    continue;
                }

                if (isMock) {
                    decrypted.push({ ...msg, content: msg.content });
                    continue;
                }

                // Проверка целостности данных шифрования
                if (!msg.iv) {
                    logger.error(
                        `Сообщение ${msg.id} не содержит IV (вектор инициализации)`,
                    );
                    decrypted.push({
                        ...msg,
                        content: '🔒 Ошибка: Нет вектора шифрования',
                    });
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
                    decrypted.push({ ...msg, content });
                } catch (e) {
                    // В случае ошибки расшифровки (например, смена ключей или битые данные)
                    logger.error(
                        `Не удалось расшифровать сообщение ${msg.id}`,
                        e,
                    );
                    decrypted.push({
                        ...msg,
                        content: '🔒 Ошибка расшифровки',
                    });
                }
            }
            return decrypted;
        },
        // Запрос выполняется только когда известны RoomID и есть ключ
        enabled: !!roomId && !!roomKey,
    });

    return query;
}
