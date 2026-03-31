/**
 * Коды ошибок приложения.
 * Используются в AppError.kind
 */
export const ERROR_CODES = {
    DB_ERROR: "db-error",
    MISSING_KEYS: "missing-keys",
    CRYPTO_ERROR: "crypto-error",
    NOT_FOUND: "not-found",
    UNSUPPORTED_VERSION: "unsupported-version",
    DECRYPT_FAILED: "decrypt-failed",
    INVALID_BACKUP: "invalid-backup_format",
    UNAUTHORIZED: "unauthorized",
    NETWORK_ERROR: "NetworkError",
    NOT_FOUND_ERROR: "NotFoundError",
    FORBIDDEN_ERROR: "ForbiddenError",
    VALIDATION_ERROR: "ValidationError",
    AUTHENTICATION_ERROR: "AuthenticationError",
    UPLOAD_ERROR: "UploadError",
    DOWNLOAD_ERROR: "DownloadError",
} as const;
