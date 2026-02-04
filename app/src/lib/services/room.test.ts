import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODES } from '@/lib/constants/errors';
import { supabase } from '@/lib/supabase';
import { RoomService } from './room';

// Моки
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('@/lib/crypto', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        // @ts-expect-error spread
        ...actual,
        generateRoomKey: vi.fn().mockResolvedValue('mock-room-key'),
        generateRoomId: vi.fn().mockReturnValue('new-room-id'),
        wrapRoomKey: vi.fn().mockResolvedValue({
            ephemeralPublicKey: new ArrayBuffer(0),
            iv: new ArrayBuffer(0),
            ciphertext: new ArrayBuffer(0),
        }),
    };
});

describe('RoomService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Принудительно отключаем mock-режим для честного unit-тестирования логики
        vi.stubEnv('VITE_USE_MOCK', 'false');
    });

    describe('createRoom', () => {
        it('должен вернуть DB_ERROR при ошибке получения профилей', async () => {
            // Мок ответа supabase (ошибка select)
            const mockSelect = vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'DB Error' },
                }),
            });
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any).mockReturnValue({ select: mockSelect });

            const result = await RoomService.createRoom(
                'Test Room',
                'group',
                'my-id',
                ['peer-id'],
            );

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.DB_ERROR);
            }
        });

        it('должен вернуть MISSING_KEYS если у пользователя нет ключей', async () => {
            // Мок ответа supabase (один юзер найден, второй нет)
            const mockSelect = vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                    data: [{ id: 'my-id', public_key_x25519: 'key' }], // peer-id отсутствует
                    error: null,
                }),
            });
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any).mockReturnValue({ select: mockSelect });

            const result = await RoomService.createRoom(
                'Test Room',
                'group',
                'my-id',
                ['peer-id'],
            );

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.kind).toBe(ERROR_CODES.MISSING_KEYS);
                expect(result.error.details).toEqual({ userIds: ['peer-id'] });
            }
        });
    });

    describe('findOrCreateDM', () => {
        it('должен вернуть ID существующей комнаты, если она найдена', async () => {
            // 1. Мок членства в комнатах
            const mockMemberships = {
                data: [{ room_id: 'existing-room' }],
                error: null,
            };
            // 2. Мок деталей комнаты
            const mockRooms = {
                data: [{ id: 'existing-room' }],
                error: null,
            };
            // 3. Мок участников комнаты (совпадение с целевым юзером)
            const mockMembers = {
                data: [{ user_id: 'my-id' }, { user_id: 'target-id' }],
                error: null,
            };

            // Цепочка моков для supabase.from().select()...
            const fromMock = vi.fn((table) => {
                if (table === 'room_members') {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn((field, val) => {
                                if (field === 'user_id' && val === 'my-id')
                                    return Promise.resolve(mockMemberships);
                                if (
                                    field === 'room_id' &&
                                    val === 'existing-room'
                                )
                                    return Promise.resolve(mockMembers);
                                return Promise.resolve({
                                    data: [],
                                    error: null,
                                });
                            }),
                        })),
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                if (table === 'rooms') {
                    return {
                        select: vi.fn(() => ({
                            in: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn().mockResolvedValue(mockRooms),
                                })),
                            })),
                        })),
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                if (table === 'room_keys') {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn() };
            });
            // biome-ignore lint/suspicious/noExplicitAny: mock
            (supabase.from as any) = fromMock;

            const result = await RoomService.findOrCreateDM(
                'my-id',
                'target-id',
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBe('existing-room');
            }
        });
    });
});
