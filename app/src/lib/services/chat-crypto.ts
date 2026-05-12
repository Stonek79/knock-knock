import { KEYSTORE_TYPES } from "../constants";
import { unwrapRoomKey } from "../crypto/encryption";
import { base64ToArrayBuffer } from "../crypto/keys";
import { getKeyPair } from "../crypto/keystore";
import { generateDeterministicRoomKey } from "../crypto/rooms";
import { logger } from "../logger";
import { roomRepository } from "../repositories/room.repository";
import type { MessageRow } from "../types";
import { decryptMessagePayload } from "../utils/decryptPayload";

/**
 * Сервис для управления криптографическими ключами чатов в памяти и дешифровки сообщений.
 * Централизует кэширование ключей комнат и логику дешифровки превью.
 */
class ChatCryptoService {
    private keyCache = new Map<string, CryptoKey>();
    private identityKey: CryptoKey | null = null;

    /**
     * Получает ключ комнаты из кэша или расшифровывает его из БД.
     */
    async getRoomKey({
        roomId,
        userId,
    }: {
        roomId: string;
        userId: string;
    }): Promise<CryptoKey | null> {
        // 1. Проверяем кэш
        const cached = this.keyCache.get(roomId);
        if (cached) {
            return cached;
        }

        // 2. Пытаемся достать и расшифровать ключ из БД
        try {
            const keyResult = await roomRepository.getRoomKey(roomId, userId);
            if (keyResult.isErr()) {
                // Если в БД нет ключа, пробуем DEV-FALLBACK
                return await this.tryDevFallback({ roomId });
            }

            // Нам нужен Identity Key для расшифровки ключа комнаты
            const privateKey = await this.getIdentityPrivateKey();
            if (!privateKey) {
                logger.warn("ChatCryptoService: Identity Key не найден");
                return null;
            }

            const encryptedData = JSON.parse(keyResult.value.encrypted_key);
            const key = await unwrapRoomKey(
                {
                    ephemeralPublicKey: base64ToArrayBuffer(
                        encryptedData.ephemeralPublicKey,
                    ),
                    iv: base64ToArrayBuffer(encryptedData.iv),
                    ciphertext: base64ToArrayBuffer(encryptedData.ciphertext),
                },
                privateKey,
            );

            if (key) {
                this.keyCache.set(roomId, key);
                return key;
            }
        } catch (err) {
            logger.error(
                "ChatCryptoService: Ошибка получения ключа комнаты",
                err,
            );
        }

        return await this.tryDevFallback({ roomId });
    }

    /**
     * Расшифровывает превью сообщения для списка чатов.
     */
    async decryptPreview({
        message,
        userId,
    }: {
        message: MessageRow;
        userId: string;
    }): Promise<{ content: string; isDecrypted: boolean }> {
        const key = await this.getRoomKey({ roomId: message.room, userId });

        const decrypted = await decryptMessagePayload(
            message,
            key || undefined,
        );

        if (decrypted) {
            return {
                content: decrypted,
                isDecrypted: !!key, // Считаем расшифрованным, если был ключ
            };
        }

        return {
            content: "chat.encryptedMessage",
            isDecrypted: false,
        };
    }

    /**
     * Устанавливает ключ для комнаты (например, при открытии чата).
     */
    setRoomKey({ roomId, key }: { roomId: string; key: CryptoKey }) {
        this.keyCache.set(roomId, key);
    }

    /**
     * Очищает кэш ключей (при logout).
     */
    clearCache() {
        this.keyCache.clear();
        this.identityKey = null;
    }

    /**
     * Получает приватный ключ пользователя (Identity).
     */
    private async getIdentityPrivateKey(): Promise<CryptoKey | null> {
        if (this.identityKey) {
            return this.identityKey;
        }
        const identity = await getKeyPair(KEYSTORE_TYPES.IDENTITY);
        if (identity) {
            this.identityKey = identity.privateKey;
            return this.identityKey;
        }
        return null;
    }

    /**
     * Вспомогательный метод для генерации ключа в DEV-режиме, если основного нет.
     */
    private async tryDevFallback({
        roomId,
    }: {
        roomId: string;
    }): Promise<CryptoKey | null> {
        if (!import.meta.env.DEV) {
            return null;
        }

        try {
            const key = await generateDeterministicRoomKey(roomId);
            this.keyCache.set(roomId, key);
            return key;
        } catch (err) {
            logger.warn("ChatCryptoService: DEV-FALLBACK failed", err);
            return null;
        }
    }
}

export const chatCryptoService = new ChatCryptoService();
