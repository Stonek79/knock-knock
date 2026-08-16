import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { logger } from "../logger";

/**
 * Узкий seam для безопасного завершения сессии (logout / смена пользователя):
 *  - `sessionGuard` — монотонный generation guard: async-ответы предыдущей
 *    сессии не должны писать в IndexedDB/QueryClient после её завершения;
 *  - `sessionCleanup` — отмена in-flight запросов и очистка чувствительных
 *    данных из общего TanStack QueryClient.
 *
 * QueryClient регистрируется один раз в AuthLayout (там же, где включается
 * ChatRealtimeService), а не импортируется из main.tsx, чтобы не создавать
 * циклическую зависимость.
 */

/** Монотонно растущий номер сессии. */
let sessionGeneration = 0;
let _queryClient: QueryClient | null = null;

export const sessionGuard = {
    /** Значение guard'а для захвата в начале async-запроса. */
    current(): number {
        return sessionGeneration;
    },
    /** Инвалидирует все in-flight запросы предыдущей сессии. */
    invalidate(): void {
        sessionGeneration += 1;
    },
};

/**
 * Чувствительные query-key префиксы (содержат персональные/комнатные данные),
 * которые отменяются и удаляются из общего клиента при logout.
 *
 * Каждый префикс — это первый сегмент соответствующего константного ключа
 * (`QUERY_KEYS.*`), чтобы источник истины оставался один и не было магических
 * строк. Используем одноэлементные массивы-префиксы (а не `QUERY_KEYS.xxx()`):
 * в v5 явные `undefined`/`null` в ключе фильтра сопоставляются строго, а не как
 * wildcard, поэтому `["rooms", undefined]` не удалит `["rooms","user-1"]`.
 *
 * При `exact: false` (по умолчанию) TanStack Query сопоставляет префикс с
 * ключами запроса. `favorites` (`["rooms","favorites",...]`) покрывается
 * префиксом `rooms`, а отдельные top-level ключи `favorites-room`,
 * `broadcast-history` и admin (`["admin",...]`) перечислены явно.
 */
const SENSITIVE_QUERY_KEY_PREFIXES: readonly (readonly string[])[] = [
    [QUERY_KEYS.rooms("")[0]],
    [QUERY_KEYS.favoritesRoom("")[0]],
    [QUERY_KEYS.messages("")[0]],
    [QUERY_KEYS.room("")[0]],
    [QUERY_KEYS.unreadCounts("")[0]],
    [QUERY_KEYS.presence()[0]],
    [QUERY_KEYS.typing("")[0]],
    [QUERY_KEYS.profileKeys("")[0]],
    [QUERY_KEYS.profile("")[0]],
    [QUERY_KEYS.media("")[0]],
    [QUERY_KEYS.user("")[0]],
    [QUERY_KEYS.contacts()[0]],
    [QUERY_KEYS.adminUsers("")[0]],
    [QUERY_KEYS.broadcastHistory()[0]],
];

export const sessionCleanup = {
    registerQueryClient(qc: QueryClient | null): void {
        _queryClient = qc;
    },

    hasQueryClient(): boolean {
        return _queryClient !== null;
    },

    /**
     * Вызывается при signOut. Сначала инвалидирует session guard (вне
     * зависимости от наличия QueryClient), затем отменяет и удаляет
     * чувствительные данные.
     *
     * Порядок важен: перед `removeQueries` вызывается `cancelQueries`, чтобы
     * in-flight запросы (ещё выполняющиеся fetch'и) завершились как отменённые
     * и не «оживили» и не записали данные обратно в клиент после удаления.
     */
    async clearSensitiveQueryData(): Promise<void> {
        sessionGuard.invalidate();
        const qc = _queryClient;
        if (!qc) {
            return;
        }
        for (const prefix of SENSITIVE_QUERY_KEY_PREFIXES) {
            // cancelQueries отменяет активные fetch'и по префиксу; без этого
            // готовый ответ мог бы перезаписать только что удалённые данные.
            await qc.cancelQueries({ queryKey: prefix });
            qc.removeQueries({ queryKey: prefix });
        }
        logger.debug("sessionCleanup: чувствительные query-данные удалены");
    },
};
