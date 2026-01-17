import type { FileRoutesByPath } from '@tanstack/react-router';

/** Название приложения */
export const APP_NAME = 'Knock-Knock';

/** Пути маршрутизации приложения */
export const ROUTES: { [key: string]: keyof FileRoutesByPath | undefined } = {
    HOME: '/',
    LOGIN: '/login/',
    PROFILE: '/profile/',
};

/** Константы валидации форм */
export const VALIDATION = {
    USERNAME_MIN_LENGTH: 3,
} as const;

/** Названия таблиц базы данных Supabase */
export const DB_TABLES = {
    PROFILES: 'profiles',
} as const;
