/**
 * Константы для ключей React Query.
 * Используются для типизации и предотвращения опечаток в queryKey.
 */
export const QUERY_KEYS = {
    rooms: (userId?: string) => ["rooms", userId] as const,
    favorites: (userId?: string) => ["rooms", "favorites", userId] as const,
    messages: (roomId: string) => ["messages", roomId] as const,
    room: (roomId: string) => ["room", roomId] as const,
    user: (userId: string) => ["user", userId] as const,
    contacts: () => ["contacts"] as const,
    profile: (userId?: string) => ["profile", userId] as const,
    profileKeys: (userId: string) => ["profile-keys", userId] as const,
    adminUsers: (search?: string) => ["admin", "users", search] as const,
    unreadCounts: (userId?: string) => ["unread_counts", userId] as const,
    presence: () => ["presence"] as const,
    typing: (roomId: string) => ["typing", roomId] as const,
    favoritesRoom: (userId?: string) => ["favorites-room", userId] as const,
    media: (mediaId?: string | null, userId?: string | null) =>
        ["media", mediaId, userId] as const,
} as const;
