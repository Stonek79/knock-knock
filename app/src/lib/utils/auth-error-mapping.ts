import { ERROR_CODES } from "../constants";
import {
    AUTH_ERROR_KEYS,
    REGISTRATION_INVITE_ERROR_KEYS,
} from "../constants/auth-errors";
import type { AuthErrorContext, AuthErrorKey } from "../types/auth-errors";
import { isAppError } from "./result";

function getBackendMessage(details: unknown): string | undefined {
    if (typeof details !== "object" || details === null) {
        return undefined;
    }

    const response = "response" in details ? details.response : undefined;
    if (typeof response !== "object" || response === null) {
        return undefined;
    }

    if ("message" in response && typeof response.message === "string") {
        return response.message;
    }

    const data = "data" in response ? response.data : undefined;
    if (typeof data !== "object" || data === null) {
        return undefined;
    }

    const inviteField = "invite_code" in data ? data.invite_code : undefined;
    if (typeof inviteField !== "object" || inviteField === null) {
        return undefined;
    }

    return "message" in inviteField && typeof inviteField.message === "string"
        ? inviteField.message
        : undefined;
}

function getRegistrationInviteErrorKey(
    details: unknown,
): AuthErrorKey | undefined {
    const message = getBackendMessage(details);
    if (!message) {
        return undefined;
    }

    return (
        REGISTRATION_INVITE_ERROR_KEYS[
            message as keyof typeof REGISTRATION_INVITE_ERROR_KEYS
        ] ?? undefined
    );
}

/** Converts an internal error into a safe localization key. */
export function getAuthErrorKey(
    error: unknown,
    context: AuthErrorContext = "login",
): AuthErrorKey {
    if (!isAppError(error)) {
        return context === "register"
            ? AUTH_ERROR_KEYS.registerFailed
            : AUTH_ERROR_KEYS.unknown;
    }

    if (context === "register") {
        const inviteErrorKey = getRegistrationInviteErrorKey(error.details);
        if (inviteErrorKey) {
            return inviteErrorKey;
        }
    }

    switch (error.kind) {
        case ERROR_CODES.NETWORK_ERROR:
            return AUTH_ERROR_KEYS.serverUnreachable;
        case ERROR_CODES.AUTHENTICATION_ERROR:
            return AUTH_ERROR_KEYS.invalidCredentials;
        case ERROR_CODES.UNAUTHORIZED_ERROR:
            return AUTH_ERROR_KEYS.unauthorized;
        case ERROR_CODES.VALIDATION_ERROR:
        case ERROR_CODES.NOT_FOUND_ERROR:
        case ERROR_CODES.DB_ERROR:
        case ERROR_CODES.FORBIDDEN_ERROR:
            return context === "register"
                ? AUTH_ERROR_KEYS.registerFailed
                : AUTH_ERROR_KEYS.invalidCredentials;
        default:
            return context === "register"
                ? AUTH_ERROR_KEYS.registerFailed
                : AUTH_ERROR_KEYS.unknown;
    }
}
