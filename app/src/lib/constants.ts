/** Название приложения */
export const APP_NAME = 'KnokKnok';

/** Версия приложения */
export const APP_VERSION = '0.1.0';
/** Пути маршрутизации приложения */
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    PROFILE: '/profile',
    CHAT_LIST: '/chat',
    CONTACTS: '/contacts',
    SETTINGS: '/settings',
    FAVORITES: '/favorites',
    CALLS: '/calls',
} as const;

/** Константы валидации форм */
export const VALIDATION = {
    USERNAME_MIN_LENGTH: 3,
} as const;

/** Названия таблиц базы данных Supabase */
export const DB_TABLES = {
    PROFILES: 'profiles',
    ROOMS: 'rooms',
    ROOM_MEMBERS: 'room_members',
    ROOM_KEYS: 'room_keys',
    MESSAGES: 'messages',
} as const;
