import { DB_TABLES } from '@/lib/constants';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    encryptMessage,
    generateRoomId,
    generateRoomKey,
    wrapRoomKey,
} from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { RoomKey, RoomMember } from '@/lib/types/chat';

/**
 * Сервис для управления чатами и сообщениями.
 */
export const ChatService = {
    /**
     * Создает новую комнату.
     * 1. Генерирует AES ключ.
     * 2. Шифрует его для каждого участника.
     * 3. Создает записи в БД (Room, Members, Keys).
     */
    async createRoom(
        name: string | null,
        type: 'direct' | 'group',
        myUserId: string,
        peerIds: string[], // ID других участников
        isEphemeral = false,
    ) {
        const allMemberIds = [...new Set([myUserId, ...peerIds])];
        const roomKey = await generateRoomKey();
        const roomId = generateRoomId();

        // 1. Получаем публичные ключи участников (ECDH P-256)
        const { data: profiles, error: profilesError } = await supabase
            .from(DB_TABLES.PROFILES)
            .select('id, public_key_x25519')
            .in('id', allMemberIds);

        if (profilesError) throw profilesError;
        if (!profiles || profiles.length !== allMemberIds.length) {
            throw new Error('Не удалось найти ключи всех участников');
        }

        // 2. Шифруем RoomKey для каждого
        const encryptedKeys: Omit<RoomKey, 'created_at'>[] = [];
        const roomMembers: Omit<RoomMember, 'joined_at'>[] = [];

        for (const profile of profiles) {
            if (!profile.public_key_x25519) {
                logger.warn(`User ${profile.id} has no keys`);
                continue;
            }

            // Импорт публичного ключа получателя
            const recipientPubKey = await window.crypto.subtle.importKey(
                'raw',
                base64ToArrayBuffer(profile.public_key_x25519),
                {
                    name: 'ECDH',
                    namedCurve: 'P-256',
                },
                true,
                [],
            );

            // Заворачиваем ключ
            const wrapped = await wrapRoomKey(roomKey, recipientPubKey);

            // Сериализуем обертку (ephemeral + iv + ciphertext)
            // Простой JSON стрингификация для хранения в TEXT колонке
            const serializedKey = JSON.stringify({
                ephemeralPublicKey: arrayBufferToBase64(
                    wrapped.ephemeralPublicKey,
                ),
                iv: arrayBufferToBase64(wrapped.iv),
                ciphertext: arrayBufferToBase64(wrapped.ciphertext),
            });

            encryptedKeys.push({
                room_id: roomId,
                user_id: profile.id,
                encrypted_key: serializedKey,
            });

            roomMembers.push({
                room_id: roomId,
                user_id: profile.id,
                role: profile.id === myUserId ? 'admin' : 'member',
            });
        }

        // 3. Транзакция (Supabase не поддерживает мульти-табличные транзакции через JS SDK напрямую без RPC,
        // но мы можем сделать последовательно, если нет RPC.
        // Лучше использовать RPC `create_room_with_members` если возможно, но пока JS:

        // A. Create Room
        const { error: roomError } = await supabase
            .from(DB_TABLES.ROOMS)
            .insert({
                id: roomId,
                type,
                name,
                is_ephemeral: isEphemeral,
            });
        if (roomError) throw roomError;

        // B. Add Members
        const { error: membersError } = await supabase
            .from(DB_TABLES.ROOM_MEMBERS)
            .insert(roomMembers);
        if (membersError) {
            // Rollback logic would go here ideally
            throw membersError;
        }

        // C. Add Keys
        const { error: keysError } = await supabase
            .from(DB_TABLES.ROOM_KEYS)
            .insert(encryptedKeys);
        if (keysError) throw keysError;

        return { roomId, roomKey };
    },

    /**
     * Отправляет сообщение.
     */
    async sendMessage(
        roomId: string,
        senderId: string,
        content: string,
        roomKey: CryptoKey,
    ) {
        const { ciphertext, iv } = await encryptMessage(content, roomKey);

        const { error } = await supabase.from(DB_TABLES.MESSAGES).insert({
            room_id: roomId,
            sender_id: senderId,
            content: ciphertext,
            iv: iv,
        });

        if (error) throw error;
    },

    /**
     * Удаляет все сообщения в комнате.
     */
    async clearRoom(roomId: string) {
        const { error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .delete()
            .eq('room_id', roomId);
        if (error) throw error;
    },

    /**
     * Полностью удаляет комнату и все связанные данные (сообщения, участников, ключи).
     */
    async deleteRoom(roomId: string) {
        const { error } = await supabase
            .from(DB_TABLES.ROOMS)
            .delete()
            .eq('id', roomId);
        if (error) throw error;
    },
};
