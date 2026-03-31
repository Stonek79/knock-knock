import { ClientResponseError } from "pocketbase";
import { ERROR_CODES } from "../constants";
import type { ErrorCode } from "../types";

/**
 * Проверяет, является ли ошибка сетевой (тайм-аут, обрыв соединения, отмена)
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof ClientResponseError) {
        // status 0 — признак отмены или сетевого сбоя в PocketBase
        return error.status === 0 || error.isAbort;
    }

    if (error instanceof Error) {
        return (
            error.name === "TypeError" && error.message === "Failed to fetch"
        );
    }

    return false;
}

/**
 * Маппит ошибку PocketBase в внутренний код ошибки (ErrorCode)
 */
export function mapPbErrorCode(error: unknown): ErrorCode {
    if (error instanceof ClientResponseError) {
        switch (error.status) {
            case 0:
                return ERROR_CODES.NETWORK_ERROR;
            case 401:
            case 403:
                return ERROR_CODES.AUTHENTICATION_ERROR;
            case 404:
                return ERROR_CODES.NOT_FOUND_ERROR;
            case 400:
                return ERROR_CODES.VALIDATION_ERROR;
            case 429:
                // Too Many Requests
                return ERROR_CODES.VALIDATION_ERROR;
            default:
                if (error.status >= 500) {
                    return ERROR_CODES.DB_ERROR;
                }
                return ERROR_CODES.DB_ERROR;
        }
    }

    if (isNetworkError(error)) {
        return ERROR_CODES.NETWORK_ERROR;
    }

    return ERROR_CODES.DB_ERROR;
}

/**
 * Извлекает детальные ошибки валидации по полям
 */
export function getPbValidationErrors(
    error: unknown,
): Record<string, string> | null {
    if (
        error instanceof ClientResponseError &&
        error.status === 400 &&
        error.response?.data
    ) {
        const data = error.response.data;
        const result: Record<string, string> = {};
        for (const key in data) {
            if (data[key]?.message) {
                result[key] = data[key].message;
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    }
    return null;
}
