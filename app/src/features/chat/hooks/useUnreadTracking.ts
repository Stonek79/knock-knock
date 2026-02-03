import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DecryptedMessageWithProfile } from '@/lib/types/message';

export function useUnreadTracking(
    roomId: string,
    messages: DecryptedMessageWithProfile[],
    lastReadAt?: string | null,
) {
    const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
    const initialized = useRef(false);

    // Инициализация позиции разделителя на основе last_read_at с сервера
    useEffect(() => {
        if (!roomId || messages?.length === 0 || initialized.current) return;

        // Если есть временная метка с сервера, ищем первое сообщение после неё
        if (lastReadAt) {
            const lastReadTime = new Date(lastReadAt).getTime();
            const firstUnread = messages.find(
                (m) => new Date(m.created_at).getTime() > lastReadTime,
            );
            if (firstUnread) {
                setFirstUnreadId(firstUnread.id);
            }
        }
        initialized.current = true;
    }, [roomId, messages, lastReadAt]);

    // Отметить как прочитанное (RPC вызов)
    const markAsRead = useCallback(async () => {
        if (!roomId) return;

        try {
            await supabase.rpc('mark_room_as_read', { p_room_id: roomId });
            setFirstUnreadId(null);
        } catch (e) {
            console.error('Не удалось отметить комнату как прочитанную', e);
        }
    }, [roomId]);

    return {
        firstUnreadId,
        markAsRead,
    };
}
