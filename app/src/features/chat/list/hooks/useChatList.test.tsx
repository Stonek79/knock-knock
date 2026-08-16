import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEYS } from "@/lib/constants";
import { sessionCleanup } from "@/lib/services/session-cleanup";
import { useChatList } from "./useChatList";

/**
 * Тесты cache-first загрузки списка чатов после reload.
 * Не подключаются к PocketBase / IndexedDB (все seam'ы замоканы).
 * Продуктовый контракт:
 *  - cache hit: список показывается из кеша ДО завершения фоновой синхронизации;
 *  - N+1-запросы последних сообщений не входят в критический путь (первый показ
 *    не ждёт серверного `getUserRoomsWithLastMessages`);
 *  - кеш пополняется только raw-данными (ciphertext), без расшифрованного plaintext;
 *  - cache miss / повреждённый кеш -> загрузка с сервера;
 *  - изоляция по userId: смена аккаунта читает кеш другого пользователя.
 */

type AuthState = { pbUser: { id: string } | null };

const mocks = vi.hoisted(() => ({
    auth: { pbUser: { id: "user-a" } } as AuthState,
    load: vi.fn(),
    save: vi.fn(),
    getUserRoomsWithLastMessages: vi.fn(),
    decryptPreview: vi.fn(),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: {} }),
}));

vi.mock("@/stores/auth", () => ({
    useAuthStore: (selector: (s: AuthState) => unknown) => selector(mocks.auth),
}));

vi.mock("@/lib/services/room-list-db", () => ({
    roomListDb: {
        load: (...args: unknown[]) => mocks.load(...args),
        save: (...args: unknown[]) => mocks.save(...args),
        clear: vi.fn(),
    },
}));

vi.mock("@/lib/services/chat-crypto", () => ({
    chatCryptoService: {
        decryptPreview: (...args: unknown[]) => mocks.decryptPreview(...args),
    },
}));

vi.mock("@/lib/services/room/queries", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/lib/services/room/queries")>();
    return {
        ...actual,
        getUserRoomsWithLastMessages: (...args: unknown[]) =>
            mocks.getUserRoomsWithLastMessages(...args),
    };
});

import type { RoomRepoError, RoomWithMembers } from "@/lib/types";
import { appError, err, ok, type Result } from "@/lib/utils/result";

const createWrapper = (
    qc: QueryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    }),
) => {
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
};

function makeRoom(id: string, content: string): RoomWithMembers {
    return {
        id,
        name: null,
        type: "direct",
        visibility: "private",
        avatar_url: null,
        created_by: "creator",
        created_at: "2026-01-01T00:00:00.000Z",
        updated: "2026-01-01T00:00:00.000Z",
        room_members: [],
        metadata: {},
        permissions: {},
        last_message: {
            id: `msg-${id}`,
            content,
            created: "2026-01-01T00:00:00.000Z",
            is_deleted: false,
            iv: "iv-placeholder",
        },
    };
}

function deferred<T>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const decrypt = async ({
    message,
}: {
    message: { content: string };
}): Promise<{ content: string; isDecrypted: boolean }> => ({
    content: `${message.content}_DEC`,
    isDecrypted: true,
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.pbUser = { id: "user-a" };
    mocks.decryptPreview.mockImplementation(decrypt);
    // Сейв выполняется fire-and-forget: mock должен возвращать thenable, чтобы
    // `saveRawCache` корректно обрабатывал `save().catch(...)`.
    mocks.save.mockResolvedValue(undefined);
});

