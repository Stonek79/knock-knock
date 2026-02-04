/**
 * Хук для управления криптографическими ключами.
 * Адаптирован под Web Crypto API (все операции асинхронные).
 */
import { useCallback, useEffect, useState } from 'react';
import {
    arrayBufferToBase64,
    clearAllKeys,
    createBackup,
    exportPublicKey,
    generateIdentityKeyPair,
    generatePreKeyPair,
    getKeyPair,
    hasKeys,
    type KeyBackup,
    restoreBackup,
    saveKeyPair,
} from '@/lib/crypto';
import type { RecoveryError, RestoredKeys } from '@/lib/crypto/recovery';
import type { Result } from '@/lib/types/result';

export interface KeystoreState {
    loading: boolean;
    initialized: boolean;
    publicKeyEd25519: string | null;
    publicKeyX25519: string | null;
}

export interface KeystoreActions {
    regenerateKeys: () => Promise<void>;
    initializeKeys: () => Promise<void>;
    clearKeys: () => Promise<void>;
    exportKeys: (password: string) => Promise<KeyBackup | null>;
    restoreKeys: (backup: KeyBackup, password: string) => Promise<void>;
}

export function useKeystore(): KeystoreState & KeystoreActions {
    const [state, setState] = useState<KeystoreState>({
        loading: true,
        initialized: false,
        publicKeyEd25519: null,
        publicKeyX25519: null,
    });

    const loadKeys = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));

        try {
            const keysExist = await hasKeys();

            if (keysExist) {
                const identity = await getKeyPair('identity');
                const prekey = await getKeyPair('prekey');

                // Экспортируем публичные ключи для отображения (Base64)
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
            } else {
                setState({
                    loading: false,
                    initialized: false,
                    publicKeyEd25519: null,
                    publicKeyX25519: null,
                });
            }
        } catch (error) {
            console.error('Failed to load keys:', error);
            setState((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    const regenerateKeys = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));

        try {
            // Генерируем CryptoKey пары
            const identity = await generateIdentityKeyPair();
            const prekey = await generatePreKeyPair();

            // Сохраняем объекты CryptoKey
            await saveKeyPair(
                'identity',
                identity.privateKey,
                identity.publicKey,
            );
            await saveKeyPair('prekey', prekey.privateKey, prekey.publicKey);

            // Экспортируем для UI
            const rawIdentity = await exportPublicKey(identity.publicKey);
            const rawPrekey = await exportPublicKey(prekey.publicKey);

            setState({
                loading: false,
                initialized: true,
                publicKeyEd25519: arrayBufferToBase64(rawIdentity),
                publicKeyX25519: arrayBufferToBase64(rawPrekey),
            });
        } catch (error) {
            console.error('Failed to generate keys:', error);
            setState((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    const initializeKeys = useCallback(async () => {
        const keysExist = await hasKeys();
        if (!keysExist) {
            await regenerateKeys();
        } else {
            // Если ключи есть, но стейт не обновлен (редкий кейс)
            await loadKeys();
        }
    }, [regenerateKeys, loadKeys]);

    const clearKeys = useCallback(async () => {
        await clearAllKeys();
        setState({
            loading: false,
            initialized: false,
            publicKeyEd25519: null,
            publicKeyX25519: null,
        });
    }, []);

    const exportKeys = useCallback(async (password: string) => {
        try {
            const identity = await getKeyPair('identity');
            const prekey = await getKeyPair('prekey');

            if (!identity || !prekey) {
                throw new Error('Keys not found');
            }

            return await createBackup(password, identity, prekey);
        } catch (error) {
            console.error('Export failed:', error);
            return null;
        }
    }, []);

    const restoreKeys = useCallback(
        async (backup: KeyBackup, password: string) => {
            setState((prev) => ({ ...prev, loading: true }));
            try {
                const result: Result<RestoredKeys, RecoveryError> =
                    await restoreBackup(backup, password);

                if (result.isErr()) {
                    throw new Error(result.error.message);
                }
                const restored = result.value;

                await saveKeyPair(
                    'identity',
                    restored.identity.privateKey,
                    restored.identity.publicKey,
                );
                await saveKeyPair(
                    'prekey',
                    restored.prekey.privateKey,
                    restored.prekey.publicKey,
                );

                await loadKeys();
            } catch (error) {
                console.error('Restore failed:', error);
                setState((prev) => ({ ...prev, loading: false }));
                throw error;
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
