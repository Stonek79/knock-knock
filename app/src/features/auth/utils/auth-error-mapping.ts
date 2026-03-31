import { ERROR_CODES } from "@/lib/constants";
import { isAppError } from "@/lib/utils/result";

/**
 * Маппит системные ошибки авторизации на пользовательские сообщения.
 *
 * @param error - Объект ошибки (AppError или стандартный Error)
 * @returns Локализованная строка сообщения
 */
export function getAuthErrorMessage(error: unknown): string {
    if (isAppError(error)) {
        switch (error.kind) {
            case ERROR_CODES.NETWORK_ERROR: {
                return "auth.errors.serverUnreachable";
            }
            case ERROR_CODES.AUTHENTICATION_ERROR:
            case ERROR_CODES.VALIDATION_ERROR:
            case ERROR_CODES.NOT_FOUND_ERROR: {
                return "auth.errors.invalidCredentials";
            }
            default: {
                return error.message || "auth.errors.unknown";
            }
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "auth.errors.unknown";
}
