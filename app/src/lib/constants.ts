/** Название приложения */
export const APP_NAME = 'Knock-Knock';

/** Пути маршрутизации приложения */
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    PROFILE: '/profile',
} as const;

/** Константы валидации форм */
export const VALIDATION = {
    USERNAME_MIN_LENGTH: 3,
} as const;

/** Названия таблиц базы данных Supabase */
export const DB_TABLES = {
    PROFILES: 'profiles',
} as const;
