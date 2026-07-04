/**
 * ХУК ДЛЯ УПРАВЛЕНИЯ КРИПТОГРАФИЧЕСКИМИ КЛЮЧАМИ (KEYSTORE)
 * Адаптирован под Web Crypto API. Управляет жизненным циклом ключей в IndexedDB.
 */
import { useCallback, useEffect, useState } from "react";
import { ERROR_CODES, KEYSTORE_TYPES } from "@/lib/constants";
import {
    arrayBufferToBase64,
    exportPublicKey,
    generateIdentityKeyPair,
    generatePreKeyPair,
} from "@/lib/crypto/keys";
import {
    clearAllKeys,
    getKeyPair,
    hasKeys,
    saveKeyPair,
} from "@/lib/crypto/keystore";
import {
    createBackup,
    type KeyBackup,
    restoreBackup,
} from "@/lib/crypto/recovery";
import { logger } from "@/lib/logger";
import type { AppError } from "@/lib/types";
import { appError, err, ok, type Result } from "@/lib/utils/result";

export interface KeystoreState {
    loading: boolean;
    initialized: boolean;
    publicKeyEd25519: string | null;
    publicKeyX25519: string | null;
}

export interface KeystoreActions {
    regenerateKeys: () => Promise<Result<void, AppError<string>>>;
    initializeKeys: () => Promise<Result<void, AppError<string>>>;
    clearKeys: () => Promise<Result<void, AppError<string>>>;
    exportKeys: (
        password: string,
    ) => Promise<Result<KeyBackup, AppError<string>>>;
    restoreKeys: (
        backup: KeyBackup,
        password: string,
    ) => Promise<Result<void, AppError<string>>>;
}

