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
} as const;
