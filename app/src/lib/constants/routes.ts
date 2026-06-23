/** Пути маршрутизации приложения */
export const ROUTES = {
    HOME: "/",
    LOGIN: "/login",
    PROFILE: "/profile",
    CHAT_LIST: "/chat",
    PRIVATE: "/private",
    CONTACTS: "/contacts",
    SETTINGS: "/settings",
    SETTINGS_ACCOUNT: "/settings/account",
    SETTINGS_APPEARANCE: "/settings/appearance",
    SETTINGS_PRIVACY: "/settings/privacy",
    SETTINGS_NOTIFICATIONS: "/settings/notifications",
    SETTINGS_SECURITY: "/settings/security",
    SETTINGS_STORAGE: "/settings/storage",
    SETTINGS_PROFILE: "/settings/profile",
    FAVORITES: "/favorites",
    CALLS: "/calls",
    ADMIN: "/admin",
    ADMIN_USERS: "/admin/users",
    CHAT_ROOM: "/chat/$roomId",
    FAVORITES_ROOM: "/favorites/$roomId",
    DM: "/dm/$userId",
    AUTH_DM: "/_auth/dm/$userId",
    TERMS: "/terms",
    VERIFY: "/auth/verify",
} as const;

/** Пути к кастомным API эндпоинтам бэкенда */
export const API_ROUTES = {
    USERS_SEARCH: "/api/custom/users/search",
    USERS_CONTACTS: "/api/custom/users/contacts",
} as const;
