/**
 * Основные типы Result (из neverthrow).
 * Только чистые типы, никакого runtime-кода.
 */
import type { Err, Ok, Result } from "neverthrow";

export type { Result, Ok, Err };

/**
 * Базовый тип ошибки приложения.
 * Использует поле `kind` для Discriminated Unions.
 */
export type AppError<K extends string, D = unknown> = {
    kind: K;
    message: string;
    details?: D;
};
