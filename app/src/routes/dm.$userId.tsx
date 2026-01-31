import { createFileRoute } from '@tanstack/react-router';
import { DMInitializer } from '@/features/chat/DMInitializer';

/**
 * Роут инициализации DM-чата.
 *
 * Вместо прямого перехода в /chat/{roomId}, используется /dm/{userId}.
 * Компонент DMInitializer находит существующую комнату или создаёт новую,
 * затем редиректит на /chat/{roomId}.
 *
 * Это стандартный паттерн мессенджеров (Telegram, WhatsApp, Slack).
 */
interface DMSearch {
    isPrivate?: boolean;
}

export const Route = createFileRoute('/dm/$userId')({
    component: DMInitializer,
    validateSearch: (search: Record<string, unknown>): DMSearch => {
        return {
            isPrivate: search.isPrivate === true || search.isPrivate === 'true',
        };
    },
});
