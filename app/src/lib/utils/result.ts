import { err, fromPromise, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AppError } from "@/lib/types/result";

/**
 * Реэкспорт примитивов neverthrow для консистентного использования.
 */
export { ok, err, fromPromise };
export type { Result };

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

// Вспомогательная проверка, является ли значение объектом (Record)
const isRecord = (val: unknown): val is Record<string, unknown> =>
    typeof val === "object" && val !== null;

/**
 * Type guard для проверки, является ли объект типом Result.
 * Проверяет наличие методов isOk и isErr.
 */
export const isResult = (val: unknown): val is Result<unknown, unknown> => {
    return isRecord(val) && "isOk" in val && "isErr" in val;
};

/**
 * Type guard для проверки, является ли объект типом AppError.
 */
export const isAppError = (val: unknown): val is AppError<string, unknown> => {
    return isRecord(val) && "kind" in val && "message" in val;
};

/**
 * Безопасно извлекает человекочитаемое сообщение из ошибки любого типа.
 * Поддерживает стандартные Error, наши AppError и строки.
 */
export function getErrorMessage(error: unknown): string | undefined {
    if (!error) {
        return undefined;
    }

    if (typeof error === "string") {
        return error;
    }

    if (isAppError(error)) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return undefined;
}
