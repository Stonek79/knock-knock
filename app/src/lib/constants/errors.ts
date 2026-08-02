/**
 * Коды ошибок приложения.
 * Используются в AppError.kind
 */
export const ERROR_CODES = {
    DB_ERROR: "db-error",
    MISSING_KEYS_ERROR: "missing-keys-error",
    CRYPTO_ERROR: "crypto-error",
    NOT_FOUND_ERROR: "not-found-error",
    UNSUPPORTED_VERSION_ERROR: "unsupported-version-error",
    DECRYPT_FAILED_ERROR: "decrypt-failed-error",
    INVALID_BACKUP_ERROR: "invalid-backup-error",
    UNAUTHORIZED_ERROR: "unauthorized-error",
    NETWORK_ERROR: "network-error",
    FORBIDDEN_ERROR: "forbidden-error",
    NOT_IMPLEMENTED_ERROR: "not-implemented-error",
    VALIDATION_ERROR: "validation-error",
    AUTHENTICATION_ERROR: "authentication-error",
    UPLOAD_ERROR: "upload-error",
    DOWNLOAD_ERROR: "download-error",
} as const;