export function useKeystore(): KeystoreState & KeystoreActions {
    const [state, setState] = useState<KeystoreState>({
        loading: true,
        initialized: false,
        publicKeyEd25519: null,
        publicKeyX25519: null,
    });

    /**
     * Загрузка публичных ключей из IndexedDB для отображения в UI.
     */
    const loadKeys = useCallback(async (): Promise<
        Result<void, AppError<string>>
    > => {
        setState((prev) => {
            return { ...prev, loading: true };
        });

        try {
            const keysExist = await hasKeys();

            if (keysExist) {
                const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
                const prekey = await getKeyPair(KEYSTORE_TYPES.PREKEY);

                let pubEd25519Str = null;
                let pubX25519Str = null;

                if (identity) {
                    const raw = await exportPublicKey(identity.publicKey);
                    pubEd25519Str = arrayBufferToBase64(raw);
                }

                if (prekey) {
                    const raw = await exportPublicKey(prekey.publicKey);
                    pubX25519Str = arrayBufferToBase64(raw);
                }

                setState({
                    loading: false,
                    initialized: true,
                    publicKeyEd25519: pubEd25519Str,
                    publicKeyX25519: pubX25519Str,
                });

                return ok(undefined);
            }

            setState({
                loading: false,
                initialized: false,
                publicKeyEd25519: null,
                publicKeyX25519: null,
            });

            return ok(undefined);
        } catch (error) {
            logger.error("Ошибка при загрузке ключей из Keystore:", error);
            setState((prev) => {
                return { ...prev, loading: false };
            });
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Не удалось загрузить ключи",
                    error,
                ),
            );
        }
    }, []);

    /**
     * Генерация новых ключей (Reset).
     */
    const regenerateKeys = useCallback(async (): Promise<
        Result<void, AppError<string>>
    > => {
        setState((prev) => {
            return { ...prev, loading: true };
        });

        try {
            const identityKeyPair = await generateIdentityKeyPair();
            const prekeyKeyPair = await generatePreKeyPair();

            await saveKeyPair({
                type: KEYSTORE_TYPES.IDENTITY,
                privateKey: identityKeyPair.privateKey,
                publicKey: identityKeyPair.publicKey,
            });
            await saveKeyPair({
                type: KEYSTORE_TYPES.PREKEY,
                privateKey: prekeyKeyPair.privateKey,
                publicKey: prekeyKeyPair.publicKey,
            });

            const rawIdentity = await exportPublicKey(
                identityKeyPair.publicKey,
            );
            const rawPrekey = await exportPublicKey(prekeyKeyPair.publicKey);

            setState({
                loading: false,
                initialized: true,
                publicKeyEd25519: arrayBufferToBase64(rawIdentity),
                publicKeyX25519: arrayBufferToBase64(rawPrekey),
            });

            return ok(undefined);
        } catch (error) {
            logger.error("Ошибка при генерации новых ключей:", error);
            setState((prev) => {
                return { ...prev, loading: false };
            });
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Не удалось сгенерировать ключи",
                    error,
                ),
            );
        }
    }, []);

    /**
     * Ленивая инициализация: создает ключи только если их нет.
     */
    const initializeKeys = useCallback(async (): Promise<
        Result<void, AppError<string>>
    > => {
        const keysExist = await hasKeys();
        if (!keysExist) {
            return await regenerateKeys();
        }
        return await loadKeys();
    }, [regenerateKeys, loadKeys]);

    /**
     * Очистка текущих ключей.
     */
    const clearKeys = useCallback(async (): Promise<
        Result<void, AppError<string>>
    > => {
        try {
            await clearAllKeys();
            setState({
                loading: false,
                initialized: false,
                publicKeyEd25519: null,
                publicKeyX25519: null,
            });
            return ok(undefined);
        } catch (error) {
            logger.error("Ошибка при очистке ключей:", error);
            return err(
                appError(
                    ERROR_CODES.CRYPTO_ERROR,
                    "Не удалось очистить ключи",
                    error,
                ),
            );
        }
    }, []);

    /**
     * Экспорт ключей (Backup).
     */
    const exportKeys = useCallback(
        async (
            password: string,
        ): Promise<Result<KeyBackup, AppError<string>>> => {
            try {
                const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
                const prekey = await getKeyPair(KEYSTORE_TYPES.PREKEY);

                if (!identity || !prekey) {
                    return err(
                        appError(
                            ERROR_CODES.NOT_FOUND_ERROR,
                            "Ключи для экспорта не найдены",
                        ),
                    );
                }

                const backup = await createBackup(password, identity, prekey);
                return ok(backup);
            } catch (error) {
                logger.error("Ошибка экспорта ключей:", error);
                return err(
                    appError(
                        ERROR_CODES.CRYPTO_ERROR,
                        "Не удалось создать бэкап",
                        error,
                    ),
                );
            }
        },
        [],
    );

    /**
     * Восстановление из бэкапа.
     */
    const restoreKeys = useCallback(
        async (
            backup: KeyBackup,
            password: string,
        ): Promise<Result<void, AppError<string>>> => {
            setState((prev) => {
                return { ...prev, loading: true };
            });

            try {
                const result = await restoreBackup(backup, password);

                if (result.isErr()) {
                    return err(result.error);
                }

                const restored = result.value;

                await saveKeyPair({
                    type: KEYSTORE_TYPES.IDENTITY,
                    privateKey: restored.identity.privateKey,
                    publicKey: restored.identity.publicKey,
                });
                await saveKeyPair({
                    type: KEYSTORE_TYPES.PREKEY,
                    privateKey: restored.prekey.privateKey,
                    publicKey: restored.prekey.publicKey,
                });

                await loadKeys();
                return ok(undefined);
            } catch (error) {
                logger.error("Ошибка при восстановлении ключей:", error);
                setState((prev) => {
                    return { ...prev, loading: false };
                });
                return err(
                    appError(
                        ERROR_CODES.CRYPTO_ERROR,
                        "Не удалось восстановить ключи",
                        error,
                    ),
                );
            }
        },
        [loadKeys],
    );

    useEffect(() => {
        loadKeys();
    }, [loadKeys]);

    return {
        ...state,
        regenerateKeys,
        initializeKeys,
        clearKeys,
        exportKeys,
        restoreKeys,
    };
}
