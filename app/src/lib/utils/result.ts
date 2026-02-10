import { err, fromPromise, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AppError } from "@/lib/types/result";

/**
 * Реэкспорт примитивов neverthrow для консистентного использования.
 */
export { ok, err, fromPromise };

/**
 * Хелпер для создания типизированной ошибки приложения (AppError).
 * Позволяет создать объект ошибки с полем `kind` для Discriminated Unions.
 */
export const appError = <K extends string, D>(
    kind: K,
    message: string,
    details?: D,
): AppError<K, D> => ({
    kind,
    message,
    details,
});

/**
 * Общая схема Zod для ответов, похожих на Result.
 * Полезна для валидации ответов API.
 * Создает union: { ok: true, value: T } | { ok: false, error: E }
 */
export const resultSchema = <T extends z.ZodTypeAny, E extends z.ZodTypeAny>(
    dataSchema: T,
    errorSchema: E,
) =>
    z.union([
        z.object({ ok: z.literal(true), value: dataSchema }),
        z.object({ ok: z.literal(false), error: errorSchema }),
    ]);

/**
 * Type guard для проверки, является ли объект типом Result.
 * Проверяет наличие методов isOk и isErr.
 */
export const isResult = (val: unknown): val is Result<unknown, unknown> => {
    return (
        typeof val === "object" &&
        val !== null &&
        "isOk" in val &&
        "isErr" in val
    );
};
