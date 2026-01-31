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
import type { RoomKey, RoomMember } from '@/lib/types/room';

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
        avatarUrl: string | null = null,
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
            // В режиме Mock пропускаем проверку ключей и реальное шифрование,
            // чтобы можно было создавать чаты с моковыми пользователями без ключей.
            if (import.meta.env.VITE_USE_MOCK === 'true') {
                roomMembers.push({
                    room_id: roomId,
                    user_id: profile.id,
                    role: profile.id === myUserId ? 'admin' : 'member',
                });
                encryptedKeys.push({
                    room_id: roomId,
                    user_id: profile.id,
                    encrypted_key: JSON.stringify({
                        iv: 'mock',
                        ciphertext: 'mock',
                        ephemeralPublicKey: 'mock',
                    }),
                });
                continue;
            }

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
                avatar_url: avatarUrl,
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
        let ciphertext: string = content;
        let iv: string = 'mock-iv';

        if (import.meta.env.VITE_USE_MOCK !== 'true') {
            const encrypted = await encryptMessage(content, roomKey);
            ciphertext = encrypted.ciphertext;
            iv = encrypted.iv;
        }

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
        // 1. Delete Keys (Best effort)
        await supabase.from(DB_TABLES.ROOM_KEYS).delete().eq('room_id', roomId);

        // 2. Delete All Members (Best effort)
        await supabase
            .from(DB_TABLES.ROOM_MEMBERS)
            .delete()
            .eq('room_id', roomId);

        // 3. Delete Room (Best effort)
        const { error } = await supabase
            .from(DB_TABLES.ROOMS)
            .delete()
            .eq('id', roomId);

        if (error) {
            // Log but don't blocking throw if it's just a permission issue on "ROOMS" table
            // providing we deleted the membership.
            logger.warn(
                'Could not delete room record (possbily restricted)',
                error,
            );
        }
    },

    /**
     * Находит существующую DM-комнату между двумя пользователями или создаёт новую.
     *
     * Паттерн "find or create" — стандарт для мессенджеров:
     * 1. Сначала ищем существующую комнату типа 'direct' с обоими участниками
     * 2. Если найдена — возвращаем её roomId
     * 3. Если не найдена — создаём новую комнату
     *
     * @param currentUserId - ID текущего пользователя
     * @param targetUserId - ID пользователя, с которым начинаем чат
     * @param isEphemeral - Является ли чат секретным (удаляется после закрытия)
     * @returns roomId существующей или созданной комнаты
     */
    async findOrCreateDM(
        currentUserId: string,
        targetUserId: string,
        isEphemeral = false,
    ): Promise<string> {
        // 1. Ищем существующую DM-комнату
        // Для обычных чатов ищем существующий. Для секретных (ephemeral) всегда создаём новый
        // или ищем существующий секретный (обычно мессенджеры создают новый секретный чат)
        // 1. Получаем ID всех комнат пользователя
        const { data: myMemberships } = await supabase
            .from(DB_TABLES.ROOM_MEMBERS)
            .select('room_id')
            .eq('user_id', currentUserId);

        logger.info('findOrCreateDM: myMemberships', {
            count: myMemberships?.length,
        });

        if (myMemberships && myMemberships.length > 0) {
            const myRoomIds = myMemberships.map((m) => m.room_id);

            // 2. Ищем среди них прямые чаты (direct) с нужным флагом isEphemeral
            const { data: candidateRooms } = await supabase
                .from(DB_TABLES.ROOMS)
                .select('id')
                .in('id', myRoomIds)
                .eq('type', 'direct')
                .eq('is_ephemeral', isEphemeral);

            logger.info('findOrCreateDM: candidateRooms', {
                count: candidateRooms?.length,
            });

            if (candidateRooms) {
                for (const room of candidateRooms) {
                    // 3. Проверяем, есть ли в комнате целевой пользователь
                    const { data: members, error: membersError } =
                        await supabase
                            .from(DB_TABLES.ROOM_MEMBERS)
                            .select('user_id')
                            .eq('room_id', room.id);

                    if (!membersError) {
                        const memberIds = members.map((m) => m.user_id);
                        const isSelfChat = currentUserId === targetUserId;

                        // Case 1: Self Chat (1 member)
                        if (
                            isSelfChat &&
                            memberIds.length === 1 &&
                            memberIds[0] === currentUserId
                        ) {
                            logger.info('Found existing Self-Chat room', {
                                roomId: room.id,
                            });
                            return room.id;
                        }

                        // Case 2: P2P Chat (2 members)
                        if (
                            !isSelfChat &&
                            memberIds.length === 2 &&
                            memberIds.includes(targetUserId)
                        ) {
                            logger.info('Found existing DM room', {
                                roomId: room.id,
                            });
                            return room.id;
                        }
                    }
                }
            }
        }

        // 4. Не нашли — создаём новую комнату
        logger.info('Creating new DM room', {
            currentUserId,
            targetUserId,
            isEphemeral,
        });
        const { roomId } = await this.createRoom(
            null, // DM не имеют названия
            'direct',
            currentUserId,
            [targetUserId],
            isEphemeral,
        );

        return roomId;
    },
};
