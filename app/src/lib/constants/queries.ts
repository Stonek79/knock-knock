/**
 * Константы для ключей React Query.
 * Используются для типизации и предотвращения опечаток в queryKey.
 */
export const QUERY_KEYS = {
    rooms: (userId?: string) => ["rooms", userId] as const,
    favorites: (userId?: string) => ["rooms", "favorites", userId] as const,
    messages: (roomId: string) => ["messages", roomId] as const,
} as const;