describe("useChatList — cache-first загрузка", () => {
    it("cache hit: список показывается из кеша ДО завершения фоновой синхронизации", async () => {
        mocks.load.mockResolvedValue([makeRoom("r1", "CACHED_CT")]);
        const bg = deferred<Result<RoomWithMembers[], RoomRepoError>>();
        mocks.getUserRoomsWithLastMessages.mockReturnValue(bg.promise);

        const { result } = renderHook(() => useChatList(), {
            wrapper: createWrapper(),
        });

        // Первый показ не ждёт серверной синхронизации (N+1 вне критического пути)
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("CACHED_CT_DEC");
        });

        // Сервис уже вызван (bg запущен), но его promise ещё не разрешён,
        // значит критический путь не дожидался N+1-запроса последних сообщений.
        expect(mocks.getUserRoomsWithLastMessages).toHaveBeenCalledWith(
            "user-a",
        );

        // Завершаем фоновую синхронизацию новыми server-данными
        bg.resolve(ok([makeRoom("r1", "SERVER_CT")]));
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("SERVER_CT_DEC");
        });
    });

    it("save (fire-and-forget) не блокирует первый показ свежих данных с сервера", async () => {
        // Cache miss: свежие данные приходят с сервера; save «застрял» (pending).
        // Отображение НЕ должно ожидать завершения записи в IndexedDB.
        mocks.load.mockResolvedValue(null);
        mocks.getUserRoomsWithLastMessages.mockResolvedValue(
            ok([makeRoom("r1", "SERVER_CT")]),
        );
        const slowSave = deferred<void>();
        mocks.save.mockReturnValue(slowSave.promise);

        const { result } = renderHook(() => useChatList(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("SERVER_CT_DEC");
        });
        // save начат, но ещё не завершён — показ от него не завис.
        expect(mocks.save).toHaveBeenCalled();
        expect(result.current.data?.[0]?.lastMessage).toBe("SERVER_CT_DEC");
    });

    it("кеш пополняется только raw (ciphertext) данными, без plaintext", async () => {
        mocks.load.mockResolvedValue(null);
        mocks.getUserRoomsWithLastMessages.mockResolvedValue(
            ok([makeRoom("r1", "SERVER_CT")]),
        );

        renderHook(() => useChatList(), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(mocks.save).toHaveBeenCalled();
        });

        const savedRooms: RoomWithMembers[] = mocks.save.mock.calls[0][1];
        expect(savedRooms[0]?.last_message?.content).toBe("SERVER_CT");
    });

    it("cache miss: список загружается с сервера и сохраняется в кеш", async () => {
        mocks.load.mockResolvedValue(null);
        mocks.getUserRoomsWithLastMessages.mockResolvedValue(
            ok([makeRoom("r1", "SERVER_CT")]),
        );

        const { result } = renderHook(() => useChatList(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("SERVER_CT_DEC");
        });
        expect(mocks.save).toHaveBeenCalledWith("user-a", [
            makeRoom("r1", "SERVER_CT"),
        ]);
    });

    it("повреждённый/недоступный кеш: фолбэк на сервер", async () => {
        mocks.load.mockRejectedValue(new Error("IndexedDB broken"));
        mocks.getUserRoomsWithLastMessages.mockResolvedValue(
            ok([makeRoom("r1", "SERVER_CT")]),
        );

        const { result } = renderHook(() => useChatList(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("SERVER_CT_DEC");
        });
        expect(result.current.error).toBeNull();
    });

    it("изоляция по userId: смена аккаунта читает кеш другого пользователя", async () => {
        const userBCache = [makeRoom("b1", "USER_B_CT")];
        mocks.load.mockImplementation(async (userId: string) =>
            userId === "user-b" ? userBCache : null,
        );
        mocks.getUserRoomsWithLastMessages.mockImplementation(
            async (userId: string) => ok(userId === "user-b" ? userBCache : []),
        );

        const { result, rerender } = renderHook(() => useChatList(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.data).toBeDefined());

        mocks.auth.pbUser = { id: "user-b" };
        rerender();

        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("USER_B_CT_DEC");
        });
        expect(mocks.load).toHaveBeenCalledWith("user-b");
    });

    it("фоновая синхронизация не перезаписывает более свежие realtime-данные", async () => {
        mocks.load.mockResolvedValue([makeRoom("r1", "CACHED_CT")]);
        const bg = deferred<Result<RoomWithMembers[], RoomRepoError>>();
        mocks.getUserRoomsWithLastMessages.mockReturnValue(bg.promise);

        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const { result } = renderHook(() => useChatList(), {
            wrapper: createWrapper(qc),
        });

        // Первый показ из кеша
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("CACHED_CT_DEC");
        });

        // Realtime заменил кеш-снимок (уже расшифрованный превью), пока
        // фоновая синхронизация в полёте
        qc.setQueryData<RoomWithMembers[]>(
            QUERY_KEYS.rooms("user-a"),
            (old = []) =>
                old.map((room) =>
                    room.id === "r1" && room.last_message
                        ? {
                              ...room,
                              last_message: {
                                  ...room.last_message,
                                  content: "REALTIME_CT_DEC",
                              },
                          }
                        : room,
                ),
        );
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe(
                "REALTIME_CT_DEC",
            );
        });

        // Фоновая синхронизация завершается более старым серверным снимком
        bg.resolve(ok([makeRoom("r1", "STALE_SERVER_CT")]));

        // Более свежие realtime-данные не затёрты устаревшим ответом
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe(
                "REALTIME_CT_DEC",
            );
        });
        expect(result.current.data?.[0]?.lastMessage).not.toBe(
            "STALE_SERVER_CT_DEC",
        );
        // Устаревший серверный ответ НЕ перезаписывает IndexedDB-кеш.
        expect(mocks.save).not.toHaveBeenCalled();
    });

    it("deferred-ответ после logout не пишет данные в кеш/QueryClient", async () => {
        mocks.load.mockResolvedValue([makeRoom("r1", "CACHED_CT")]);
        const bg = deferred<Result<RoomWithMembers[], RoomRepoError>>();
        mocks.getUserRoomsWithLastMessages.mockReturnValue(bg.promise);

        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const { result, rerender } = renderHook(() => useChatList(), {
            wrapper: createWrapper(qc),
        });

        // Первый показ из кеша (фоновая синхронизация в полёте)
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("CACHED_CT_DEC");
        });

        // Logout через тот же seam, что вызывает useAuthStore.signOut: session
        // guard инвалидируется и чувствительные query-данные удаляются из
        // QueryClient. Полный signOut (AuthService.logout, destroy realtime,
        // roomListDb.clear) покрыт в auth.test.ts; здесь store замокан целиком
        // (тесты управляют pbUser через mocks.auth), поэтому сетевых вызовов не
        // происходит.
        sessionCleanup.registerQueryClient(qc);
        mocks.auth.pbUser = null;
        await sessionCleanup.clearSensitiveQueryData();
        rerender();

        // Старый серверный ответ завершается уже ПОСЛЕ logout.
        bg.resolve(ok([makeRoom("r1", "STALE_AFTER_LOGOUT")]));
        // Даём отложенным микротаскам отработать.
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Не пишем в IndexedDB-кеш и не затираем query-данные старым снимком:
        // чувствительные rooms-данные вовсе удалены из QueryClient (более строгий
        // контракт, чем «не содержит устаревший контент»).
        expect(mocks.save).not.toHaveBeenCalled();

        const queryData = qc.getQueryData<RoomWithMembers[]>(
            QUERY_KEYS.rooms("user-a"),
        );
        expect(queryData).toBeUndefined();
    });

    it("ошибка batch-загрузки не затирает показанные данные и не пишет снимок в кеш", async () => {
        mocks.load.mockResolvedValue([makeRoom("r1", "CACHED_CT")]);
        mocks.getUserRoomsWithLastMessages.mockResolvedValue(
            err(appError("network-error", "batch failed")),
        );

        const { result } = renderHook(() => useChatList(), {
            wrapper: createWrapper(),
        });

        // Показанные из кеша данные остаются
        await waitFor(() => {
            expect(result.current.data?.[0]?.lastMessage).toBe("CACHED_CT_DEC");
        });

        // Фоновая синхронизация завершилась ошибкой: показанные данные не
        // затёрты, ошибка не «выпадает» пользователю и неполный снимок не
        // записан в IndexedDB.
        expect(result.current.error).toBeNull();
        expect(result.current.data?.[0]?.lastMessage).toBe("CACHED_CT_DEC");
        expect(mocks.save).not.toHaveBeenCalled();
    });
});
