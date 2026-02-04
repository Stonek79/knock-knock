import type { ERROR_CODES } from '@/lib/constants/errors';

/**
 * Тип кодов ошибок, выведенный из констант.
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
